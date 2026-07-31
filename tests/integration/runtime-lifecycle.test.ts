import { afterEach, describe, expect, it } from 'vitest';

import { ExperienceRuntime } from '../../src/runtime/core/ExperienceRuntime';
import {
  getExperienceRuntime,
  resetExperienceRuntimeForTests,
} from '../../src/runtime/core/runtime-singleton';
import type {
  CapabilityAdapter,
  CapabilityFlags,
  PreferenceAdapter,
  RuntimeAdapters,
  RuntimeSnapshot,
} from '../../src/runtime/core/types';

class MemoryCapabilities implements CapabilityAdapter {
  readonly listeners = new Set<() => void>();
  reads = 0;
  subscriptions = 0;
  releases = 0;
  throwOnRead = false;
  throwOnSubscribe = false;

  constructor(public flags: CapabilityFlags) {}

  private read<T>(value: T): T {
    this.reads += 1;
    if (this.throwOnRead) throw new Error('Capability read failed.');
    return value;
  }

  readReducedMotion(): boolean {
    return this.read(this.flags.reducedMotion);
  }

  readReducedData(): boolean {
    return this.read(this.flags.reducedData);
  }

  readPointer(): CapabilityFlags['pointer'] {
    return this.read(this.flags.pointer);
  }

  readWebGL(): boolean {
    return this.read(this.flags.webgl);
  }

  readVisibility(): CapabilityFlags['visibility'] {
    return this.read(this.flags.visibility);
  }

  subscribe(listener: () => void): () => void {
    this.subscriptions += 1;
    if (this.throwOnSubscribe) throw new Error('Capability subscription failed.');
    this.listeners.add(listener);
    return () => {
      if (this.listeners.delete(listener)) this.releases += 1;
    };
  }

  emit(): void {
    for (const listener of this.listeners) listener();
  }

  update(flags: CapabilityFlags): void {
    this.flags = flags;
    this.emit();
  }
}

class MemoryPreferences implements PreferenceAdapter {
  reads = 0;
  writes: Array<'sound' | 'silent'> = [];
  throwOnRead = false;

  constructor(private stored: 'sound' | 'silent' | null) {}

  readSoundPreference(): 'sound' | 'silent' | null {
    this.reads += 1;
    if (this.throwOnRead) throw new Error('Preference read failed.');
    return this.stored;
  }

  writeSoundPreference(preference: 'sound' | 'silent'): void {
    this.stored = preference;
    this.writes.push(preference);
  }
}

const capable: CapabilityFlags = {
  reducedMotion: false,
  reducedData: false,
  pointer: 'fine',
  webgl: true,
  visibility: 'visible',
};

function memoryAdapters(preference: 'sound' | 'silent' | null = null): {
  adapters: RuntimeAdapters;
  capabilities: MemoryCapabilities;
  preferences: MemoryPreferences;
} {
  const capabilities = new MemoryCapabilities(capable);
  const preferences = new MemoryPreferences(preference);
  return { adapters: { capabilities, preferences }, capabilities, preferences };
}

afterEach(() => {
  resetExperienceRuntimeForTests();
});

describe('ExperienceRuntime lifecycle', () => {
  it('boots through injected adapters and prevents duplicate boot listeners', () => {
    const { adapters, capabilities, preferences } = memoryAdapters('silent');
    const runtime = new ExperienceRuntime({ route: '/', adapters });

    runtime.boot();
    const firstSnapshot = runtime.getSnapshot();
    runtime.boot();

    expect(firstSnapshot).toMatchObject({
      phase: 'loading',
      entryPreference: 'silent',
      audioState: 'unknown',
      entryMode: null,
    });
    expect(capabilities.reads).toBe(5);
    expect(capabilities.subscriptions).toBe(1);
    expect(capabilities.listeners.size).toBe(1);
    expect(preferences.reads).toBe(1);
  });

  it('reads stored sound preference without playback or implicit entry', () => {
    const { adapters, preferences } = memoryAdapters('sound');
    const runtime = new ExperienceRuntime({ route: '/', adapters });
    const snapshots: RuntimeSnapshot[] = [];
    runtime.subscribe((snapshot) => snapshots.push(snapshot));

    runtime.boot();

    expect(runtime.getSnapshot()).toMatchObject({
      phase: 'loading',
      entryPreference: 'sound',
      entryMode: null,
      audioState: 'unknown',
    });
    expect(snapshots.every(({ audioState }) => audioState === 'unknown')).toBe(true);
    expect(preferences.reads).toBe(1);
    expect(preferences.writes).toEqual([]);
  });

  it('persists an explicit entry as the new authoritative preference', () => {
    const { adapters, preferences } = memoryAdapters('silent');
    const runtime = new ExperienceRuntime({ route: '/', adapters });

    runtime.boot();
    runtime.completeLoading();
    runtime.enter('sound');

    expect(runtime.getSnapshot()).toMatchObject({
      phase: 'active',
      entryPreference: 'sound',
      entryMode: 'sound',
      audioState: 'enabled',
    });
    expect(preferences.writes).toEqual(['sound']);
  });

  it.each([
    {
      adapter: 'capability',
      arrange: ({ capabilities }: ReturnType<typeof memoryAdapters>) => {
        capabilities.throwOnRead = true;
      },
    },
    {
      adapter: 'preference',
      arrange: ({ preferences }: ReturnType<typeof memoryAdapters>) => {
        preferences.throwOnRead = true;
      },
    },
    {
      adapter: 'capability subscription',
      arrange: ({ capabilities }: ReturnType<typeof memoryAdapters>) => {
        capabilities.throwOnSubscribe = true;
      },
    },
  ])('degrades recoverably when the $adapter adapter throws during boot', ({ arrange }) => {
    const setup = memoryAdapters('sound');
    arrange(setup);
    const runtime = new ExperienceRuntime({ route: '/', adapters: setup.adapters });

    expect(() => runtime.boot()).not.toThrow();
    expect(runtime.getSnapshot()).toMatchObject({
      phase: 'degraded',
      qualityTier: 'static',
      recoverableError: { code: 'boot' },
    });
  });

  it('guards capability refresh reads and degrades without escaping the listener', () => {
    const { adapters, capabilities } = memoryAdapters();
    const runtime = new ExperienceRuntime({ route: '/', adapters });
    runtime.boot();
    capabilities.throwOnRead = true;

    expect(() => capabilities.emit()).not.toThrow();
    expect(runtime.getSnapshot()).toMatchObject({
      phase: 'degraded',
      qualityTier: 'static',
      recoverableError: { code: 'capability-refresh' },
    });
  });

  it('publishes all changes through one subscription channel and supports unsubscribe', () => {
    const { adapters, capabilities } = memoryAdapters();
    const runtime = new ExperienceRuntime({ route: '/', adapters });
    const first: RuntimeSnapshot[] = [];
    const second: RuntimeSnapshot[] = [];
    const unsubscribeFirst = runtime.subscribe((snapshot) => first.push(snapshot));
    runtime.subscribe((snapshot) => second.push(snapshot));

    runtime.boot();
    runtime.completeLoading();
    runtime.enter('sound');
    runtime.setIndexOpen(true);
    runtime.setIndexOpen(false);
    runtime.prepareNavigation('/about');
    runtime.commitNavigation();
    runtime.setMuted(true);
    runtime.setMuted(false);
    capabilities.update({ ...capable, reducedData: true });
    const beforeUnsubscribe = first.length;
    unsubscribeFirst();
    runtime.setRoute('/contact');
    runtime.degrade({ code: 'demo', message: 'Development fallback demo.' });

    expect(first).toHaveLength(beforeUnsubscribe);
    expect(second.length).toBeGreaterThan(first.length);
    expect(second.at(-1)).toBe(runtime.getSnapshot());
    expect(runtime.getSnapshot()).toMatchObject({
      phase: 'degraded',
      route: '/contact',
      qualityTier: 'static',
      recoverableError: { code: 'demo' },
    });
  });

  it('isolates a throwing subscriber, notifies later subscribers, and degrades once', () => {
    const { adapters } = memoryAdapters();
    const runtime = new ExperienceRuntime({ route: '/', adapters });
    runtime.boot();
    runtime.completeLoading();
    runtime.enter('silent');
    let throwingCalls = 0;
    const laterSnapshots: RuntimeSnapshot[] = [];

    runtime.subscribe(() => {
      throwingCalls += 1;
      throw new Error('Subscriber failed.');
    });
    runtime.subscribe((snapshot) => laterSnapshots.push(snapshot));

    expect(() => runtime.setRoute('/about')).not.toThrow();
    expect(throwingCalls).toBe(1);
    expect(laterSnapshots.map(({ phase }) => phase)).toEqual(['degraded']);
    expect(laterSnapshots.at(-1)).toBe(runtime.getSnapshot());
    expect(runtime.getSnapshot()).toMatchObject({
      phase: 'degraded',
      route: '/about',
      recoverableError: { code: 'subscriber' },
    });
  });

  it('bounds alternating reentrant route updates and gives later subscribers the latest snapshot', () => {
    const { adapters } = memoryAdapters();
    const runtime = new ExperienceRuntime({ route: '/', adapters });
    runtime.boot();
    runtime.completeLoading();
    runtime.enter('silent');
    let alternatingCalls = 0;
    const laterSnapshots: RuntimeSnapshot[] = [];

    runtime.subscribe((snapshot) => {
      alternatingCalls += 1;
      runtime.setRoute(snapshot.route === '/about' ? '/contact' : '/about');
    });
    runtime.subscribe((snapshot) => laterSnapshots.push(snapshot));

    runtime.setRoute('/about');

    expect(alternatingCalls).toBe(1);
    expect(laterSnapshots).toHaveLength(1);
    expect(laterSnapshots[0]).toBe(runtime.getSnapshot());
    expect(laterSnapshots[0].route).toBe('/contact');
  });

  it('does not notify later subscribers with stale state after a reentrant dispatch', () => {
    const { adapters } = memoryAdapters();
    const runtime = new ExperienceRuntime({ route: '/', adapters });
    runtime.boot();
    runtime.completeLoading();
    runtime.enter('silent');
    const laterSnapshots: string[] = [];

    runtime.subscribe((snapshot) => {
      if (snapshot.phase === 'active' && snapshot.route === '/about') runtime.destroy();
    });
    runtime.subscribe((snapshot) => {
      laterSnapshots.push(`${snapshot.phase}:${snapshot.route}`);
    });

    runtime.setRoute('/about');

    expect(runtime.getSnapshot().phase).toBe('destroyed');
    expect(laterSnapshots).toEqual(['destroyed:/about']);
  });

  it('owns registered bootstrap teardowns and releases each exactly once', () => {
    const { adapters } = memoryAdapters();
    const runtime = new ExperienceRuntime({ route: '/', adapters });
    const ownedRuntime = runtime as ExperienceRuntime & {
      registerTeardown(teardown: () => void): () => void;
    };
    let releases = 0;

    expect(ownedRuntime.registerTeardown).toBeTypeOf('function');
    const release = ownedRuntime.registerTeardown(() => {
      releases += 1;
    });

    runtime.destroy();
    release();
    runtime.destroy();

    expect(releases).toBe(1);
  });

  it('destroy releases adapter listeners and makes later public events inert', () => {
    const { adapters, capabilities } = memoryAdapters();
    const runtime = new ExperienceRuntime({ route: '/', adapters });
    let notifications = 0;
    runtime.subscribe(() => {
      notifications += 1;
    });
    runtime.boot();
    runtime.completeLoading();
    runtime.enter('silent');

    runtime.destroy();
    const destroyed = runtime.getSnapshot();
    const notificationsAtDestroy = notifications;

    runtime.enter('sound');
    runtime.prepareNavigation('/projects');
    runtime.commitNavigation();
    runtime.setRoute('/about');
    runtime.setIndexOpen(true);
    runtime.setMuted(false);
    runtime.completeLoading();
    runtime.degrade({ code: 'late', message: 'Should be ignored.' });
    capabilities.update({ ...capable, visibility: 'hidden' });
    runtime.destroy();

    expect(destroyed.phase).toBe('destroyed');
    expect(runtime.getSnapshot()).toBe(destroyed);
    expect(notifications).toBe(notificationsAtDestroy);
    expect(capabilities.listeners.size).toBe(0);
    expect(capabilities.releases).toBe(1);
  });

  it('provides a stable singleton and an explicit test reset without state leakage', () => {
    const firstAdapters = memoryAdapters();
    const first = getExperienceRuntime({ route: '/', adapters: firstAdapters.adapters });
    const same = getExperienceRuntime();
    first.boot();

    expect(same).toBe(first);
    expect(firstAdapters.capabilities.listeners.size).toBe(1);

    resetExperienceRuntimeForTests();
    expect(first.getSnapshot().phase).toBe('destroyed');
    expect(firstAdapters.capabilities.listeners.size).toBe(0);

    const secondAdapters = memoryAdapters('silent');
    const second = getExperienceRuntime({ route: '/about', adapters: secondAdapters.adapters });
    expect(second).not.toBe(first);
    expect(second.getSnapshot()).toMatchObject({ phase: 'idle', route: '/about' });
  });
});
