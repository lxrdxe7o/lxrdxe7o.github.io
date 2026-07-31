import type { CapabilityFlags, PointerCapability, QualityTier } from '../core/types';

export type PostProcessingLevel = 'none' | 'low' | 'standard';

/** `unknown` until the monitor has a full window of samples to judge. */
export type FramePressure = 'unknown' | 'stable' | 'pressured';

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
  /** 1 = update every frame, 2 = every other frame, and so on. */
  readonly updateCadence: number;
}

export interface FrameBudgetReport {
  readonly samples: number;
  readonly averageFrameMs: number;
  readonly p95FrameMs: number;
  readonly pressure: FramePressure;
  readonly budgetMs: number;
}

/** Injected so Vitest can drive hysteresis timing without real time passing. */
export interface QualityClock {
  now(): number;
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
}

/** Renderer-reported cost, surfaced only through the development overlay. */
export interface RendererCostSample {
  readonly drawCalls: number;
  readonly triangles: number;
  readonly textureMemoryMb: number;
}

export interface QualityMetrics {
  readonly tier: QualityTier;
  readonly dprCap: number;
  readonly targetFps: number;
  readonly frame: FrameBudgetReport;
  readonly cost: RendererCostSample | null;
  readonly staticLocked: boolean;
}

export type QualityProfileListener = (profile: QualityProfile) => void;

export interface QualityControllerOptions {
  readonly hints: DeviceHints;
  readonly clock: QualityClock;
  /** Sustained pressure required before dropping one tier. */
  readonly downgradeAfterMs?: number;
  /** Substantially longer stability required before regaining a tier. */
  readonly upgradeAfterMs?: number;
  readonly readCost?: () => RendererCostSample | null;
}

export function isStaticForced(hints: {
  readonly webgl: boolean;
  readonly reducedData: boolean;
  readonly saveData?: boolean;
}): boolean {
  return !hints.webgl || hints.reducedData || hints.saveData === true;
}

export function capabilitiesForceStatic(capabilities: CapabilityFlags): boolean {
  return isStaticForced({
    webgl: capabilities.webgl,
    reducedData: capabilities.reducedData,
  });
}
