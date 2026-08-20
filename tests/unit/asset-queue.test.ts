import { describe, expect, it, vi } from 'vitest';

import { AssetManager } from '../../src/runtime/assets/AssetManager';
import type {
  AssetDescriptor,
  AssetLoaderRegistry,
} from '../../src/runtime/assets/types';

function descriptor(overrides: Partial<AssetDescriptor> = {}): AssetDescriptor {
  return {
    id: 'font-critical',
    url: '/fonts/x.woff2',
    type: 'font',
    byteWeight: 100,
    priority: 0,
    scope: 'shared',
    criticality: 'critical',
    ...overrides,
  };
}

function loaders(): AssetLoaderRegistry {
  return {
    font: vi.fn(async ({ descriptor: { id, url } }) => ({ id, url })),
    image: vi.fn(async ({ descriptor: { id, url } }) => ({ id, url })),
    'video-poster': vi.fn(async ({ descriptor: { id, url } }) => ({ id, url })),
    texture: vi.fn(async ({ descriptor: { id, url } }) => ({ id, url })),
    shader: vi.fn(async ({ descriptor: { id, url } }) => ({ id, url })),
    audio: vi.fn(async ({ descriptor: { id, url } }) => ({ id, url })),
    data: vi.fn(async ({ descriptor: { id, url } }) => ({ id, url })),
  };
}

describe('AssetManager weighted progress', () => {
  it('reports monotonic weighted progress and never reaches 100% early', async () => {
    const manager = new AssetManager({ loaders: loaders() });
    const progress: number[] = [];
    manager.onProgress((report) => progress.push(report.ratio));

    const result = await manager.loadScope(
      'shared',
      [
        descriptor({ id: 'a', byteWeight: 100 }),
        descriptor({ id: 'b', byteWeight: 300, criticality: 'enhancement' }),
      ],
      new AbortController().signal,
    );

    expect(result.cancelled).toBe(false);
    expect(result.loaded).toHaveLength(2);
    expect(manager.getProgress().ratio).toBe(1);

    for (let index = 1; index < progress.length; index += 1) {
      expect(progress[index]).toBeGreaterThanOrEqual(progress[index - 1]);
    }
  });

  it('reports indeterminate progress honestly when byte weights are unknown', async () => {
    const manager = new AssetManager({ loaders: loaders() });
    const reports: Array<{ determinate: boolean }> = [];
    manager.onProgress((report) => reports.push(report));

    await manager.loadScope(
      'shared',
      [descriptor({ id: 'a', byteWeight: 0 })],
      new AbortController().signal,
    );

    expect(reports.every((report) => report.determinate === false)).toBe(true);
  });
});

describe('AssetManager coalescing and caching', () => {
  it('shares one network request for duplicate concurrent loads', async () => {
    const registry = loaders();
    const fontLoader = registry.font as ReturnType<typeof vi.fn>;
    const manager = new AssetManager({ loaders: registry });

    const same = descriptor({ id: 'dup' });
    await Promise.all([
      manager.loadScope('one', [same], new AbortController().signal),
      manager.loadScope('two', [same], new AbortController().signal),
    ]);

    expect(fontLoader).toHaveBeenCalledTimes(1);
    expect(manager.get('dup')).toBeDefined();
  });

  it('resolves cached assets immediately on later scopes', async () => {
    const registry = loaders();
    const fontLoader = registry.font as ReturnType<typeof vi.fn>;
    const manager = new AssetManager({ loaders: registry });

    const same = descriptor({ id: 'cached' });
    await manager.loadScope('one', [same], new AbortController().signal);
    await manager.loadScope('two', [same], new AbortController().signal);

    expect(fontLoader).toHaveBeenCalledTimes(1);
  });
});

describe('AssetManager cancellation', () => {
  it('aborts an in-flight scope and marks the result cancelled', async () => {
    const registry = loaders();
    const fontLoader = registry.font as ReturnType<typeof vi.fn>;
    fontLoader.mockImplementation(
      ({ signal }) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    );
    const manager = new AssetManager({ loaders: registry });
    const controller = new AbortController();

    const pending = manager.loadScope('shared', [descriptor({ id: 'slow' })], controller.signal);
    controller.abort();
    const result = await pending;

    expect(result.cancelled).toBe(true);
  });
});

describe('AssetManager fallbacks and partial failure', () => {
  it('substitutes a local fallback when the primary asset fails', async () => {
    const registry = loaders();
    const imageLoader = registry.image as ReturnType<typeof vi.fn>;
    imageLoader.mockImplementation(async ({ descriptor: { url } }) => {
      if (url === '/broken.jpg') throw new Error('network');
      return { ok: url };
    });
    const manager = new AssetManager({ loaders: registry });

    const result = await manager.loadScope(
      'route',
      [
        descriptor({
          id: 'hero',
          type: 'image',
          url: '/broken.jpg',
          fallbackUrl: '/poster.jpg',
          criticality: 'enhancement',
        }),
      ],
      new AbortController().signal,
    );

    expect(result.failures).toHaveLength(0);
    expect(result.loaded[0]?.fromFallback).toBe(true);
    expect(manager.get('hero')?.value).toEqual({ ok: '/poster.jpg' });
  });

  it('flags critical failures that have no usable fallback', async () => {
    const registry = loaders();
    const fontLoader = registry.font as ReturnType<typeof vi.fn>;
    fontLoader.mockImplementation(async () => {
      throw new Error('404');
    });
    const manager = new AssetManager({ loaders: registry });

    const result = await manager.loadScope(
      'shared',
      [descriptor({ id: 'critical-font', criticality: 'critical' })],
      new AbortController().signal,
    );

    expect(result.criticalFailure).toBe(true);
    expect(result.failures[0]?.recoverable).toBe(false);
  });

  it('enhancement failures never mark the scope critically broken', async () => {
    const registry = loaders();
    const audioLoader = registry.audio as ReturnType<typeof vi.fn>;
    audioLoader.mockImplementation(async () => {
      throw new Error('codec');
    });
    const manager = new AssetManager({ loaders: registry });

    const result = await manager.loadScope(
      'route',
      [descriptor({ id: 'cue', type: 'audio', criticality: 'enhancement' })],
      new AbortController().signal,
    );

    expect(result.criticalFailure).toBe(false);
    expect(result.failures).toHaveLength(1);
  });
});

describe('AssetManager reduced data and scope ownership', () => {
  it('skips descriptors flagged for reduced data', async () => {
    const registry = loaders();
    const videoLoader = registry['video-poster'] as ReturnType<typeof vi.fn>;
    const manager = new AssetManager({ loaders: registry, reducedData: true });

    const result = await manager.loadScope(
      'route',
      [
        descriptor({
          id: 'poster',
          type: 'video-poster',
          skipOnReducedData: true,
          criticality: 'enhancement',
        }),
      ],
      new AbortController().signal,
    );

    expect(result.loaded).toHaveLength(0);
    expect(videoLoader).not.toHaveBeenCalled();
  });

  it('releases assets owned only by a released scope', async () => {
    const manager = new AssetManager({ loaders: loaders() });
    const shared = descriptor({ id: 'shared-asset' });
    const routeOnly = descriptor({ id: 'route-only' });

    await manager.loadScope('shared', [shared], new AbortController().signal);
    await manager.loadScope('route', [shared, routeOnly], new AbortController().signal);

    manager.releaseScope('route');
    expect(manager.get('shared-asset')).toBeDefined();
    expect(manager.get('route-only')).toBeUndefined();

    manager.releaseScope('shared');
    expect(manager.get('shared-asset')).toBeUndefined();
  });
});
