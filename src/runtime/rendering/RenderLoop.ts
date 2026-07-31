import type { Frame, FrameScheduler } from './types';

export interface RenderLoopOptions {
  readonly scheduler: FrameScheduler;
  readonly update: (frame: Frame) => void;
  readonly onError: (error: unknown) => void;
  readonly maximumDelta?: number;
}

export class RenderLoop {
  private readonly pauseReasons = new Set<string>();
  private frameHandle: number | null = null;
  private lastTime: number | null = null;
  private elapsed = 0;
  private frameIndex = 0;
  private started = false;
  private destroyed = false;

  constructor(private readonly options: RenderLoopOptions) {}

  start(): void {
    if (this.destroyed || this.started) return;
    this.started = true;
    this.schedule();
  }

  setPaused(reason: string, paused: boolean): void {
    if (!reason) throw new Error('RenderLoop pause reasons must not be empty.');
    if (paused) this.pauseReasons.add(reason);
    else this.pauseReasons.delete(reason);

    if (this.pauseReasons.size > 0) {
      this.cancelScheduledFrame();
      this.lastTime = null;
    } else if (this.started) {
      this.schedule();
    }
  }

  get isScheduled(): boolean {
    return this.frameHandle !== null;
  }

  get isPaused(): boolean {
    return this.pauseReasons.size > 0;
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.started = false;
    this.pauseReasons.clear();
    this.cancelScheduledFrame();
    this.lastTime = null;
  }

  private readonly tick = (time: number): void => {
    this.frameHandle = null;
    if (this.destroyed || !this.started || this.pauseReasons.size > 0) return;

    const maximumDelta = this.options.maximumDelta ?? 0.1;
    const rawDelta = this.lastTime === null ? 0 : Math.max(0, (time - this.lastTime) / 1000);
    const delta = Math.min(maximumDelta, rawDelta);
    this.lastTime = time;
    this.elapsed += delta;
    const frame: Frame = Object.freeze({
      time,
      delta,
      elapsed: this.elapsed,
      index: this.frameIndex,
    });
    this.frameIndex += 1;

    try {
      this.options.update(frame);
    } catch (error) {
      this.started = false;
      this.options.onError(error);
      return;
    }
    this.schedule();
  };

  private schedule(): void {
    if (
      this.destroyed ||
      !this.started ||
      this.pauseReasons.size > 0 ||
      this.frameHandle !== null
    ) {
      return;
    }
    this.frameHandle = this.options.scheduler.requestFrame(this.tick);
  }

  private cancelScheduledFrame(): void {
    if (this.frameHandle === null) return;
    this.options.scheduler.cancelFrame(this.frameHandle);
    this.frameHandle = null;
  }
}
