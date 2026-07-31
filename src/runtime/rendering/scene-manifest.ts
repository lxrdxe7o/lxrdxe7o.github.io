import type { QualityTier } from '../core/types';
import { hashSeed, SeededRandom } from './SeededRandom';
import type { ScenePreparationManifest } from './types';

const PARTICLE_COUNTS = Object.freeze({
  static: 0,
  low: 420,
  medium: 900,
  high: 1600,
}) satisfies Readonly<Record<QualityTier, number>>;

function fingerprint(random: SeededRandom): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < 16; index += 1) {
    hash ^= random.nextUint32();
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function createSceneManifest(
  route: string,
  qualityTier: QualityTier,
  baseSeed: number,
  reducedMotion: boolean,
): ScenePreparationManifest {
  const normalizedRoute = route.startsWith('/') ? route : `/${route}`;
  const seed = hashSeed(
    `${baseSeed >>> 0}:${normalizedRoute}:${qualityTier}:${reducedMotion ? 'reduced' : 'full'}`,
  );
  const particleCount = reducedMotion
    ? Math.floor(PARTICLE_COUNTS[qualityTier] * 0.6)
    : PARTICLE_COUNTS[qualityTier];
  return Object.freeze({
    route: normalizedRoute,
    qualityTier,
    seed,
    reducedMotion,
    particleCount,
    particleFingerprint: fingerprint(new SeededRandom(seed)),
  });
}
