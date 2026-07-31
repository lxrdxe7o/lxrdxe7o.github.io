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
}

export const IDLE_INPUT: InputSnapshot = Object.freeze({
  pointer: IDLE_POINTER,
  viewport: DEFAULT_VIEWPORT,
  modality: 'none',
  focusVisible: false,
  inactiveMs: 0,
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

  constructor(private readonly environment: InputEnvironment) {}

  start(): void {
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
