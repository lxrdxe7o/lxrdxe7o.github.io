import { budgetMsFor } from './quality-presets';
import type { FrameBudgetReport, FramePressure } from './types';

export interface FrameBudgetMonitorOptions {
  /** Number of frame samples held in the rolling window. */
  readonly windowSize?: number;
  readonly targetFps: number;
  /** Multiplier applied to the ideal frame time before a frame counts as slow. */
  readonly tolerance?: number;
  /** Share of the window that must be slow before reporting pressure. */
  readonly pressureRatio?: number;
}

/**
 * Consumes frame durations and reports whether the renderer is holding its
 * budget. Judgement is withheld (`unknown`) until a full window exists, so a
 * single slow first frame during scene warm-up cannot trigger a downgrade.
 */
export class FrameBudgetMonitor {
  private readonly windowSize: number;
  private readonly tolerance: number;
  private readonly pressureRatio: number;
  private readonly samples: number[] = [];
  private targetFps: number;
  private cursor = 0;
  private filled = false;

  constructor(options: FrameBudgetMonitorOptions) {
    this.windowSize = Math.max(4, Math.floor(options.windowSize ?? 60));
    this.targetFps = options.targetFps;
    this.tolerance = options.tolerance ?? 1.25;
    this.pressureRatio = Math.min(1, Math.max(0.1, options.pressureRatio ?? 0.5));
  }

  /** Records one frame duration in milliseconds. Non-finite input is ignored. */
  sample(frameMs: number): void {
    if (!Number.isFinite(frameMs) || frameMs < 0) return;
    if (this.samples.length < this.windowSize) {
      this.samples.push(frameMs);
      if (this.samples.length === this.windowSize) this.filled = true;
      return;
    }
    this.samples[this.cursor] = frameMs;
    this.cursor = (this.cursor + 1) % this.windowSize;
    this.filled = true;
  }

  setTargetFps(targetFps: number): void {
    if (targetFps === this.targetFps) return;
    this.targetFps = targetFps;
    this.reset();
  }

  /** Clears the window so a tier change starts judging from fresh evidence. */
  reset(): void {
    this.samples.length = 0;
    this.cursor = 0;
    this.filled = false;
  }

  get hasFullWindow(): boolean {
    return this.filled;
  }

  report(): FrameBudgetReport {
    const budgetMs = budgetMsFor(this.targetFps, this.tolerance);
    const count = this.samples.length;
    if (count === 0) {
      return Object.freeze({
        samples: 0,
        averageFrameMs: 0,
        p95FrameMs: 0,
        pressure: 'unknown' as FramePressure,
        budgetMs,
      });
    }

    let total = 0;
    let slow = 0;
    for (const sample of this.samples) {
      total += sample;
      if (sample > budgetMs) slow += 1;
    }

    const sorted = [...this.samples].sort((left, right) => left - right);
    const p95Index = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95));

    let pressure: FramePressure = 'unknown';
    if (this.filled) {
      pressure = slow / count >= this.pressureRatio ? 'pressured' : 'stable';
    }

    return Object.freeze({
      samples: count,
      averageFrameMs: total / count,
      p95FrameMs: sorted[p95Index],
      pressure,
      budgetMs,
    });
  }
}
