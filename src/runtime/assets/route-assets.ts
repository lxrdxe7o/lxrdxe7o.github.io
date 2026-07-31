import type { AssetDescriptor } from './types';

export const SHARED_SCOPE = 'shared';

/**
 * Critical shell assets. Only the two regular weights are critical: the
 * remaining weights are metric-compatible enhancements that must never hold
 * the entry gate closed.
 *
 * `byteWeight` values are approximate transfer sizes used for weighting
 * progress. They do not need to be exact, only proportionate.
 */
const SHARED_ASSETS: readonly AssetDescriptor[] = Object.freeze([
  Object.freeze({
    id: 'font-geist-regular',
    url: '/fonts/geist/Geist-Regular.woff2',
    type: 'font',
    byteWeight: 34_000,
    priority: 0,
    scope: SHARED_SCOPE,
    criticality: 'critical',
  }),
  Object.freeze({
    id: 'font-mono-regular',
    url: '/fonts/jetbrains-mono/JetBrainsMono-Regular.woff2',
    type: 'font',
    byteWeight: 30_000,
    priority: 0,
    scope: SHARED_SCOPE,
    criticality: 'critical',
  }),
  Object.freeze({
    id: 'font-geist-medium',
    url: '/fonts/geist/Geist-Medium.woff2',
    type: 'font',
    byteWeight: 34_000,
    priority: 2,
    scope: SHARED_SCOPE,
    criticality: 'enhancement',
  }),
]);

const HOME_ASSETS: readonly AssetDescriptor[] = Object.freeze([]);

/**
 * Xero.dev is currently the only project with an approved captured media set,
 * so it is the only project route with a preloadable poster.
 */
const PROJECT_ASSETS: Readonly<Record<string, readonly AssetDescriptor[]>> = Object.freeze({
  'xero-dev': Object.freeze([
    Object.freeze({
      id: 'project-xero-dev-hero',
      url: '/media/projects/xero-dev/xero-dev-desktop-hero-1280.avif',
      type: 'image',
      byteWeight: 120_000,
      priority: 1,
      scope: 'project:xero-dev',
      criticality: 'enhancement',
      fallbackUrl: '/media/projects/xero-dev/xero-dev-desktop-hero-1280.jpeg',
      skipOnReducedData: true,
    }),
  ]),
});

/** Maps a pathname to the runtime asset scope that owns its assets. */
export function routeScopeFor(pathname: string): string {
  const normalized = pathname.replace(/\/+$/, '') || '/';
  if (normalized === '/') return 'home';
  const projectMatch = /^\/projects\/([^/]+)$/.exec(normalized);
  if (projectMatch) return `project:${projectMatch[1]}`;
  if (normalized.startsWith('/lab/')) return `lab:${normalized.slice('/lab/'.length)}`;
  return `route:${normalized.slice(1)}`;
}

export function sharedAssets(): readonly AssetDescriptor[] {
  return SHARED_ASSETS;
}

export function criticalSharedAssets(): readonly AssetDescriptor[] {
  return SHARED_ASSETS.filter((asset) => asset.criticality === 'critical');
}

export function assetsForScope(scope: string): readonly AssetDescriptor[] {
  if (scope === SHARED_SCOPE) return SHARED_ASSETS;
  if (scope === 'home') return HOME_ASSETS;
  if (scope.startsWith('project:')) {
    return PROJECT_ASSETS[scope.slice('project:'.length)] ?? [];
  }
  return [];
}

export function assetsForRoute(pathname: string): readonly AssetDescriptor[] {
  return assetsForScope(routeScopeFor(pathname));
}
