import type { FrameBudgetReport, FramePressure } from './types';

export interface FrameBudgetMonitorOptions {
  /** Rolling window length in milliseconds. */
  readonly windowSizeMs?: number;
  readonly targetFps: number;
  /** Frames needed before the window counts as full. */
  readonly minimumFrames?: number;
  /** Timestamp source; injectable so tests never touch real time. */
  readonly clock?: () => number;
}

interface FrameSample {
  readonly timestamp: number;
  readonly frameTimeMs: number;
}

const DEFAULT_WINDOW_SIZE_MS = 1_000;
const DEFAULT_MINIMUM_FRAMES = 12;
/** Ratios inside this band are neither clearly healthy nor clearly starved. */
const STABLE_RATIO = 0.4;
const PRESSURED_RATIO = 0.6;

/**
 * Consumes frame timestamps and reports whether the renderer is holding its
 * budget. Judgement is withheld (`unknown`) until enough frames exist, so a
 * single slow first frame during scene warm-up cannot trigger a downgrade.
 * `neutral` marks windows of boundary jitter that prove nothing in either
 * direction, and clears accumulated adaptation evidence.
 */
export class FrameBudgetMonitor {
  private readonly windowSizeMs: number;
  private readonly minimumFrames: number;
  private readonly clock: () => number;
  private readonly samples: FrameSample[] = [];
  private targetFps: number;
  private previousTimestamp: number | null = null;

  constructor(options: FrameBudgetMonitorOptions) {
    this.windowSizeMs = Math.max(100, options.windowSizeMs ?? DEFAULT_WINDOW_SIZE_MS);
    this.minimumFrames = Math.max(2, options.minimumFrames ?? DEFAULT_MINIMUM_FRAMES);
    this.targetFps = options.targetFps;
    this.clock = options.clock ?? (() => Date.now());
  }

  /**
   * Records one frame at an optional timestamp in milliseconds and returns a
   * report for the current window, so controllers can act on each frame
   * without an extra call.
   */
  record(timestamp?: number): FrameBudgetReport {
    const now = timestamp ?? this.clock();
    const frameTimeMs =
      this.previousTimestamp === null ? 0 : Math.max(0, now - this.previousTimestamp);
    this.previousTimestamp = now;

    if (frameTimeMs > 0) {
      this.samples.push({ timestamp: now, frameTimeMs });
      const cutoff = now - this.windowSizeMs;
      while (this.samples.length > 0 && this.samples[0].timestamp <= cutoff) {
        this.samples.shift();
      }
    }

    return this.snapshot(now);
  }

  setTargetFps(targetFps: number): void {
    this.targetFps = targetFps;
  }

  reset(timestamp?: number): void {
    this.samples.length = 0;
    this.previousTimestamp = timestamp ?? null;
  }

  snapshot(now = this.clock()): FrameBudgetReport {
    const budgetMs = this.targetFps > 0 ? 1000 / this.targetFps : Number.POSITIVE_INFINITY;
    const frames = this.samples.length;
    const frameTimes = this.samples.map((sample) => sample.frameTimeMs);
    const sorted = [...frameTimes].sort((left, right) => left - right);
    const frameTimeMs = frameTimes.at(-1) ?? 0;
    const averageFrameTimeMs =
      frames > 0 ? frameTimes.reduce((total, value) => total + value, 0) / frames : 0;
    const p95Index = Math.min(frames - 1, Math.floor(frames * 0.95));
    const percentile95FrameTimeMs = frames > 0 ? sorted[p95Index] : 0;

    const overBudget =
      this.targetFps > 0 ? sorted.filter((value) => value > budgetMs).length : 0;
    const overBudgetRatio = frames > 0 ? overBudget / frames : 0;

    let state: FramePressure = 'unknown';
    if (frames >= this.minimumFrames) {
      if (overBudgetRatio > PRESSURED_RATIO) state = 'pressured';
      else if (overBudgetRatio < STABLE_RATIO) state = 'stable';
      else state = 'neutral';
    }

    return {
      timestamp: now,
      state,
      targetFps: this.targetFps,
      budgetMs,
      frameTimeMs,
      averageFrameTimeMs,
      percentile95FrameTimeMs,
      overBudgetRatio,
      frames,
      windowDurationMs: Math.max(
        1,
        frames > 0
          ? this.samples[frames - 1].timestamp - this.samples[0].timestamp
          : 0,
      ),
    };
  }
}
