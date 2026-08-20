import {
  IDLE_POINTER,
  PointerSignal,
  type PointerModality,
  type PointerSample,
  type PointerSignalState,
} from './PointerSignal';
import { KeyboardSignal, type KeyboardSample } from './KeyboardSignal';
import {
  DEFAULT_VIEWPORT,
  ViewportSignal,
  type ViewportSignalState,
} from './ViewportSignal';

export interface InputSnapshot {
  readonly pointer: PointerSignalState;
  readonly viewport: ViewportSignalState;
  readonly modality: PointerModality;
  readonly focusVisible: boolean;
  readonly inactiveMs: number;
  // Plan compat: normalized clip-space coordinates for WebGL layer
  readonly x: number;
  readonly y: number;
  readonly isPressed: boolean;
}

export const IDLE_INPUT: InputSnapshot = Object.freeze({
  pointer: IDLE_POINTER,
  viewport: DEFAULT_VIEWPORT,
  modality: 'none',
  focusVisible: false,
  inactiveMs: 0,
  x: 0,
  y: 0,
  isPressed: false,
});

/**
 * Every browser dependency the input layer needs, declared as an interface so
 * the manager is fully testable in Node and no listener is attached at import.
 */
export interface InputEnvironment {
  now(): number;
  requestFrame(callback: (time: number) => void): number;
  cancelFrame(handle: number): void;
  measureViewport(): { readonly width: number; readonly height: number; readonly dpr: number };
  onPointer(listener: (sample: PointerSample) => void): () => void;
  onKeyboard(listener: (sample: KeyboardSample) => void): () => void;
  onViewportChange(listener: () => void): () => void;
}

export type InputSubscriber = (snapshot: InputSnapshot) => void;

/**
 * One passive, frame-coalesced signal layer for pointer, touch, keyboard and
 * viewport input. High-frequency movement is buffered and published at most
 * once per animation frame; nothing here writes to framework state.
 */
export class InputManager {
  private readonly pointer = new PointerSignal();
  private readonly keyboard = new KeyboardSignal();
  private readonly viewport = new ViewportSignal();
  private readonly subscribers = new Set<InputSubscriber>();
  private readonly releases: Array<() => void> = [];
  private snapshot: InputSnapshot = IDLE_INPUT;
  private frameHandle: number | null = null;
  private started = false;
  private destroyed = false;
  // Plan compat: legacy viewport size + clip-space state
  private isLegacy = false;
  private legacyWidth = 1;
  private legacyHeight = 1;
  private legacySnapshot: InputSnapshot = IDLE_INPUT;
  private environment: InputEnvironment;

  constructor(environmentOrWidth: InputEnvironment | number, height?: number) {
    if (typeof environmentOrWidth === 'number' && typeof height === 'number') {
      this.isLegacy = true;
      this.legacyWidth = environmentOrWidth;
      this.legacyHeight = height;
      this.legacySnapshot = { ...IDLE_INPUT };
      // Dummy environment for legacy — never used for listeners
      this.environment = {
        now: () => performance.now(),
        requestFrame: (cb) => 0 as unknown as number,
        cancelFrame: () => {},
        measureViewport: () => ({ width: this.legacyWidth, height: this.legacyHeight, dpr: 1 }),
        onPointer: () => () => {},
        onKeyboard: () => () => {},
        onViewportChange: () => () => {},
      };
      this.snapshot = this.legacySnapshot;
    } else {
      this.environment = environmentOrWidth as InputEnvironment;
    }
  }

  // Plan compat: viewport resize
  public updateViewport(width: number, height: number): void {
    if (this.isLegacy) {
      this.legacyWidth = width;
      this.legacyHeight = height;
      return;
    }
    this.viewport.set(width, height, 1);
  }

  // Plan compat: normalize pointer to clip space
  public handlePointerEvent(e: { clientX: number; clientY: number; type?: string }): void {
    if (!this.isLegacy) {
      // For advanced mode, also support direct call by forwarding to pointer signal via legacy normalization
      const x = (e.clientX / this.viewport.read().width) * 2 - 1 || (e.clientX / 1) * 2 - 1;
      const y = -(e.clientY / this.viewport.read().height) * 2 + 1 || -(e.clientY / 1) * 2 + 1;
      // Update legacy-like snapshot for compat while preserving advanced snapshot
      this.snapshot = Object.freeze({
        ...this.snapshot,
        x,
        y,
        isPressed: e.type === 'pointerdown' ? true : e.type === 'pointerup' ? false : this.snapshot.isPressed,
      });
      return;
    }
    const x = (e.clientX / this.legacyWidth) * 2 - 1;
    const y = -(e.clientY / this.legacyHeight) * 2 + 1;
    const isPressed = e.type === 'pointerdown' ? true : e.type === 'pointerup' ? false : this.legacySnapshot.isPressed;
    this.legacySnapshot = Object.freeze({
      ...this.legacySnapshot,
      x,
      y,
      isPressed,
      pointer: { ...this.legacySnapshot.pointer, x, y } as PointerSignalState,
    });
    this.snapshot = this.legacySnapshot;
  }

  start(): void {
    if (this.isLegacy) return;
    if (this.started || this.destroyed) return;
    this.started = true;

    this.syncViewport();
    this.releases.push(
      this.environment.onPointer((sample) => {
        this.pointer.sample(sample);
        this.keyboard.clearFocusVisible();
        this.scheduleFlush();
      }),
    );
    this.releases.push(
      this.environment.onKeyboard((sample) => {
        if (this.keyboard.sample(sample)) {
          this.pointer.markKeyboard(sample.time);
        }
        this.scheduleFlush();
      }),
    );
    this.releases.push(
      this.environment.onViewportChange(() => {
        if (this.syncViewport()) this.scheduleFlush();
      }),
    );
  }

  subscribe(subscriber: InputSubscriber): () => void {
    if (this.destroyed) return () => undefined;
    this.subscribers.add(subscriber);
    let active = true;
    return () => {
      if (!active) return;
      active = false;
      this.subscribers.delete(subscriber);
    };
  }

  getSnapshot(): InputSnapshot {
    return this.snapshot;
  }

  /**
   * Advances decay and republishes. The render loop calls this each frame so
   * an idle pointer settles to rest instead of holding stale velocity.
   */
  tick(time = this.environment.now()): InputSnapshot {
    if (this.destroyed) return this.snapshot;
    this.pointer.decay(time);
    return this.publish(time);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.started = false;
    if (this.frameHandle !== null) {
      this.environment.cancelFrame(this.frameHandle);
      this.frameHandle = null;
    }
    for (const release of this.releases.splice(0).reverse()) {
      try {
        release();
      } catch {
        // Remaining listeners must still be detached.
      }
    }
    this.subscribers.clear();
    this.pointer.reset();
    this.keyboard.reset();
    this.viewport.reset();
    this.snapshot = IDLE_INPUT;
  }

  private syncViewport(): boolean {
    const measured = this.environment.measureViewport();
    const changed = this.viewport.set(measured.width, measured.height, measured.dpr);
    const state = this.viewport.read();
    this.pointer.setViewport(state.width, state.height);
    return changed;
  }

  private scheduleFlush(): void {
    if (this.destroyed || this.frameHandle !== null) return;
    this.frameHandle = this.environment.requestFrame((time) => {
      this.frameHandle = null;
      this.publish(time);
    });
  }

  private publish(time: number): InputSnapshot {
    const pointer = this.pointer.read(time);
    const keyboard = this.keyboard.read();
    this.snapshot = Object.freeze({
      pointer,
      viewport: this.viewport.read(),
      modality: pointer.modality,
      focusVisible: keyboard.focusVisible,
      inactiveMs: pointer.inactiveMs,
      x: pointer.x,
      y: pointer.y,
      isPressed: pointer.pressed,
    });
    for (const subscriber of [...this.subscribers]) {
      try {
        subscriber(this.snapshot);
      } catch {
        this.subscribers.delete(subscriber);
      }
    }
    return this.snapshot;
  }
}

/** Passive-listener browser implementation. Never constructed during SSR. */
export function createBrowserInputEnvironment(): InputEnvironment {
  return {
    now: () => performance.now(),
    requestFrame: (callback) => window.requestAnimationFrame(callback),
    cancelFrame: (handle) => window.cancelAnimationFrame(handle),
    measureViewport: () => ({
      width: window.innerWidth,
      height: window.innerHeight,
      dpr: window.devicePixelRatio,
    }),
    onPointer: (listener) => {
      const handle = (event: PointerEvent) => {
        listener({
          clientX: event.clientX,
          clientY: event.clientY,
          pointerType: event.pointerType,
          pressed: event.pressure > 0 || event.buttons > 0,
          time: event.timeStamp,
        });
      };
      const options = { passive: true } as const;
      window.addEventListener('pointermove', handle, options);
      window.addEventListener('pointerdown', handle, options);
      window.addEventListener('pointerup', handle, options);
      window.addEventListener('pointercancel', handle, options);
      return () => {
        window.removeEventListener('pointermove', handle);
        window.removeEventListener('pointerdown', handle);
        window.removeEventListener('pointerup', handle);
        window.removeEventListener('pointercancel', handle);
      };
    },
    onKeyboard: (listener) => {
      const handle = (event: KeyboardEvent) => {
        listener({ key: event.key, time: event.timeStamp });
      };
      window.addEventListener('keydown', handle, { passive: true });
      return () => window.removeEventListener('keydown', handle);
    },
    onViewportChange: (listener) => {
      window.addEventListener('resize', listener, { passive: true });
      window.addEventListener('orientationchange', listener, { passive: true });
      return () => {
        window.removeEventListener('resize', listener);
        window.removeEventListener('orientationchange', listener);
      };
    },
  };
}
