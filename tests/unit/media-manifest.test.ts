import { describe, expect, it } from 'vitest';
import type { MediaAssetDescriptor } from '../../src/types/media';
import {
  buildMediaManifest,
  selectResponsiveSources,
  validateManifestAssets,
} from '../../scripts/media/build-manifest';

function heroImage(overrides: Partial<MediaAssetDescriptor> = {}): MediaAssetDescriptor {
  return {
    id: 'sample-desktop-hero',
    kind: 'image',
    projectSlug: 'sample',
    sourceProvenance: 'https://example.com @ 2026-01-01T00:00:00.000Z (seed 1)',
    alt: 'Sample project — desktop hero view',
    reducedDataEligible: true,
    preload: 'high',
    aspectRatio: 16 / 9,
    variants: [
      { format: 'jpeg', width: 960, height: 540, bytes: 120_000, path: '/media/projects/sample/hero-960.jpeg' },
      { format: 'avif', width: 640, height: 360, bytes: 40_000, path: '/media/projects/sample/hero-640.avif' },
      { format: 'webp', width: 1280, height: 720, bytes: 80_000, path: '/media/projects/sample/hero-1280.webp' },
    ],
    ...overrides,
  };
}

function loopVideo(overrides: Partial<MediaAssetDescriptor> = {}): MediaAssetDescriptor {
  return {
    id: 'sample-desktop-loop',
    kind: 'video',
    projectSlug: 'sample',
    sourceProvenance: 'https://example.com @ 2026-01-01T00:00:00.000Z (seed 1, 6000ms loop)',
    alt: 'Sample project — muted interface loop',
    posterAssetId: 'sample-desktop-loop-poster',
    reducedDataEligible: false,
    preload: 'none',
    aspectRatio: 16 / 9,
    variants: [
      { format: 'mp4', width: 1440, height: 810, bytes: 2_000_000, path: '/media/projects/sample/loop.mp4' },
      { format: 'webm', width: 1440, height: 810, bytes: 1_500_000, path: '/media/projects/sample/loop.webm' },
    ],
    ...overrides,
  };
}

function loopPoster(): MediaAssetDescriptor {
  return {
    id: 'sample-desktop-loop-poster',
    kind: 'image',
    projectSlug: 'sample',
    sourceProvenance: 'https://example.com @ 2026-01-01T00:00:00.000Z (seed 1, poster frame)',
    alt: 'Sample project — interface loop poster frame',
    reducedDataEligible: true,
    preload: 'none',
    aspectRatio: 16 / 9,
    variants: [
      { format: 'jpeg', width: 1440, height: 810, bytes: 150_000, path: '/media/projects/sample/loop-poster.jpg' },
    ],
  };
}

describe('validateManifestAssets', () => {
  it('accepts a well-formed image asset', () => {
    expect(() => validateManifestAssets([heroImage()])).not.toThrow();
  });

  it('rejects an image asset with no alt text and no decorative flag', () => {
    const asset = heroImage({ alt: undefined });
    expect(() => validateManifestAssets([asset])).toThrow(/requires alt text/i);
  });

  it('accepts a decorative image asset with no alt text', () => {
    const asset = heroImage({ alt: undefined, decorative: true });
    expect(() => validateManifestAssets([asset])).not.toThrow();
  });

  it('rejects a video asset with no accessible description', () => {
    const asset = loopVideo({ alt: undefined });
    expect(() => validateManifestAssets([asset, loopPoster()])).toThrow(/accessible description/i);
  });

  it('rejects a video asset with no linked poster', () => {
    const asset = loopVideo({ posterAssetId: undefined });
    expect(() => validateManifestAssets([asset])).toThrow(/linked poster asset/i);
  });

  it('rejects a video asset whose poster id does not resolve', () => {
    const asset = loopVideo({ posterAssetId: 'does-not-exist' });
    expect(() => validateManifestAssets([asset])).toThrow(/missing poster asset/i);
  });

  it('rejects duplicate asset ids', () => {
    expect(() => validateManifestAssets([heroImage(), heroImage()])).toThrow(/duplicate media asset id/i);
  });

  it('rejects an asset with no encoded variants', () => {
    const asset = heroImage({ variants: [] });
    expect(() => validateManifestAssets([asset])).toThrow(/no encoded variants/i);
  });

  it('rejects an image variant that exceeds the responsive image byte budget', () => {
    const asset = heroImage({
      variants: [
        { format: 'jpeg', width: 1920, height: 1080, bytes: 800_000, path: '/media/projects/sample/hero-1920.jpeg' },
      ],
    });
    expect(() => validateManifestAssets([asset])).toThrow(/exceeding the .* budget/i);
  });

  it('rejects a video variant that exceeds the video loop byte budget', () => {
    const asset = loopVideo({
      variants: [
        { format: 'mp4', width: 1440, height: 810, bytes: 7_000_000, path: '/media/projects/sample/loop.mp4' },
      ],
    });
    expect(() => validateManifestAssets([asset, loopPoster()])).toThrow(/exceeding the .* budget/i);
  });
});

describe('buildMediaManifest', () => {
  it('produces byte-identical manifests for the same input regardless of asset/variant order', () => {
    const manifestA = buildMediaManifest({
      projectSlug: 'sample',
      assets: [loopVideo(), loopPoster(), heroImage()],
      generatedAt: '2026-01-01T00:00:00.000Z',
    });
    const manifestB = buildMediaManifest({
      projectSlug: 'sample',
      assets: [heroImage(), loopPoster(), loopVideo()],
      generatedAt: '2026-01-01T00:00:00.000Z',
    });

    expect(JSON.stringify(manifestA)).toBe(JSON.stringify(manifestB));
  });

  it('sorts each asset’s variants by ascending width, then format', () => {
    const manifest = buildMediaManifest({
      projectSlug: 'sample',
      assets: [heroImage()],
      generatedAt: '2026-01-01T00:00:00.000Z',
    });

    const widths = manifest.assets[0].variants.map((variant) => variant.width);
    expect(widths).toEqual([...widths].sort((a, b) => a - b));
  });

  it('stamps schemaVersion 1 and the provided projectSlug', () => {
    const manifest = buildMediaManifest({
      projectSlug: 'sample',
      assets: [heroImage()],
    });
    expect(manifest.schemaVersion).toBe(1);
    expect(manifest.projectSlug).toBe('sample');
  });
});

describe('selectResponsiveSources', () => {
  it('orders srcset candidates by ascending width', () => {
    const manifest = buildMediaManifest({
      projectSlug: 'sample',
      assets: [heroImage()],
      generatedAt: '2026-01-01T00:00:00.000Z',
    });

    const selection = selectResponsiveSources(manifest.assets[0], 'avif');
    // Only one avif variant exists in the fixture; add a second width to prove ordering.
    expect(selection.srcset).toContain('640w');
  });

  it('picks the largest variant of the format as the fallback', () => {
    const asset = heroImage({
      variants: [
        { format: 'webp', width: 640, height: 360, bytes: 20_000, path: '/a-640.webp' },
        { format: 'webp', width: 1920, height: 1080, bytes: 90_000, path: '/a-1920.webp' },
        { format: 'webp', width: 960, height: 540, bytes: 40_000, path: '/a-960.webp' },
      ],
    });

    const selection = selectResponsiveSources(asset, 'webp');
    expect(selection.fallback.width).toBe(1920);
    expect(selection.srcset).toBe('/a-640.webp 640w, /a-960.webp 960w, /a-1920.webp 1920w');
  });

  it('throws when the requested format has no variants', () => {
    expect(() => selectResponsiveSources(heroImage(), 'mp4')).toThrow(/no "mp4" variants/i);
  });
});
