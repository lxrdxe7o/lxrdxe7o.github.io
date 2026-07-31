import { describe, expect, it, vi } from 'vitest';

import { ResourceTracker } from '../../src/runtime/rendering/ResourceTracker';

class DisposableFixture {
  disposals = 0;

  dispose(): void {
    this.disposals += 1;
  }
}

class EventTargetFixture {
  readonly listeners = new Map<string, Set<EventListenerOrEventListenerObject>>();

  addEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
    this.listeners.get(type)?.delete(listener);
  }
}

describe('ResourceTracker', () => {
  it('releases every resource in a scope exactly once and reports ownership counts', () => {
    const tracker = new ResourceTracker();
    const scope = tracker.createScope('route:/');
    const geometry = scope.track(new DisposableFixture(), 'geometry');
    const material = scope.track(new DisposableFixture(), 'material');
    const texture = scope.track(new DisposableFixture(), 'texture');

    expect(tracker.snapshot()).toEqual({
      disposed: false,
      scopes: 1,
      resources: 3,
      byKind: {
        geometry: 1,
        material: 1,
        texture: 1,
      },
      releaseFailures: 0,
    });

    scope.release();
    scope.release();

    expect(geometry.disposals).toBe(1);
    expect(material.disposals).toBe(1);
    expect(texture.disposals).toBe(1);
    expect(tracker.snapshot()).toMatchObject({ scopes: 0, resources: 0 });
  });

  it('prevents a resource from being owned by two active scopes', () => {
    const tracker = new ResourceTracker();
    const home = tracker.createScope('route:/');
    const about = tracker.createScope('route:/about');
    const resource = home.track(new DisposableFixture(), 'render-target');

    expect(() => about.track(resource, 'render-target')).toThrow(
      'already owned by scope "route:/"',
    );

    home.release();
    expect(() => about.track(resource, 'render-target')).not.toThrow();
  });

  it('owns event listeners and removes them when their scope ends', () => {
    const tracker = new ResourceTracker();
    const scope = tracker.createScope('feature:pointer');
    const target = new EventTargetFixture();
    const listener = vi.fn();

    scope.listen(target, 'pointermove', listener);
    expect(target.listeners.get('pointermove')?.size).toBe(1);
    expect(tracker.snapshot().byKind.listener).toBe(1);

    scope.release();
    expect(target.listeners.get('pointermove')?.size).toBe(0);
  });

  it('continues releasing later resources when one disposer fails', () => {
    const failures: unknown[] = [];
    const tracker = new ResourceTracker({ onReleaseError: (error) => failures.push(error) });
    const scope = tracker.createScope('route:/projects');
    const released = scope.track(new DisposableFixture(), 'geometry');
    scope.defer(() => {
      throw new Error('Synthetic disposal failure.');
    });

    expect(() => scope.release()).not.toThrow();
    expect(released.disposals).toBe(1);
    expect(failures).toHaveLength(1);
    expect(tracker.snapshot().releaseFailures).toBe(1);
  });

  it('manually releases deferred cleanup exactly once', () => {
    const tracker = new ResourceTracker();
    const scope = tracker.createScope('feature:manual-release');
    let releases = 0;
    const release = scope.defer(() => {
      releases += 1;
    });

    release();
    release();
    scope.release();

    expect(releases).toBe(1);
    expect(tracker.snapshot()).toMatchObject({ scopes: 0, resources: 0 });
  });

  it('does not let a throwing cleanup reporter strand later resources', () => {
    const tracker = new ResourceTracker({
      onReleaseError: () => {
        throw new Error('Reporter failed.');
      },
    });
    const scope = tracker.createScope('feature:reporting-failure');
    const released = scope.track(new DisposableFixture(), 'material');
    scope.defer(() => {
      throw new Error('Resource failed.');
    });

    expect(() => scope.release()).not.toThrow();
    expect(released.disposals).toBe(1);
    expect(tracker.snapshot()).toMatchObject({
      scopes: 0,
      resources: 0,
      releaseFailures: 1,
    });
  });

  it('disposes all active scopes and rejects later ownership changes', () => {
    const tracker = new ResourceTracker();
    const first = tracker.createScope('shared');
    const second = tracker.createScope('route:/now');
    const firstResource = first.track(new DisposableFixture(), 'texture');
    const secondResource = second.track(new DisposableFixture(), 'material');

    tracker.dispose();
    tracker.dispose();

    expect(firstResource.disposals).toBe(1);
    expect(secondResource.disposals).toBe(1);
    expect(tracker.snapshot()).toMatchObject({ disposed: true, scopes: 0, resources: 0 });
    expect(() => tracker.createScope('late')).toThrow('ResourceTracker is disposed');
    expect(() => first.track(new DisposableFixture(), 'geometry')).toThrow(
      'scope "shared" is released',
    );
  });
});
