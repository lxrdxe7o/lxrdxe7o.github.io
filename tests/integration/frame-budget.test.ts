import { describe, expect, it } from 'vitest';

import { FrameBudgetMonitor } from '../../src/runtime/quality/FrameBudgetMonitor';
import { QualityController } from '../../src/runtime/quality/QualityController';
import { createDeviceHints } from '../../src/runtime/quality/device-hints';

function feed(
  monitor: FrameBudgetMonitor,
  start: number,
  frameTimeMs: number,
  count: number,
): number {
  let timestamp = start;
  for (let index = 0; index < count; index += 1) {
    timestamp += frameTimeMs;
    monitor.record(timestamp);
  }
  return timestamp;
}

const capableHints = createDeviceHints({
  webgl: true,
  reducedData: false,
  reducedMotion: false,
  pointer: 'fine',
  deviceMemoryGb: 8,
  hardwareConcurrency: 8,
  mobile: false,
});

describe('frame-budget adaptation', () => {
  it('classifies deterministic rolling frame streams without timers or sleeps', () => {
    let now = 0;
    const monitor = new FrameBudgetMonitor({
      targetFps: 60,
      windowSizeMs: 1000,
      minimumFrames: 12,
      clock: () => now,
    });

    monitor.record();
    now = feed(monitor, now, 16, 80);
    expect(monitor.snapshot()).toMatchObject({
      state: 'stable',
      targetFps: 60,
      frames: expect.any(Number),
    });

    now = feed(monitor, now, 34, 40);
    expect(monitor.snapshot()).toMatchObject({
      state: 'pressured',
      frameTimeMs: 34,
    });
    expect(monitor.snapshot().averageFrameTimeMs).toBeGreaterThan(1000 / 60);
  });

  it('downgrades under sustained pressure, retargets the budget, and recovers cautiously', () => {
    const controller = new QualityController({
      hints: capableHints,
      initialTier: 'high',
      downgradeAfterMs: 1000,
      recoveryAfterMs: 8000,
      cooldownMs: 500,
    });
    const monitor = new FrameBudgetMonitor({
      targetFps: controller.profile.targetFps,
      windowSizeMs: 500,
      minimumFrames: 8,
    });

    let timestamp = 0;
    monitor.record(timestamp);
    for (let index = 0; index < 90 && controller.profile.tier === 'high'; index += 1) {
      timestamp += 34;
      controller.observe(monitor.record(timestamp));
    }
    expect(controller.profile.tier).toBe('medium');

    monitor.setTargetFps(controller.profile.targetFps);
    monitor.reset(timestamp);
    for (let index = 0; index < 600 && controller.profile.tier === 'medium'; index += 1) {
      timestamp += 20;
      controller.observe(monitor.record(timestamp));
    }
    expect(controller.profile.tier).toBe('high');
  });

  it('holds a stable tier for jitter around the budget boundary', () => {
    const controller = new QualityController({
      hints: capableHints,
      initialTier: 'medium',
      downgradeAfterMs: 1000,
      recoveryAfterMs: 8000,
      cooldownMs: 500,
    });
    const monitor = new FrameBudgetMonitor({
      targetFps: 45,
      windowSizeMs: 750,
      minimumFrames: 12,
    });

    let timestamp = 0;
    monitor.record(timestamp);
    for (let index = 0; index < 800; index += 1) {
      timestamp += index % 2 === 0 ? 20 : 25;
      controller.observe(monitor.record(timestamp));
    }

    expect(controller.profile.tier).toBe('medium');
  });

  it('keeps mandatory static overrides outside frame-driven recovery', () => {
    const controller = new QualityController({
      hints: { ...capableHints, webgl: false },
      downgradeAfterMs: 1000,
      recoveryAfterMs: 8000,
    });

    for (let timestamp = 0; timestamp <= 30_000; timestamp += 1000) {
      controller.observe({
        timestamp,
        state: 'stable',
        targetFps: 60,
        budgetMs: 1000 / 60,
        frameTimeMs: 16,
        averageFrameTimeMs: 16,
        percentile95FrameTimeMs: 16,
        overBudgetRatio: 0,
        frames: 60,
        windowDurationMs: 1000,
      });
    }

    expect(controller.profile.tier).toBe('static');
  });
});
