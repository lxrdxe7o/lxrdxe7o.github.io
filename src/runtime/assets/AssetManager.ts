import { AssetQueue, type QueuedJob } from './AssetQueue';
import { AssetAbortError } from './loaders';
import {
  EMPTY_PROGRESS,
  normalizeWeight,
  type AssetDescriptor,
  type AssetLoaderRegistry,
  type AssetProgress,
  type AssetScopeResult,
  type LoadedAsset,
  type ProgressListener,
} from './types';

export interface AssetManagerOptions {
  readonly loaders: AssetLoaderRegistry;
  readonly concurrency?: number;
  /** When true, descriptors flagged `skipOnReducedData` are never requested. */
  readonly reducedData?: boolean;
}

/**
 * Manifest-driven asset acquisition with weighted progress, request
 * coalescing, cancellation, caching and graceful partial failure.
 *
 * Progress only advances as assets settle, so the loader can never claim 100%
 * while a critical asset is still outstanding.
 */
export class AssetManager {
  private readonly queue: AssetQueue;
  private readonly cache = new Map<string, LoadedAsset>();
  private readonly inflight = new Map<string, Promise<LoadedAsset>>();
  private readonly scopeOwnership = new Map<string, Set<string>>();
  private readonly progressListeners = new Set<ProgressListener>();
  private progress: AssetProgress = EMPTY_PROGRESS;
  private reducedData: boolean;
  private destroyed = false;

  constructor(private readonly options: AssetManagerOptions) {
    this.queue = new AssetQueue(options.concurrency ?? 4);
    this.reducedData = options.reducedData ?? false;
  }

  setReducedData(reducedData: boolean): void {
    this.reducedData = reducedData;
  }

  onProgress(listener: ProgressListener): () => void {
    if (this.destroyed) return () => undefined;
    this.progressListeners.add(listener);
    let active = true;
    return () => {
      if (!active) return;
      active = false;
      this.progressListeners.delete(listener);
    };
  }

  getProgress(): AssetProgress {
    return this.progress;
  }

  get(id: string): LoadedAsset | undefined {
    return this.cache.get(id);
  }

  /**
   * Loads one scope. Already-cached assets resolve immediately and duplicate
   * concurrent requests for the same id share a single network request.
   */
  async loadScope(
    scope: string,
    descriptors: readonly AssetDescriptor[],
    signal: AbortSignal,
  ): Promise<AssetScopeResult> {
    if (this.destroyed) {
      return { scope, loaded: [], failures: [], cancelled: true, criticalFailure: false };
    }

    const eligible = descriptors.filter(
      (descriptor) => !(this.reducedData && descriptor.skipOnReducedData),
    );
    const totalWeight = eligible.reduce((sum, item) => sum + normalizeWeight(item), 0);
    const determinate = eligible.every((item) => item.byteWeight > 0);

    let settledWeight = 0;
    let settledCount = 0;
    this.publishProgress({
      ratio: eligible.length === 0 ? 1 : 0,
      loadedBytes: 0,
      totalBytes: totalWeight,
      settledCount: 0,
      totalCount: eligible.length,
      determinate,
    });

    if (eligible.length === 0) {
      return { scope, loaded: [], failures: [], cancelled: false, criticalFailure: false };
    }

    const owned = this.scopeOwnership.get(scope) ?? new Set<string>();
    this.scopeOwnership.set(scope, owned);

    const jobs: QueuedJob[] = eligible.map((descriptor) => ({
      descriptor,
      run: (jobSignal) => this.acquire(descriptor, jobSignal),
    }));

    const outcome = await this.queue.run(jobs, signal, (descriptor) => {
      settledWeight += normalizeWeight(descriptor);
      settledCount += 1;
      this.publishProgress({
        ratio: totalWeight > 0 ? settledWeight / totalWeight : 1,
        loadedBytes: settledWeight,
        totalBytes: totalWeight,
        settledCount,
        totalCount: eligible.length,
        determinate,
      });
    });

    // A cancelled scope must not mutate ownership for a route the visitor left.
    if (!outcome.cancelled) {
      for (const asset of outcome.loaded) owned.add(asset.id);
    }

    const criticalFailure = outcome.failures.some(
      (failure) => failure.descriptor.criticality === 'critical' && !failure.recoverable,
    );

    return {
      scope,
      loaded: outcome.loaded,
      failures: outcome.failures,
      cancelled: outcome.cancelled,
      criticalFailure,
    };
  }

  /** Releases assets owned solely by this scope. */
  releaseScope(scope: string): void {
    const owned = this.scopeOwnership.get(scope);
    if (!owned) return;
    this.scopeOwnership.delete(scope);

    for (const id of owned) {
      const stillOwned = [...this.scopeOwnership.values()].some((set) => set.has(id));
      if (!stillOwned) this.cache.delete(id);
    }
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.cache.clear();
    this.inflight.clear();
    this.scopeOwnership.clear();
    this.progressListeners.clear();
    this.progress = EMPTY_PROGRESS;
  }

  private acquire(descriptor: AssetDescriptor, signal: AbortSignal): Promise<LoadedAsset> {
    const cached = this.cache.get(descriptor.id);
    if (cached) return Promise.resolve(cached);

    const pending = this.inflight.get(descriptor.id);
    if (pending) return pending;

    const request = this.load(descriptor, signal)
      .then((asset) => {
        if (!signal.aborted) this.cache.set(asset.id, asset);
        return asset;
      })
      .finally(() => {
        this.inflight.delete(descriptor.id);
      });

    this.inflight.set(descriptor.id, request);
    return request;
  }

  private async load(
    descriptor: AssetDescriptor,
    signal: AbortSignal,
  ): Promise<LoadedAsset> {
    const loader = this.options.loaders[descriptor.type];
    if (!loader) {
      throw new Error(`No loader registered for asset type ${descriptor.type}`);
    }

    try {
      const value = await loader({ descriptor, signal });
      return {
        id: descriptor.id,
        descriptor,
        value,
        fromFallback: false,
        bytes: normalizeWeight(descriptor),
      };
    } catch (error) {
      if (signal.aborted || error instanceof AssetAbortError) throw new AssetAbortError();
      if (!descriptor.fallbackUrl) throw error;

      // A local poster or static substitute keeps the route usable.
      const fallbackValue = await loader({
        descriptor: { ...descriptor, url: descriptor.fallbackUrl },
        signal,
      });
      return {
        id: descriptor.id,
        descriptor,
        value: fallbackValue,
        fromFallback: true,
        bytes: normalizeWeight(descriptor),
      };
    }
  }

  private publishProgress(next: AssetProgress): void {
    // Monotonic: a coalesced or cached asset can never move the bar backwards.
    const ratio = Math.max(this.progress.ratio, Math.min(1, next.ratio));
    this.progress = Object.freeze({ ...next, ratio });

    for (const listener of [...this.progressListeners]) {
      try {
        listener(this.progress);
      } catch {
        this.progressListeners.delete(listener);
      }
    }
  }

  /** Resets progress between independent load sequences. */
  resetProgress(): void {
    this.progress = EMPTY_PROGRESS;
  }
}
