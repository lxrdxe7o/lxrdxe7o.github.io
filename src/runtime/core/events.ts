import type {
  CapabilityFlags,
  EntryMode,
  QualityTier,
  RecoverableRuntimeError,
  StoredSoundPreference,
} from './types';

export type RuntimeEvent =
  | { readonly type: 'BOOT' }
  | {
      readonly type: 'CAPABILITIES_RESOLVED';
      readonly capabilities: CapabilityFlags;
      readonly soundPreference: StoredSoundPreference;
    }
  | { readonly type: 'CAPABILITIES_CHANGED'; readonly capabilities: CapabilityFlags }
  | { readonly type: 'LOAD_COMPLETE' }
  | { readonly type: 'ENTER'; readonly mode: Exclude<EntryMode, null> }
  | { readonly type: 'PREPARE_NAVIGATION'; readonly target: string }
  | { readonly type: 'COMMIT_NAVIGATION' }
  | { readonly type: 'SET_ROUTE'; readonly route: string }
  | { readonly type: 'SET_INDEX_OPEN'; readonly open: boolean }
  | { readonly type: 'SET_MUTED'; readonly muted: boolean }
  /** Emitted by the adaptive quality controller, never by UI controls. */
  | { readonly type: 'SET_QUALITY_TIER'; readonly tier: QualityTier }
  | { readonly type: 'DEGRADE'; readonly error: RecoverableRuntimeError }
  | { readonly type: 'DESTROY' };
