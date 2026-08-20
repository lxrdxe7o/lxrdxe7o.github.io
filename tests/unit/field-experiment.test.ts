import { describe, expect, it } from 'vitest';

import { FieldExperiment } from '../../src/runtime/rendering/scenes/lab/FieldExperiment';
import { ResourceTracker, type ResourceScope } from '../../src/runtime/rendering/ResourceTracker';
import { createSceneManifest } from '../../src/runtime/rendering/scene-manifest';

function createScope(): { tracker: ResourceTracker; scope: ResourceScope } {
  const tracker = new ResourceTracker();
  return { tracker, scope: tracker.createScope('field-test') };
}

describe('FieldExperiment scene lifecycle', () => {
  it('prepares, renders, updates, and disposes through the shared tracker', async () => {
    const { tracker, scope } = createScope();
    const scene = new FieldExperiment(scope, '/lab/field');
    const manifest = createSceneManifest('/lab/field', 'high', 0x1234abcd, false);

    await scene.prepare(manifest);
    await scene.enter(null);
    const renderState = scene.getRenderState();
    expect(renderState).not.toBeNull();
    expect(renderState?.scene).toBeTruthy();
    expect(renderState?.camera).toBeTruthy();

    scene.update({ time: 16, delta: 0.016, elapsed: 0.016, index: 1 });
    scene.resize({ width: 800, height: 600, dpr: 1 });
    scene.setPointer({ x: 0.25, y: -0.5 });

    expect(tracker.snapshot().resources).toBeGreaterThan(0);
    await scene.dispose();
    expect(tracker.snapshot().resources).toBe(0);
  });

  it('produces a stable scene manifest from fixed seeds', () => {
    const first = createSceneManifest('/lab/field', 'high', 0xdecafbad, false);
    const second = createSceneManifest('/lab/field', 'high', 0xdecafbad, false);
    expect(first).toEqual(second);
  });

  it('reduced motion reduces the prepared particle count', () => {
    const full = createSceneManifest('/lab/field', 'high', 42, false);
    const reduced = createSceneManifest('/lab/field', 'high', 42, true);
    expect(reduced.particleCount).toBeLessThan(full.particleCount);
  });
});
