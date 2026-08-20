import { describe, expect, it, vi } from 'vitest';

import { AudioBusGraph } from '../../src/runtime/audio/AudioBus';
import { AudioManager } from '../../src/runtime/audio/AudioManager';
import { ambienceForRoute, clipById, preloadableClips } from '../../src/runtime/audio/audio-manifest';
import type {
  AudioClipDefinition,
  AudioClipHandle,
  AudioEngine,
} from '../../src/runtime/audio/types';
import { clampGain } from '../../src/runtime/audio/types';

class FakeHandle implements AudioClipHandle {
  readonly volumeValues: number[] = [];
  readonly fades: Array<{ from: number; to: number; durationMs: number }> = [];
  plays = 0;
  stops = 0;
  unloads = 0;
  playingNow = false;

  constructor(readonly definition: AudioClipDefinition) {}

  play(): number {
    this.plays += 1;
    this.playingNow = true;
    return this.plays;
  }

  stop(): void {
    this.stops += 1;
    this.playingNow = false;
  }

  fade(from: number, to: number, durationMs: number): void {
    this.fades.push({ from, to, durationMs });
  }

  volume(value: number): void {
    this.volumeValues.push(value);
  }

  playing(): boolean {
    return this.playingNow;
  }

  unload(): void {
    this.unloads += 1;
  }
}

class FakeEngine implements AudioEngine {
  readonly clips = new Map<string, FakeHandle>();
  muted = false;
  suspensions = 0;
  resumptions = 0;
  destroyed = false;

  createClip(definition: AudioClipDefinition): AudioClipHandle {
    const handle = new FakeHandle(definition);
    this.clips.set(definition.id, handle);
    return handle;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
  }

  suspend(): void {
    this.suspensions += 1;
  }

  resume(): void {
    this.resumptions += 1;
  }

  destroy(): void {
    this.destroyed = true;
  }
}

const MANIFEST: readonly AudioClipDefinition[] = [
  {
    id: 'ambience-field',
    sources: ['/audio/ambience-field.webm'],
    bus: 'ambience',
    loop: true,
    baseGain: 0.75,
    preload: true,
    routes: ['/', '/projects'],
  },
  {
    id: 'ambience-editorial',
    sources: ['/audio/ambience-editorial.webm'],
    bus: 'ambience',
    loop: true,
    baseGain: 0.6,
    preload: false,
    routes: ['/writing'],
  },
  {
    id: 'cue-select',
    sources: ['/audio/cue-select.webm'],
    bus: 'interface',
    loop: false,
    baseGain: 0.5,
    preload: false,
  },
];

function createManager() {
  const engine = new FakeEngine();
  const onFailure = vi.fn();
  const manager = new AudioManager({
    manifest: MANIFEST,
    createEngine: () => engine,
    onFailure,
    fadeMs: 100,
  });
  return { manager, engine, onFailure };
}

describe('AudioBusGraph', () => {
  it('clamps bus and master gains into safe bounds', () => {
    const buses = new AudioBusGraph();
    expect(buses.resolve('ambience', 0.75)).toBeGreaterThan(0);
    expect(buses.resolve('interface', 5)).toBeLessThanOrEqual(1);
    expect(buses.resolve('transition', -1)).toBeGreaterThanOrEqual(0);
  });
});

describe('clampGain', () => {
  it('rejects non-finite and out-of-range gains', () => {
    expect(clampGain(Number.NaN)).toBe(0);
    expect(clampGain(Number.POSITIVE_INFINITY)).toBe(0);
    expect(clampGain(-1)).toBe(0);
    expect(clampGain(2)).toBe(1);
    expect(clampGain(0.5)).toBe(0.5);
  });
});

describe('AudioManager consent flow', () => {
  it('never constructs the engine before an explicit sound entry', () => {
    const { manager, engine } = createManager();
    expect(engine.destroyed).toBe(false);
    expect(manager.getSnapshot().unlocked).toBe(false);
    expect(manager.isAudible).toBe(false);

    // unlock() without enabled mode refuses to build the engine.
    expect(manager.unlock()).toBe(false);
    expect(manager.getSnapshot().unlocked).toBe(false);
  });

  it('silent entry loads no audio engine and all state remains coherent', () => {
    const { manager, engine } = createManager();
    manager.setMode('silent');
    expect(manager.getSnapshot().mode).toBe('silent');
    expect(manager.isAudible).toBe(false);
    expect(engine.destroyed).toBe(false);

    manager.crossfadeRoute('/');
    expect(manager.getSnapshot().activeAmbience).toBeNull();
  });

  it('enabled entry constructs the engine exactly once inside the gesture', () => {
    const { manager, engine } = createManager();
    manager.setMode('enabled');
    expect(manager.unlock()).toBe(true);
    expect(manager.unlock()).toBe(true); // idempotent
    expect(engine.destroyed).toBe(false);
    expect(manager.getSnapshot().unlocked).toBe(true);
  });
});

describe('AudioManager crossfades and ownership', () => {
  it('crossfades route ambience and cancels cleanly on rapid navigation', () => {
    const { manager, engine } = createManager();
    manager.setMode('enabled');
    manager.unlock();

    manager.crossfadeRoute('/');
    expect(manager.getSnapshot().activeAmbience).toBe('ambience-field');

    manager.crossfadeRoute('/writing');
    expect(manager.getSnapshot().activeAmbience).toBe('ambience-editorial');

    // Rapid switches must not leave the previous clip playing.
    manager.crossfadeRoute('/');
    manager.crossfadeRoute('/writing');
    manager.crossfadeRoute('/');
    expect(manager.getSnapshot().activeAmbience).toBe('ambience-field');
    const fieldHandle = engine.clips.get('ambience-field');
    const editorialHandle = engine.clips.get('ambience-editorial');
    expect(fieldHandle?.plays).toBeGreaterThan(0);
    expect(editorialHandle?.stops).toBeGreaterThan(0);
  });

  it('releases the engine and stops all clips when the mode leaves enabled', () => {
    const { manager, engine } = createManager();
    manager.setMode('enabled');
    manager.unlock();
    manager.crossfadeRoute('/');

    manager.setMode('silent');
    expect(engine.destroyed).toBe(true);
    expect(manager.getSnapshot().activeAmbience).toBeNull();
    expect(manager.getSnapshot().unlocked).toBe(false);
  });
});

describe('AudioManager mute, suspension, and failure fallback', () => {
  it('mute suppresses output but remembers consent; unmute restores ambience', () => {
    const { manager, engine } = createManager();
    manager.setMode('enabled');
    manager.unlock();
    manager.crossfadeRoute('/');

    manager.setMuted(true);
    expect(engine.muted).toBe(true);

    manager.setMuted(false);
    expect(engine.muted).toBe(false);
    expect(manager.getSnapshot().muted).toBe(false);
    expect(manager.getSnapshot().activeAmbience).toBe('ambience-field');
  });

  it('suspend on hidden and resume on visible follow ownership rules', () => {
    const { manager, engine } = createManager();
    manager.setMode('enabled');
    manager.unlock();
    manager.crossfadeRoute('/');

    manager.suspend();
    expect(engine.suspensions).toBe(1);
    expect(manager.getSnapshot().suspended).toBe(true);

    manager.resume();
    expect(engine.resumptions).toBe(1);
    expect(manager.getSnapshot().suspended).toBe(false);
  });

  it('reports a failed engine and continues as a fully working silent path', () => {
    const onFailure = vi.fn();
    const manager = new AudioManager({
      manifest: MANIFEST,
      createEngine: () => {
        throw new Error('no audio codec');
      },
      onFailure,
    });
    manager.setMode('enabled');
    expect(manager.unlock()).toBe(false);
    expect(onFailure).toHaveBeenCalledWith('engine', 'no audio codec');
    expect(manager.getSnapshot().unlocked).toBe(false);

    // Routes and cues simply no-op; nothing throws.
    manager.crossfadeRoute('/');
    manager.playCue('cue-select');
    expect(manager.getSnapshot().activeAmbience).toBeNull();
  });

  it('destroy releases everything once', () => {
    const { manager, engine } = createManager();
    manager.setMode('enabled');
    manager.unlock();
    manager.crossfadeRoute('/');
    manager.destroy();
    manager.destroy();
    expect(engine.destroyed).toBe(true);
    expect(manager.getSnapshot()).toMatchObject({ mode: 'unknown', unlocked: false });
  });
});

describe('audio manifest helpers', () => {
  it('maps routes to ambience deterministically with prefix matching', () => {
    expect(ambienceForRoute('/', MANIFEST)?.id).toBe('ambience-field');
    expect(ambienceForRoute('/projects', MANIFEST)?.id).toBe('ambience-field');
    expect(ambienceForRoute('/projects/xero-dev', MANIFEST)?.id).toBe('ambience-field');
    expect(ambienceForRoute('/writing', MANIFEST)?.id).toBe('ambience-editorial');
    expect(ambienceForRoute('/writing/post', MANIFEST)?.id).toBe('ambience-editorial');
    expect(ambienceForRoute('/about', MANIFEST)).toBeNull();
  });

  it('preloads only ambience worth warming', () => {
    expect(preloadableClips(MANIFEST).map((clip) => clip.id)).toEqual(['ambience-field']);
  });

  it('finds cues by id and returns null for unknown ids', () => {
    expect(clipById('cue-select', MANIFEST)?.bus).toBe('interface');
    expect(clipById('missing', MANIFEST)).toBeNull();
  });
});
