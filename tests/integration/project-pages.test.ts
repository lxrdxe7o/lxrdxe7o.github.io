import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FLAGSHIP_SLUGS, resolveNextProjectSlug, selectProjectHeroAsset } from '../../src/data/projects';
import { xeroDevMediaManifest } from '../../src/data/media-manifests/xero-dev';

describe('project detail contracts', () => {
  it('keeps the approved flagship order deterministic and wraps to the first project', () => {
    expect(FLAGSHIP_SLUGS).toEqual([
      'xero-dev',
      'krakenvim',
      'hachi',
      'mikeneko',
      'shiro-nekoo-115',
      'deaddrop',
      'dotfiles',
      'tora-neko-311',
      'kuro-nekoo-215',
    ]);
    expect(resolveNextProjectSlug('xero-dev')).toBe('krakenvim');
    expect(resolveNextProjectSlug('krakenvim')).toBe('hachi');
    expect(resolveNextProjectSlug('kuro-nekoo-215')).toBe('xero-dev');
    expect(resolveNextProjectSlug('not-a-flagship')).toBeUndefined();
  });

  it('selects the explicit high-priority accessible image as the hero', () => {
    const hero = selectProjectHeroAsset(xeroDevMediaManifest);
    expect(hero?.id).toBe('xero-dev-desktop-hero');
    expect(hero?.kind).toBe('image');
    expect(hero?.alt).toMatch(/desktop view/i);
  });

  it('keeps video payload opt-in and replaces video with a poster under reduced data', () => {
    const source = readFileSync(new URL('../../src/components/projects/ProjectMedia.astro', import.meta.url), 'utf8');
    expect(source).toMatch(/preload="none"/);
    expect(source).toMatch(/prefers-reduced-data:\s*reduce/);
    expect(source).toMatch(/video\s*\{\s*display:\s*none/);
    expect(source).toMatch(/data-video-enhance/);
  });

  it('requires accessible semantics and linked posters for all approved media', () => {
    const ids = new Set(xeroDevMediaManifest.assets.map((asset) => asset.id));
    for (const asset of xeroDevMediaManifest.assets) {
      expect(asset.alt || asset.decorative).toBeTruthy();
      expect(asset.variants.length).toBeGreaterThan(0);
      if (asset.kind === 'video') {
        expect(asset.posterAssetId).toBeTruthy();
        expect(ids.has(asset.posterAssetId!)).toBe(true);
      }
    }
  });
});
