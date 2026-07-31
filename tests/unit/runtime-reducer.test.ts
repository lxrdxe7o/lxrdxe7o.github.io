import { describe, expect, it } from 'vitest';

import type { RuntimeEvent } from '../../src/runtime/core/events';
import { reduceRuntimeState } from '../../src/runtime/core/reducer';
import { createInitialRuntimeState } from '../../src/runtime/core/state';
import type {
  CapabilityFlags,
  RuntimePhase,
  RuntimeSnapshot,
  StoredSoundPreference,
} from '../../src/runtime/core/types';

const capableEnvironment: CapabilityFlags = {
  reducedMotion: false,
  reducedData: false,
  pointer: 'fine',
  webgl: true,
  visibility: 'visible',
};

const constrainedEnvironment: CapabilityFlags = {
  reducedMotion: true,
  reducedData: true,
  pointer: 'coarse',
  webgl: false,
  visibility: 'hidden',
};

function apply(events: readonly RuntimeEvent[]): RuntimeSnapshot {
  return events.reduce(reduceRuntimeState, createInitialRuntimeState('/'));
}

function loadingState(
  preference: StoredSoundPreference = null,
  capabilities: CapabilityFlags = capableEnvironment,
): RuntimeSnapshot {
  return apply([
    { type: 'BOOT' },
    { type: 'CAPABILITIES_RESOLVED', capabilities, soundPreference: preference },
  ]);
}

function entryGateState(preference: StoredSoundPreference = null): RuntimeSnapshot {
  return reduceRuntimeState(loadingState(preference), { type: 'LOAD_COMPLETE' });
}

function activeState(mode: 'sound' | 'silent' = 'silent'): RuntimeSnapshot {
  return reduceRuntimeState(entryGateState(), { type: 'ENTER', mode });
}

function indexOpenState(mode: 'sound' | 'silent' = 'silent'): RuntimeSnapshot {
  return reduceRuntimeState(activeState(mode), { type: 'SET_INDEX_OPEN', open: true });
}

function navigatingState(mode: 'sound' | 'silent' = 'silent'): RuntimeSnapshot {
  return reduceRuntimeState(activeState(mode), {
    type: 'PREPARE_NAVIGATION',
    target: '/projects',
  });
}

function degradedState(): RuntimeSnapshot {
  return reduceRuntimeState(activeState(), {
    type: 'DEGRADE',
    error: { code: 'fixture', message: 'Fixture degradation.' },
  });
}

function stateAtPhase(phase: Exclude<RuntimePhase, 'destroyed'>): RuntimeSnapshot {
  switch (phase) {
    case 'idle':
      return createInitialRuntimeState('/');
    case 'booting':
      return apply([{ type: 'BOOT' }]);
    case 'loading':
      return loadingState();
    case 'entry-gate':
      return entryGateState();
    case 'active':
      return activeState();
    case 'index-open':
      return indexOpenState();
    case 'navigating':
      return navigatingState();
    case 'degraded':
      return degradedState();
  }
}

const nonDestroyedPhases = [
  'idle',
  'booting',
  'loading',
  'entry-gate',
  'active',
  'index-open',
  'navigating',
  'degraded',
] as const satisfies readonly Exclude<RuntimePhase, 'destroyed'>[];

const operationalPhases = [
  'loading',
  'entry-gate',
  'active',
  'index-open',
  'navigating',
  'degraded',
] as const satisfies readonly Exclude<RuntimePhase, 'destroyed'>[];

const degradablePhases = [
  'booting',
  'loading',
  'entry-gate',
  'active',
  'index-open',
  'navigating',
] as const satisfies readonly Exclude<RuntimePhase, 'destroyed'>[];

describe('runtime reducer legal transitions', () => {
  const legalCases: ReadonlyArray<{
    name: string;
    state: RuntimeSnapshot;
    event: RuntimeEvent;
    assert: (next: RuntimeSnapshot) => void;
  }> = [
    {
      name: 'idle -> booting',
      state: createInitialRuntimeState('/about'),
      event: { type: 'BOOT' },
      assert: (next) => expect(next.phase).toBe('booting'),
    },
    {
      name: 'booting -> loading preserves stored sound as entry preference only',
      state: apply([{ type: 'BOOT' }]),
      event: {
        type: 'CAPABILITIES_RESOLVED',
        capabilities: capableEnvironment,
        soundPreference: 'sound',
      },
      assert: (next) => {
        expect(next.phase).toBe('loading');
        expect(next.capabilities).toEqual(capableEnvironment);
        expect(next.qualityTier).toBe('high');
        expect(next.entryPreference).toBe('sound');
        expect(next.audioState).toBe('unknown');
        expect(next.entryMode).toBeNull();
      },
    },
    {
      name: 'capability resolution selects static quality without entering silently',
      state: apply([{ type: 'BOOT' }]),
      event: {
        type: 'CAPABILITIES_RESOLVED',
        capabilities: constrainedEnvironment,
        soundPreference: 'silent',
      },
      assert: (next) => {
        expect(next.phase).toBe('loading');
        expect(next.qualityTier).toBe('static');
        expect(next.entryPreference).toBe('silent');
        expect(next.audioState).toBe('unknown');
      },
    },
    {
      name: 'loading -> entry gate',
      state: loadingState(),
      event: { type: 'LOAD_COMPLETE' },
      assert: (next) => expect(next.phase).toBe('entry-gate'),
    },
    {
      name: 'entry gate -> active silent',
      state: entryGateState('sound'),
      event: { type: 'ENTER', mode: 'silent' },
      assert: (next) => {
        expect(next.phase).toBe('active');
        expect(next.entryMode).toBe('silent');
        expect(next.entryPreference).toBe('silent');
        expect(next.audioState).toBe('silent');
      },
    },
    {
      name: 'entry gate -> active sound',
      state: entryGateState('silent'),
      event: { type: 'ENTER', mode: 'sound' },
      assert: (next) => {
        expect(next.phase).toBe('active');
        expect(next.entryMode).toBe('sound');
        expect(next.entryPreference).toBe('sound');
        expect(next.audioState).toBe('enabled');
      },
    },
    {
      name: 'active -> index open',
      state: activeState(),
      event: { type: 'SET_INDEX_OPEN', open: true },
      assert: (next) => {
        expect(next.phase).toBe('index-open');
        expect(next.indexState).toBe('open');
      },
    },
    {
      name: 'index open -> active',
      state: indexOpenState(),
      event: { type: 'SET_INDEX_OPEN', open: false },
      assert: (next) => {
        expect(next.phase).toBe('active');
        expect(next.indexState).toBe('closed');
      },
    },
    {
      name: 'active -> navigating',
      state: activeState(),
      event: { type: 'PREPARE_NAVIGATION', target: '/projects' },
      assert: (next) => {
        expect(next.phase).toBe('navigating');
        expect(next.navigationTarget).toBe('/projects');
      },
    },
    {
      name: 'navigating -> active on commit',
      state: navigatingState(),
      event: { type: 'COMMIT_NAVIGATION' },
      assert: (next) => {
        expect(next.phase).toBe('active');
        expect(next.route).toBe('/projects');
        expect(next.navigationTarget).toBeNull();
      },
    },
    {
      name: 'sound enabled -> muted',
      state: activeState('sound'),
      event: { type: 'SET_MUTED', muted: true },
      assert: (next) => expect(next.audioState).toBe('muted'),
    },
    {
      name: 'muted -> sound enabled',
      state: reduceRuntimeState(activeState('sound'), { type: 'SET_MUTED', muted: true }),
      event: { type: 'SET_MUTED', muted: false },
      assert: (next) => expect(next.audioState).toBe('enabled'),
    },
  ];

  it.each(legalCases)('$name', ({ state, event, assert }) => {
    const next = reduceRuntimeState(state, event);
    expect(next).not.toBe(state);
    assert(next);
  });

  it.each(operationalPhases)(
    'updates capabilities while preserving the %s phase',
    (phase) => {
      const state = stateAtPhase(phase);
      const next = reduceRuntimeState(state, {
        type: 'CAPABILITIES_CHANGED',
        capabilities: constrainedEnvironment,
      });

      expect(next).not.toBe(state);
      expect(next.phase).toBe(phase);
      expect(next.capabilities).toEqual(constrainedEnvironment);
      expect(next.qualityTier).toBe('static');
    },
  );

  it.each(nonDestroyedPhases)('synchronizes routes from the %s phase', (phase) => {
    const state = stateAtPhase(phase);
    const next = reduceRuntimeState(state, { type: 'SET_ROUTE', route: '/now' });

    expect(next).not.toBe(state);
    expect(next.phase).toBe(phase);
    expect(next.route).toBe('/now');
  });

  it.each([
    { phase: 'active', state: activeState('sound') },
    { phase: 'index-open', state: indexOpenState('sound') },
    { phase: 'navigating', state: navigatingState('sound') },
    {
      phase: 'degraded',
      state: reduceRuntimeState(activeState('sound'), {
        type: 'DEGRADE',
        error: { code: 'fixture', message: 'Fixture degradation.' },
      }),
    },
  ] as const)('mutes and unmutes sound entry in the $phase phase', ({ phase, state }) => {
    const muted = reduceRuntimeState(state, { type: 'SET_MUTED', muted: true });
    const unmuted = reduceRuntimeState(muted, { type: 'SET_MUTED', muted: false });

    expect(muted).not.toBe(state);
    expect(muted).toMatchObject({
      phase,
      entryMode: 'sound',
      entryPreference: 'sound',
      audioState: 'muted',
    });
    expect(unmuted).not.toBe(muted);
    expect(unmuted).toMatchObject({
      phase,
      entryMode: 'sound',
      entryPreference: 'sound',
      audioState: 'enabled',
    });
  });

  it.each(nonDestroyedPhases)('destroys the runtime from the %s phase', (phase) => {
    const state = stateAtPhase(phase);
    const next = reduceRuntimeState(state, { type: 'DESTROY' });

    expect(next).not.toBe(state);
    expect(next.phase).toBe('destroyed');
    expect(next.indexState).toBe('closed');
    expect(next.navigationTarget).toBeNull();
  });

  it.each(degradablePhases)('degrades from the %s phase', (phase) => {
    const state = stateAtPhase(phase);
    const next = reduceRuntimeState(state, {
      type: 'DEGRADE',
      error: { code: `failure-${phase}`, message: `${phase} failed.` },
    });

    expect(next).not.toBe(state);
    expect(next).toMatchObject({
      phase: 'degraded',
      indexState: 'closed',
      navigationTarget: null,
      qualityTier: 'static',
      recoverableError: { code: `failure-${phase}` },
    });
  });

  it.each([
    { name: 'silent', state: indexOpenState('silent'), audioState: 'silent' },
    { name: 'sound', state: indexOpenState('sound'), audioState: 'enabled' },
    {
      name: 'muted',
      state: reduceRuntimeState(indexOpenState('sound'), { type: 'SET_MUTED', muted: true }),
      audioState: 'muted',
    },
  ] as const)('navigates from index-open with $name audio', ({ state, audioState }) => {
    const next = reduceRuntimeState(state, {
      type: 'PREPARE_NAVIGATION',
      target: '/about',
    });

    expect(next).not.toBe(state);
    expect(next).toMatchObject({
      phase: 'navigating',
      indexState: 'closed',
      navigationTarget: '/about',
      audioState,
    });
  });

  it('returns deeply frozen immutable snapshots', () => {
    const snapshot = reduceRuntimeState(loadingState(), {
      type: 'DEGRADE',
      error: { code: 'asset', message: 'A critical asset failed.' },
    });

    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.capabilities)).toBe(true);
    expect(Object.isFrozen(snapshot.recoverableError)).toBe(true);
  });
});

describe('runtime reducer illegal and redundant transitions', () => {
  const illegalCases: ReadonlyArray<{
    name: string;
    state: RuntimeSnapshot;
    event: RuntimeEvent;
  }> = [
    {
      name: 'cannot enter before loading completes',
      state: loadingState(),
      event: { type: 'ENTER', mode: 'sound' },
    },
    {
      name: 'cannot commit without navigation preparation',
      state: activeState(),
      event: { type: 'COMMIT_NAVIGATION' },
    },
    {
      name: 'cannot open the index while loading',
      state: loadingState(),
      event: { type: 'SET_INDEX_OPEN', open: true },
    },
    {
      name: 'silent entry cannot be unmuted into sound',
      state: activeState('silent'),
      event: { type: 'SET_MUTED', muted: false },
    },
    {
      name: 'cannot boot twice',
      state: loadingState(),
      event: { type: 'BOOT' },
    },
    {
      name: 'idle cannot receive capability updates',
      state: createInitialRuntimeState('/'),
      event: { type: 'CAPABILITIES_CHANGED', capabilities: constrainedEnvironment },
    },
    {
      name: 'degraded runtime cannot degrade recursively',
      state: degradedState(),
      event: { type: 'DEGRADE', error: { code: 'again', message: 'Again.' } },
    },
    {
      name: 'destroyed snapshots reject all later events',
      state: reduceRuntimeState(activeState(), { type: 'DESTROY' }),
      event: { type: 'SET_ROUTE', route: '/contact' },
    },
    {
      name: 'setting the current route is redundant',
      state: activeState(),
      event: { type: 'SET_ROUTE', route: '/' },
    },
  ];

  it.each(illegalCases)('$name and preserves snapshot identity', ({ state, event }) => {
    expect(reduceRuntimeState(state, event)).toBe(state);
  });
});
