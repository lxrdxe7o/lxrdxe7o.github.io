import type { AudioClipDefinition } from './types';

/**
 * Original sound layer for this portfolio.
 *
 * Every file listed here is produced by `scripts/audio/build-audio.ts` from
 * deterministic synthesis defined in `docs/audio/sound-direction.md`. Nothing
 * is sampled from a third party, and no clip is requested before the visitor
 * explicitly chooses to enter with sound.
 *
 * Until the masters are generated and approved, `AudioManager` treats a
 * missing file as a normal enhancement failure: sound is skipped and the
 * experience continues silently.
 */
export const AUDIO_MANIFEST: readonly AudioClipDefinition[] = Object.freeze([
  Object.freeze({
    id: 'ambience-field',
    sources: Object.freeze(['/audio/ambience-field.webm', '/audio/ambience-field.mp3']),
    bus: 'ambience',
    loop: true,
    baseGain: 0.75,
    preload: true,
    routes: Object.freeze(['/', '/about', '/projects']),
  }),
  Object.freeze({
    id: 'ambience-editorial',
    sources: Object.freeze([
      '/audio/ambience-editorial.webm',
      '/audio/ambience-editorial.mp3',
    ]),
    bus: 'ambience',
    loop: true,
    baseGain: 0.6,
    preload: false,
    routes: Object.freeze([
      '/writing',
      '/notes',
      '/experience',
      '/skills',
      '/uses',
      '/now',
      '/archive',
      '/contact',
    ]),
  }),
  Object.freeze({
    id: 'cue-hover',
    sources: Object.freeze(['/audio/cue-hover.webm', '/audio/cue-hover.mp3']),
    bus: 'interface',
    loop: false,
    baseGain: 0.35,
    preload: false,
  }),
  Object.freeze({
    id: 'cue-select',
    sources: Object.freeze(['/audio/cue-select.webm', '/audio/cue-select.mp3']),
    bus: 'interface',
    loop: false,
    baseGain: 0.5,
    preload: false,
  }),
  Object.freeze({
    id: 'transition-route',
    sources: Object.freeze(['/audio/transition-route.webm', '/audio/transition-route.mp3']),
    bus: 'transition',
    loop: false,
    baseGain: 0.45,
    preload: false,
  }),
]);

/** Ambience for a route, or null when no ambience is assigned. */
export function ambienceForRoute(
  route: string,
  manifest: readonly AudioClipDefinition[] = AUDIO_MANIFEST,
): AudioClipDefinition | null {
  const normalized = route.replace(/\/+$/, '') || '/';

  const scoped = manifest.find(
    (clip) =>
      clip.bus === 'ambience' &&
      clip.routes?.some((candidate) => {
        const target = candidate.replace(/\/+$/, '') || '/';
        return target === '/' ? normalized === '/' : normalized.startsWith(target);
      }),
  );
  if (scoped) return scoped;

  return manifest.find((clip) => clip.bus === 'ambience' && !clip.routes) ?? null;
}

export function preloadableClips(
  manifest: readonly AudioClipDefinition[] = AUDIO_MANIFEST,
): readonly AudioClipDefinition[] {
  return manifest.filter((clip) => clip.preload);
}

export function clipById(
  id: string,
  manifest: readonly AudioClipDefinition[] = AUDIO_MANIFEST,
): AudioClipDefinition | null {
  return manifest.find((clip) => clip.id === id) ?? null;
}
