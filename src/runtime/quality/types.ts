import type { CapabilityFlags, PointerCapability, QualityTier } from '../core/types';

export type PostProcessingLevel = 'off' | 'minimal' | 'full';

/** `unknown` until the monitor has enough frames to judge a window. */
export type FramePressure = 'unknown' | 'stable' | 'neutral' | 'pressured';

/**
 * The complete rendering budget for one tier. Scenes read these values
 * instead of branching on the tier name, so a new tier never requires
 * touching scene code.
 */
export interface QualityProfile {
  readonly tier: QualityTier;
  readonly dprCap: number;
  readonly targetFps: number;
  readonly particleMultiplier: number;
  readonly postProcessing: PostProcessingLevel;
  readonly textureBudgetMb: number;
  /** Simulation updates per second; 0 disables per-frame work entirely. */
  readonly updateCadence: number;
}

export interface FrameBudgetReport {
  readonly timestamp: number;
  readonly state: FramePressure;
  readonly targetFps: number;
  readonly budgetMs: number;
  readonly frameTimeMs: number;
  readonly averageFrameTimeMs: number;
  readonly percentile95FrameTimeMs: number;
  readonly overBudgetRatio: number;
  readonly frames: number;
  readonly windowDurationMs: number;
}

export interface DeviceHints {
  readonly webgl: boolean;
  readonly reducedData: boolean;
  readonly reducedMotion: boolean;
  readonly pointer: PointerCapability;
  readonly deviceMemoryGb: number | null;
  readonly hardwareConcurrency: number | null;
  readonly saveData: boolean;
  readonly batterySensitive: boolean;
  readonly explicitStaticMode: boolean;
}

export type QualityChangeListener = (
  profile: QualityProfile,
  previous: QualityProfile,
) => void;

export interface QualityControllerOptions {
  readonly hints: DeviceHints;
  /** Opening tier; defaults to the capability ceiling. */
  readonly initialTier?: QualityTier;
  /** Sustained pressure required before dropping one tier. */
  readonly downgradeAfterMs?: number;
  /** Substantially longer stability required before regaining a tier. */
  readonly recoveryAfterMs?: number;
  /** Evidence ignored after every tier change. */
  readonly cooldownMs?: number;
  readonly onChange?: QualityChangeListener;
}

export function isStaticForced(hints: {
  readonly webgl: boolean;
  readonly reducedData: boolean;
  readonly saveData?: boolean;
  readonly explicitStaticMode?: boolean;
}): boolean {
  return (
    !hints.webgl ||
    hints.reducedData ||
    hints.saveData === true ||
    hints.explicitStaticMode === true
  );
}

export function capabilitiesForceStatic(capabilities: CapabilityFlags): boolean {
  return isStaticForced({
    webgl: capabilities.webgl,
    reducedData: capabilities.reducedData,
  });
}
