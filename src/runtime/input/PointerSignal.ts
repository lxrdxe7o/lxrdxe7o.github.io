export type PointerModality = 'mouse' | 'touch' | 'pen' | 'keyboard' | 'none';

export interface PointerSample {
  readonly clientX: number;
  readonly clientY: number;
  readonly pointerType: string;
  readonly pressed: boolean;
  readonly time: number;
}

export interface PointerSignalState {
  /** Normalized to -1..1 with the origin at the viewport centre. */
  readonly x: number;
  readonly y: number;
  readonly deltaX: number;
  readonly deltaY: number;
  readonly velocity: number;
  readonly modality: PointerModality;
  readonly pressed: boolean;
  readonly inactiveMs: number;
}

export const IDLE_POINTER: PointerSignalState = Object.freeze({
  x: 0,
  y: 0,
  deltaX: 0,
  deltaY: 0,
  velocity: 0,
  modality: 'none',
  pressed: false,
  inactiveMs: 0,
});

function normalizeModality(pointerType: string): PointerModality {
  if (pointerType === 'touch') return 'touch';
  if (pointerType === 'pen') return 'pen';
  if (pointerType === 'mouse') return 'mouse';
  return 'none';
}

function clampUnit(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(-1, Math.min(1, value));
}

/**
 * Normalizes raw pointer samples into a bounded, frame-coalesced signal.
 * Movement never reaches framework state: consumers read the latest value
 * once per animation frame.
 */
export class PointerSignal {
  private x = 0;
  private y = 0;
  private deltaX = 0;
  private deltaY = 0;
  private velocity = 0;
  private modality: PointerModality = 'none';
  private pressed = false;
  private lastSampleTime: number | null = null;
  private lastActivityTime: number | null = null;
  private dirty = false;

  constructor(
    private width: number = 1,
    private height: number = 1,
  ) {}

  setViewport(width: number, height: number): void {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
  }

  sample(sample: PointerSample): void {
    const nextX = clampUnit((sample.clientX / this.width) * 2 - 1);
    const nextY = clampUnit((sample.clientY / this.height) * 2 - 1);

    this.deltaX = nextX - this.x;
    this.deltaY = nextY - this.y;
    this.x = nextX;
    this.y = nextY;
    this.pressed = sample.pressed;
    this.modality = normalizeModality(sample.pointerType);

    const elapsedMs =
      this.lastSampleTime === null ? 0 : Math.max(0, sample.time - this.lastSampleTime);
    const distance = Math.hypot(this.deltaX, this.deltaY);
    // Units per second, so velocity is frame-rate independent.
    this.velocity = elapsedMs > 0 ? distance / (elapsedMs / 1000) : 0;
    this.lastSampleTime = sample.time;
    this.lastActivityTime = sample.time;
    this.dirty = true;
  }

  /** Marks keyboard interaction so decorative pointer depth can stand down. */
  markKeyboard(time: number): void {
    this.modality = 'keyboard';
    this.deltaX = 0;
    this.deltaY = 0;
    this.velocity = 0;
    this.pressed = false;
    this.lastActivityTime = time;
    this.dirty = true;
  }

  /**
   * Decays velocity and residual delta toward rest. Called once per frame so
   * an abandoned pointer settles instead of holding its last velocity.
   */
  decay(time: number, halfLifeMs = 90): void {
    if (this.lastSampleTime === null) return;
    const elapsedMs = Math.max(0, time - this.lastSampleTime);
    if (elapsedMs <= 0) return;

    const factor = Math.pow(0.5, elapsedMs / halfLifeMs);
    this.velocity *= factor;
    this.deltaX *= factor;
    this.deltaY *= factor;
    if (this.velocity < 0.0005) this.velocity = 0;
    if (Math.abs(this.deltaX) < 0.0005) this.deltaX = 0;
    if (Math.abs(this.deltaY) < 0.0005) this.deltaY = 0;
    this.lastSampleTime = time;
  }

  read(time: number): PointerSignalState {
    this.dirty = false;
    const inactiveMs =
      this.lastActivityTime === null ? 0 : Math.max(0, time - this.lastActivityTime);
    return Object.freeze({
      x: this.x,
      y: this.y,
      deltaX: this.deltaX,
      deltaY: this.deltaY,
      velocity: this.velocity,
      modality: this.modality,
      pressed: this.pressed,
      inactiveMs,
    });
  }

  get hasPendingSample(): boolean {
    return this.dirty;
  }

  reset(): void {
    this.x = 0;
    this.y = 0;
    this.deltaX = 0;
    this.deltaY = 0;
    this.velocity = 0;
    this.modality = 'none';
    this.pressed = false;
    this.lastSampleTime = null;
    this.lastActivityTime = null;
    this.dirty = false;
  }
}
