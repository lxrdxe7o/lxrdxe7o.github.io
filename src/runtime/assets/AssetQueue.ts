import type { AssetDescriptor, AssetFailure, LoadedAsset } from './types';

export interface QueuedJob {
  readonly descriptor: AssetDescriptor;
  run(signal: AbortSignal): Promise<LoadedAsset>;
}

export interface QueueOutcome {
  readonly loaded: LoadedAsset[];
  readonly failures: AssetFailure[];
  readonly cancelled: boolean;
}

export type SettledListener = (descriptor: AssetDescriptor) => void;

/**
 * Deterministic ordering: priority first, then id. Two runs of the same
 * manifest always start work in the same sequence, which keeps captures and
 * progress reporting reproducible.
 */
export function sortJobs(jobs: readonly QueuedJob[]): QueuedJob[] {
  return [...jobs].sort((left, right) => {
    if (left.descriptor.priority !== right.descriptor.priority) {
      return left.descriptor.priority - right.descriptor.priority;
    }
    return left.descriptor.id.localeCompare(right.descriptor.id);
  });
}

/**
 * Runs asset jobs with a bounded concurrency window. Once the signal aborts no
 * further jobs are started, so a cancelled navigation stops consuming
 * bandwidth for a route the visitor already left.
 */
export class AssetQueue {
  constructor(private readonly concurrency: number = 4) {}

  async run(
    jobs: readonly QueuedJob[],
    signal: AbortSignal,
    onSettled?: SettledListener,
  ): Promise<QueueOutcome> {
    const ordered = sortJobs(jobs);
    const loaded: LoadedAsset[] = [];
    const failures: AssetFailure[] = [];
    let cursor = 0;
    let cancelled = signal.aborted;

    const workerCount = Math.max(1, Math.min(this.concurrency, ordered.length));

    const worker = async (): Promise<void> => {
      while (cursor < ordered.length) {
        if (signal.aborted) {
          cancelled = true;
          return;
        }
        const job = ordered[cursor];
        cursor += 1;

        try {
          const asset = await job.run(signal);
          loaded.push(asset);
        } catch (error) {
          if (signal.aborted) {
            cancelled = true;
            return;
          }
          failures.push({
            id: job.descriptor.id,
            descriptor: job.descriptor,
            reason: error instanceof Error ? error.message : String(error),
            recoverable: job.descriptor.criticality === 'enhancement',
          });
        } finally {
          if (!signal.aborted) onSettled?.(job.descriptor);
        }
      }
    };

    await Promise.all(Array.from({ length: workerCount }, () => worker()));

    return {
      loaded,
      failures,
      cancelled: cancelled || signal.aborted,
    };
  }
}
