import type { RuntimeEvent } from './events';
import {
  copyError,
  freezeRuntimeSnapshot,
  sameCapabilities,
  selectQualityTier,
} from './state';
import type { RuntimeSnapshot } from './types';

const DEGRADABLE_PHASES = new Set<RuntimeSnapshot['phase']>([
  'booting',
  'loading',
  'entry-gate',
  'active',
  'index-open',
  'navigating',
]);

function withChanges(
  state: RuntimeSnapshot,
  changes: Partial<RuntimeSnapshot>,
): RuntimeSnapshot {
  return freezeRuntimeSnapshot({ ...state, ...changes });
}

export function reduceRuntimeState(
  state: RuntimeSnapshot,
  event: RuntimeEvent,
): RuntimeSnapshot {
  if (state.phase === 'destroyed') return state;

  switch (event.type) {
    case 'BOOT':
      return state.phase === 'idle' ? withChanges(state, { phase: 'booting' }) : state;

    case 'CAPABILITIES_RESOLVED':
      if (state.phase !== 'booting') return state;
      return withChanges(state, {
        phase: 'loading',
        capabilities: event.capabilities,
        qualityTier: selectQualityTier(event.capabilities),
        entryPreference: event.soundPreference,
        audioState: 'unknown',
      });

    case 'CAPABILITIES_CHANGED':
      if (state.phase === 'idle' || state.phase === 'booting') return state;
      if (sameCapabilities(state.capabilities, event.capabilities)) return state;
      return withChanges(state, {
        capabilities: event.capabilities,
        qualityTier:
          state.phase === 'degraded'
            ? 'static'
            : selectQualityTier(event.capabilities),
      });

    case 'LOAD_COMPLETE':
      return state.phase === 'loading'
        ? withChanges(state, { phase: 'entry-gate' })
        : state;

    case 'ENTER':
      if (state.phase !== 'entry-gate') return state;
      return withChanges(state, {
        phase: 'active',
        entryMode: event.mode,
        entryPreference: event.mode,
        audioState: event.mode === 'sound' ? 'enabled' : 'silent',
      });

    case 'PREPARE_NAVIGATION':
      if (state.phase !== 'active' && state.phase !== 'index-open') return state;
      if (!event.target) return state;
      return withChanges(state, {
        phase: 'navigating',
        indexState: 'closed',
        navigationTarget: event.target,
      });

    case 'COMMIT_NAVIGATION':
      if (state.phase !== 'navigating' || state.navigationTarget === null) return state;
      return withChanges(state, {
        phase: 'active',
        route: state.navigationTarget,
        navigationTarget: null,
      });

    case 'SET_ROUTE':
      return event.route && event.route !== state.route
        ? withChanges(state, { route: event.route })
        : state;

    case 'SET_INDEX_OPEN':
      if (event.open && state.phase === 'active') {
        return withChanges(state, { phase: 'index-open', indexState: 'open' });
      }
      if (!event.open && state.phase === 'index-open') {
        return withChanges(state, { phase: 'active', indexState: 'closed' });
      }
      return state;

    case 'SET_MUTED':
      if (state.entryMode !== 'sound') return state;
      if (event.muted && state.audioState === 'enabled') {
        return withChanges(state, { audioState: 'muted' });
      }
      if (!event.muted && state.audioState === 'muted') {
        return withChanges(state, { audioState: 'enabled' });
      }
      return state;

    case 'SET_QUALITY_TIER':
      // Capability locks outrank measured tiers, and a degraded route stays
      // static until it is rebuilt, so neither can be raised from here.
      if (state.phase === 'idle' || state.phase === 'booting') return state;
      if (state.phase === 'degraded') return state;
      if (!state.capabilities.webgl || state.capabilities.reducedData) {
        return state.qualityTier === 'static'
          ? state
          : withChanges(state, { qualityTier: 'static' });
      }
      return event.tier === state.qualityTier
        ? state
        : withChanges(state, { qualityTier: event.tier });

    case 'DEGRADE':
      if (!DEGRADABLE_PHASES.has(state.phase)) return state;
      return withChanges(state, {
        phase: 'degraded',
        indexState: 'closed',
        navigationTarget: null,
        qualityTier: 'static',
        recoverableError: copyError(event.error),
      });

    case 'DESTROY':
      return withChanges(state, {
        phase: 'destroyed',
        indexState: 'closed',
        navigationTarget: null,
      });
  }
}
