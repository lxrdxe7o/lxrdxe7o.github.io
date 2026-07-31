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
      postProcessing: 'none',
      textureBudgetMb: 0,
      updateCadence: 0,
    }),
    low: Object.freeze({
      tier: 'low',
      dprCap: 1,
      targetFps: 30,
      particleMultiplier: 0.35,
      postProcessing: 'none',
      textureBudgetMb: 24,
      updateCadence: 2,
    }),
    medium: Object.freeze({
      tier: 'medium',
      dprCap: 1.5,
      targetFps: 50,
      particleMultiplier: 0.7,
      postProcessing: 'low',
      textureBudgetMb: 64,
      updateCadence: 1,
    }),
    high: Object.freeze({
      tier: 'high',
      dprCap: 2,
      targetFps: 60,
      particleMultiplier: 1,
      postProcessing: 'standard',
      textureBudgetMb: 128,
      updateCadence: 1,
    }),
  });

/** Ordered worst to best; adaptation only ever steps one place at a time. */
export const TIER_LADDER: readonly QualityTier[] = Object.freeze([
  'static',
  'low',
  'medium',
  'high',
]);

/** Tiers the adaptive controller may move between once WebGL is available. */
export const ADAPTIVE_LADDER: readonly QualityTier[] = Object.freeze([
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
  const index = ADAPTIVE_LADDER.indexOf(tier);
  if (index <= 0) return ADAPTIVE_LADDER[0];
  return ADAPTIVE_LADDER[index - 1];
}

export function higherTier(tier: QualityTier, ceiling: QualityTier): QualityTier {
  const index = ADAPTIVE_LADDER.indexOf(tier);
  if (index < 0) return tier;
  const ceilingIndex = ADAPTIVE_LADDER.indexOf(ceiling);
  if (ceilingIndex < 0) return tier;
  return ADAPTIVE_LADDER[Math.min(index + 1, ceilingIndex)];
}

/** Frame budget in milliseconds, with a small allowance above the target. */
export function budgetMsFor(targetFps: number, tolerance = 1.25): number {
  if (targetFps <= 0) return Number.POSITIVE_INFINITY;
  return (1000 / targetFps) * tolerance;
}
