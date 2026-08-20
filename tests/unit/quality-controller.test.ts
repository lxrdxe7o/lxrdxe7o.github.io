import { describe, expect, it, vi } from 'vitest';

import { QualityController } from '../../src/runtime/quality/QualityController';
import { createDeviceHints, selectStartupTier } from '../../src/runtime/quality/device-hints';
import { QUALITY_PROFILES, clampDevicePixelRatio } from '../../src/runtime/quality/quality-presets';
import type { FrameBudgetReport } from '../../src/runtime/quality/types';

function report(
  timestamp: number,
  state: FrameBudgetReport['state'],
  frameTimeMs = state === 'pressured' ? 28 : 16,
): FrameBudgetReport {
  return {
    timestamp,
    state,
    targetFps: 60,
    budgetMs: 1000 / 60,
    frameTimeMs,
    averageFrameTimeMs: frameTimeMs,
    percentile95FrameTimeMs: frameTimeMs,
    overBudgetRatio: state === 'pressured' ? 1 : 0,
    frames: 60,
    windowDurationMs: 1000,
  };
}

const desktopHints = createDeviceHints({
  webgl: true,
  reducedData: false,
  reducedMotion: false,
  pointer: 'fine',
  deviceMemoryGb: 8,
  hardwareConcurrency: 8,
  mobile: false,
});

describe('quality presets and startup selection', () => {
  it('defines complete immutable renderer profiles for every tier', () => {
    expect(QUALITY_PROFILES).toEqual({
      static: {
        tier: 'static',
        dprCap: 1,
        targetFps: 0,
        updateCadence: 0,
        particleMultiplier: 0,
        postProcessing: 'off',
        textureBudgetMb: 0,
      },
      low: {
        tier: 'low',
        dprCap: 1,
        targetFps: 30,
        updateCadence: 30,
        particleMultiplier: 0.35,
        postProcessing: 'off',
        textureBudgetMb: 64,
      },
      medium: {
        tier: 'medium',
        dprCap: 1.5,
        targetFps: 45,
        updateCadence: 30,
        particleMultiplier: 0.65,
        postProcessing: 'minimal',
        textureBudgetMb: 128,
      },
      high: {
        tier: 'high',
        dprCap: 2,
        targetFps: 60,
        updateCadence: 60,
        particleMultiplier: 1,
        postProcessing: 'full',
        textureBudgetMb: 256,
      },
    });
    expect(Object.isFrozen(QUALITY_PROFILES.medium)).toBe(true);
  });

  it('forces static mode for reduced data, missing WebGL, or explicit static mode', () => {
    expect(selectStartupTier({ ...desktopHints, reducedData: true })).toBe('static');
    expect(selectStartupTier({ ...desktopHints, webgl: false })).toBe('static');
    expect(selectStartupTier({ ...desktopHints, explicitStaticMode: true })).toBe('static');
  });

  it('starts conservatively when hardware evidence is absent or constrained', () => {
    expect(selectStartupTier(createDeviceHints({
      webgl: true,
      reducedData: false,
      reducedMotion: false,
      pointer: 'fine',
    }))).toBe('medium');
    expect(selectStartupTier({ ...desktopHints, deviceMemoryGb: 2 })).toBe('low');
    expect(selectStartupTier({ ...desktopHints, hardwareConcurrency: 4 })).toBe('low');
    expect(selectStartupTier({ ...desktopHints, pointer: 'coarse', mobile: true })).toBe('low');
  });

  it('never permits DPR above the active profile cap', () => {
    expect(clampDevicePixelRatio(Number.POSITIVE_INFINITY, QUALITY_PROFILES.high)).toBe(1);
    expect(clampDevicePixelRatio(4, QUALITY_PROFILES.high)).toBe(2);
    expect(clampDevicePixelRatio(2, QUALITY_PROFILES.medium)).toBe(1.5);
    expect(clampDevicePixelRatio(0.25, QUALITY_PROFILES.low)).toBe(0.75);
  });
});

describe('QualityController', () => {
  it('downgrades one tier only after sustained pressure', () => {
    const controller = new QualityController({
      hints: desktopHints,
      initialTier: 'high',
      downgradeAfterMs: 1000,
      recoveryAfterMs: 8000,
      cooldownMs: 500,
    });

    controller.observe(report(0, 'pressured'));
    controller.observe(report(999, 'pressured'));
    expect(controller.profile.tier).toBe('high');

    controller.observe(report(1000, 'pressured'));
    expect(controller.profile.tier).toBe('medium');
    controller.observe(report(1200, 'pressured'));
    expect(controller.profile.tier).toBe('medium');
  });

  it('requires a substantially longer uninterrupted recovery before upgrading', () => {
    const controller = new QualityController({
      hints: desktopHints,
      initialTier: 'medium',
      downgradeAfterMs: 1000,
      recoveryAfterMs: 8000,
      cooldownMs: 500,
    });

    controller.observe(report(0, 'stable'));
    controller.observe(report(7999, 'stable'));
    expect(controller.profile.tier).toBe('medium');

    controller.observe(report(8000, 'stable'));
    expect(controller.profile.tier).toBe('high');
  });

  it('does not oscillate when pressure and stability alternate', () => {
    const controller = new QualityController({
      hints: desktopHints,
      initialTier: 'medium',
      downgradeAfterMs: 1000,
      recoveryAfterMs: 8000,
      cooldownMs: 500,
    });

    for (let timestamp = 0; timestamp <= 20_000; timestamp += 250) {
      controller.observe(report(timestamp, timestamp % 500 === 0 ? 'pressured' : 'stable'));
    }

    expect(controller.profile.tier).toBe('medium');
  });

  it('clears accumulated evidence across neutral samples and profile changes', () => {
    const controller = new QualityController({
      hints: desktopHints,
      initialTier: 'high',
      downgradeAfterMs: 1000,
      recoveryAfterMs: 8000,
      cooldownMs: 500,
    });

    controller.observe(report(0, 'pressured'));
    controller.observe(report(900, 'pressured'));
    controller.observe(report(901, 'neutral'));
    controller.observe(report(1500, 'pressured'));
    controller.observe(report(2400, 'pressured'));
    expect(controller.profile.tier).toBe('high');

    controller.observe(report(2500, 'pressured'));
    expect(controller.profile.tier).toBe('medium');
  });

  it('locks to static when mandatory hints change and emits only real changes', () => {
    const onChange = vi.fn();
    const controller = new QualityController({ hints: desktopHints, onChange });

    controller.updateHints({ ...desktopHints, reducedData: true }, 100);
    controller.updateHints({ ...desktopHints, reducedData: true }, 200);

    expect(controller.profile).toBe(QUALITY_PROFILES.static);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(QUALITY_PROFILES.static, QUALITY_PROFILES.high);
  });
});

// Plan compat: minimal quality downgrade after sustained slow frames
import { test, expect as expectPlan } from 'vitest';
test('Quality downgrades from High to Medium after sustained frame drops', () => {
  const controller = new QualityController();
  expectPlan(controller.getTier()).toBe('High');
  for (let i = 0; i < 30; i++) {
    controller.reportFrameTime(33);
  }
  expectPlan(controller.getTier()).toBe('Medium');
});
