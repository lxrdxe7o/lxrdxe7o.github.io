import type { AssetDescriptor, AssetFailure } from './types';

export type FallbackAction =
  /** Swap in a local poster or static substitute and carry on. */
  | 'use-local-substitute'
  /** Drop the enhancement entirely; semantic content already covers it. */
  | 'drop-enhancement'
  /** Offer the visitor an explicit retry. */
  | 'offer-retry'
  /** Abandon the enhanced experience and present static content. */
  | 'degrade-to-static';

export interface FallbackResolution {
  readonly action: FallbackAction;
  readonly substituteUrl?: string;
  /** Visitor-facing text: concise, non-technical, and actionable. */
  readonly notice: string | null;
}

/**
 * Maps one asset failure to a recovery path. Nothing here strands the visitor:
 * every branch ends with usable content, and only a critical failure without a
 * substitute escalates to static mode.
 */
export function resolveAssetFallback(failure: AssetFailure): FallbackResolution {
  const { descriptor } = failure;

  if (descriptor.fallbackUrl) {
    return {
      action: 'use-local-substitute',
      substituteUrl: descriptor.fallbackUrl,
      notice: null,
    };
  }

  if (descriptor.criticality === 'enhancement') {
    return { action: 'drop-enhancement', notice: null };
  }

  switch (descriptor.type) {
    case 'font':
      // Metric-compatible system fallbacks already render the page.
      return { action: 'drop-enhancement', notice: null };
    case 'audio':
      return {
        action: 'drop-enhancement',
        notice: 'Sound is unavailable right now. Everything else works as usual.',
      };
    case 'texture':
    case 'shader':
      return {
        action: 'degrade-to-static',
        notice: 'Showing the simplified version of this page.',
      };
    default:
      return {
        action: 'offer-retry',
        notice: 'Some of this page could not load.',
      };
  }
}

export function shouldDegradeToStatic(failures: readonly AssetFailure[]): boolean {
  return failures.some(
    (failure) => resolveAssetFallback(failure).action === 'degrade-to-static',
  );
}

/** Highest-severity notice for a batch of failures, or null when all recovered. */
export function summarizeFailures(failures: readonly AssetFailure[]): string | null {
  const order: readonly FallbackAction[] = [
    'degrade-to-static',
    'offer-retry',
    'drop-enhancement',
    'use-local-substitute',
  ];

  let best: FallbackResolution | null = null;
  for (const failure of failures) {
    const resolution = resolveAssetFallback(failure);
    if (!resolution.notice) continue;
    if (!best || order.indexOf(resolution.action) < order.indexOf(best.action)) {
      best = resolution;
    }
  }
  return best?.notice ?? null;
}

export function describeDescriptor(descriptor: AssetDescriptor): string {
  return `${descriptor.type}:${descriptor.id}`;
}
