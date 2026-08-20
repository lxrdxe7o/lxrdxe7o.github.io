import type { QualityTier } from '../core/types';
import type { QualityProfile } from './types';

/**
 * DPR caps and FPS targets come straight from the plan's adaptive tier
 * table. `static` still carries a profile so static mode can render
 * posters and reserve layout without a special-case branch.
 */
export const QUALITY_PROFILES: Readonly<Record<QualityTier, QualityProfile>> =
  Object.freeze({
    static: Object.freeze({
      tier: 'static',
      dprCap: 1,
      targetFps: 0,
      particleMultiplier: 0,
      postProcessing: 'off',
      textureBudgetMb: 0,
      updateCadence: 0,
    }),
    low: Object.freeze({
      tier: 'low',
      dprCap: 1,
      targetFps: 30,
      particleMultiplier: 0.35,
      postProcessing: 'off',
      textureBudgetMb: 64,
      updateCadence: 30,
    }),
    medium: Object.freeze({
      tier: 'medium',
      dprCap: 1.5,
      targetFps: 45,
      particleMultiplier: 0.65,
      postProcessing: 'minimal',
      textureBudgetMb: 128,
      updateCadence: 30,
    }),
    high: Object.freeze({
      tier: 'high',
      dprCap: 2,
      targetFps: 60,
      particleMultiplier: 1,
      postProcessing: 'full',
      textureBudgetMb: 256,
      updateCadence: 60,
    }),
  });

/** Ordered worst to best; adaptation only ever steps one place at a time. */
export const TIER_LADDER: readonly QualityTier[] = Object.freeze([
  'static',
  'low',
  'medium',
  'high',
]);

export function profileFor(tier: QualityTier): QualityProfile {
  return QUALITY_PROFILES[tier];
}

export function tierIndex(tier: QualityTier): number {
  return TIER_LADDER.indexOf(tier);
}

export function lowerTier(tier: QualityTier): QualityTier {
  const index = TIER_LADDER.indexOf(tier);
  if (index <= 1) return TIER_LADDER[0];
  return TIER_LADDER[index - 1];
}

export function higherTier(tier: QualityTier, ceiling: QualityTier): QualityTier {
  const index = TIER_LADDER.indexOf(tier);
  const ceilingIndex = TIER_LADDER.indexOf(ceiling);
  if (index < 0 || ceilingIndex < 0) return tier;
  return TIER_LADDER[Math.min(index + 1, ceilingIndex)];
}

/**
 * Clamps a device pixel ratio to the active profile cap. Non-finite input
 * collapses to the conservative value 1 before clamping, so a broken
 * `devicePixelRatio` report can never inflate the render target.
 */
export function clampDevicePixelRatio(
  devicePixelRatio: number,
  profile: QualityProfile,
): number {
  const finiteDpr = Number.isFinite(devicePixelRatio) ? devicePixelRatio : 1;
  const safeDpr = Math.max(0.75, finiteDpr);
  return Math.min(safeDpr, profile.dprCap);
}

/** Frame budget in milliseconds for the target, with a small tolerance. */
export function budgetMsFor(targetFps: number, tolerance = 1.25): number {
  if (targetFps <= 0) return Number.POSITIVE_INFINITY;
  return (1000 / targetFps) * tolerance;
}
