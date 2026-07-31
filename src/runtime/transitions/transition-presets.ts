import type { QualityTier } from '../core/types';

export type NavigationCause = 'link' | 'history' | 'index' | 'programmatic';
export type TransitionDirection = 'forward' | 'backward' | 'lateral';

export interface TransitionPresetInput {
  readonly fromRoute: string;
  readonly toRoute: string;
  readonly cause: NavigationCause;
  readonly qualityTier: QualityTier;
  readonly reducedMotion: boolean;
}

export interface TransitionPreset {
  readonly id: string;
  readonly direction: TransitionDirection;
  readonly outgoingMs: number;
  readonly incomingMs: number;
  /** Vertical offset in pixels; zero for non-spatial transitions. */
  readonly translatePx: number;
  /** Whether the persistent canvas should blend scene states. */
  readonly blendScene: boolean;
  readonly blendMs: number;
}

/** Ordering used to infer travel direction between top-level routes. */
const ROUTE_ORDER: readonly string[] = Object.freeze([
  '/',
  '/projects',
  '/archive',
  '/about',
  '/experience',
  '/skills',
  '/uses',
  '/writing',
  '/notes',
  '/lab',
  '/now',
  '/contact',
]);

function topLevel(route: string): string {
  const normalized = route.replace(/\/+$/, '') || '/';
  if (normalized === '/') return '/';
  const [, first = ''] = normalized.split('/');
  return `/${first}`;
}

export function resolveDirection(fromRoute: string, toRoute: string): TransitionDirection {
  const from = ROUTE_ORDER.indexOf(topLevel(fromRoute));
  const to = ROUTE_ORDER.indexOf(topLevel(toRoute));
  if (from < 0 || to < 0 || from === to) return 'lateral';
  return to > from ? 'forward' : 'backward';
}

/**
 * Reduced motion gets a short, non-spatial opacity change. Static and low
 * tiers keep DOM choreography but never blend the canvas, so a constrained
 * device is not asked to render two scenes at once.
 */
export function resolveTransitionPreset(input: TransitionPresetInput): TransitionPreset {
  const direction = resolveDirection(input.fromRoute, input.toRoute);

  if (input.reducedMotion) {
    return {
      id: 'reduced-motion-fade',
      direction: 'lateral',
      outgoingMs: 90,
      incomingMs: 120,
      translatePx: 0,
      blendScene: false,
      blendMs: 0,
    };
  }

  if (input.qualityTier === 'static') {
    return {
      id: 'static-fade',
      direction,
      outgoingMs: 140,
      incomingMs: 180,
      translatePx: 0,
      blendScene: false,
      blendMs: 0,
    };
  }

  if (input.qualityTier === 'low') {
    return {
      id: 'economical-slide',
      direction,
      outgoingMs: 180,
      incomingMs: 220,
      translatePx: direction === 'backward' ? 12 : -12,
      blendScene: false,
      blendMs: 0,
    };
  }

  // History navigation reads as returning, so it is quicker and reversed.
  const historyBias = input.cause === 'history' ? 0.8 : 1;
  const translate = direction === 'backward' ? 28 : -28;

  return {
    id: input.qualityTier === 'high' ? 'cinematic-blend' : 'measured-blend',
    direction,
    outgoingMs: Math.round(260 * historyBias),
    incomingMs: Math.round(340 * historyBias),
    translatePx: translate,
    blendScene: true,
    blendMs: Math.round((input.qualityTier === 'high' ? 620 : 460) * historyBias),
  };
}
