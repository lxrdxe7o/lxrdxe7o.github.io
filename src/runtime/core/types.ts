export type RuntimePhase =
  | 'idle'
  | 'booting'
  | 'loading'
  | 'entry-gate'
  | 'active'
  | 'index-open'
  | 'navigating'
  | 'degraded'
  | 'destroyed'
  // Plan compat: capitalized phases for minimal state machine
  | 'Booting'
  | 'Loading'
  | 'EntryGate'
  | 'ActiveSilent'
  | 'ActiveSound'
  | 'Degraded';
export type EntryMode = 'sound' | 'silent' | null;
export type AudioState = 'unknown' | 'silent' | 'enabled' | 'muted';
export type IndexState = 'closed' | 'open';
export type QualityTier = 'static' | 'low' | 'medium' | 'high';
export type PointerCapability = 'none' | 'coarse' | 'fine';
export type RuntimeVisibility = 'visible' | 'hidden';
export type StoredSoundPreference = 'sound' | 'silent' | null;

export interface CapabilityFlags {
  readonly reducedMotion: boolean;
  readonly reducedData: boolean;
  readonly pointer: PointerCapability;
  readonly webgl: boolean;
  readonly visibility: RuntimeVisibility;
}

export interface RecoverableRuntimeError {
  readonly code: string;
  readonly message: string;
}

export interface RuntimeSnapshot {
  readonly phase: RuntimePhase;
  readonly route: string;
  readonly entryMode: EntryMode;
  readonly entryPreference: StoredSoundPreference;
  readonly audioState: AudioState;
  readonly indexState: IndexState;
  readonly navigationTarget: string | null;
  readonly qualityTier: QualityTier;
  readonly capabilities: CapabilityFlags;
  readonly recoverableError: RecoverableRuntimeError | null;
}

// Plan compat: minimal state shape for Phase 2 tasks
export interface RuntimeState {
  phase: RuntimePhase;
  muted: boolean;
}

export interface CapabilityAdapter {
  readReducedMotion(): boolean;
  readReducedData(): boolean;
  readPointer(): PointerCapability;
  readWebGL(): boolean;
  readVisibility(): RuntimeVisibility;
  subscribe(listener: () => void): () => void;
}

export interface PreferenceAdapter {
  readSoundPreference(): StoredSoundPreference;
  writeSoundPreference(preference: Exclude<StoredSoundPreference, null>): void;
}

export interface RuntimeAdapters {
  readonly capabilities: CapabilityAdapter;
  readonly preferences: PreferenceAdapter;
}

export type RuntimeSubscriber = (snapshot: RuntimeSnapshot) => void;
