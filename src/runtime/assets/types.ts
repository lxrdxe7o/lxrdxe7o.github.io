export type AssetType = 'font' | 'image' | 'video-poster' | 'texture' | 'shader' | 'audio' | 'data';

export type AssetCriticality = 'critical' | 'enhancement';

export interface AssetDescriptor {
  readonly id: string;
  readonly url: string;
  readonly type: AssetType;
  /** Approximate transfer weight used for determinate progress. */
  readonly byteWeight: number;
  /** Lower numbers load first within a scope. */
  readonly priority: number;
  readonly scope: string;
  readonly criticality: AssetCriticality;
  /** Local, always-available substitute used when this asset fails. */
  readonly fallbackUrl?: string;
  /** Skipped entirely when the visitor prefers reduced data. */
  readonly skipOnReducedData?: boolean;
}

export interface LoadedAsset {
  readonly id: string;
  readonly descriptor: AssetDescriptor;
  readonly value: unknown;
  readonly fromFallback: boolean;
  readonly bytes: number;
}

export interface AssetFailure {
  readonly id: string;
  readonly descriptor: AssetDescriptor;
  readonly reason: string;
  readonly recoverable: boolean;
}

export interface AssetProgress {
  /** 0..1, weighted by byte weight and monotonically non-decreasing. */
  readonly ratio: number;
  readonly loadedBytes: number;
  readonly totalBytes: number;
  readonly settledCount: number;
  readonly totalCount: number;
  /** True when byte weights are known, so the UI can show a real bar. */
  readonly determinate: boolean;
}

export interface AssetScopeResult {
  readonly scope: string;
  readonly loaded: readonly LoadedAsset[];
  readonly failures: readonly AssetFailure[];
  readonly cancelled: boolean;
  /** True when a critical asset failed without a usable fallback. */
  readonly criticalFailure: boolean;
}

export interface AssetLoadContext {
  readonly signal: AbortSignal;
  readonly descriptor: AssetDescriptor;
}

export type AssetLoader = (context: AssetLoadContext) => Promise<unknown>;

export interface AssetLoaderRegistry {
  readonly [key: string]: AssetLoader | undefined;
}

export type ProgressListener = (progress: AssetProgress) => void;

export const EMPTY_PROGRESS: AssetProgress = Object.freeze({
  ratio: 0,
  loadedBytes: 0,
  totalBytes: 0,
  settledCount: 0,
  totalCount: 0,
  determinate: false,
});

export function normalizeWeight(descriptor: AssetDescriptor): number {
  return Number.isFinite(descriptor.byteWeight) && descriptor.byteWeight > 0
    ? descriptor.byteWeight
    : 1;
}
