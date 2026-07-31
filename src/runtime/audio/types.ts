export type AudioBusId = 'master' | 'ambience' | 'interface' | 'transition';

/** Mirrors the runtime's audio state; `unknown` must never produce sound. */
export type AudioMode = 'unknown' | 'silent' | 'enabled';

export interface AudioClipDefinition {
  readonly id: string;
  /** Ordered by preference; the engine picks the first supported format. */
  readonly sources: readonly string[];
  readonly bus: Exclude<AudioBusId, 'master'>;
  readonly loop: boolean;
  /** 0..1 clip gain before bus and master gain are applied. */
  readonly baseGain: number;
  /** Only ambience is worth preloading; cues load on first use. */
  readonly preload: boolean;
  /** Routes this ambience belongs to; empty means every route. */
  readonly routes?: readonly string[];
}

/** The minimal Howler surface the manager depends on. */
export interface AudioClipHandle {
  play(): number;
  stop(): void;
  fade(from: number, to: number, durationMs: number): void;
  volume(value: number): void;
  playing(): boolean;
  unload(): void;
}

export interface AudioEngine {
  createClip(definition: AudioClipDefinition): AudioClipHandle;
  /** Global output mute, independent of remembered consent. */
  setMuted(muted: boolean): void;
  suspend(): void;
  resume(): void;
  destroy(): void;
}

export interface AudioManagerOptions {
  readonly manifest: readonly AudioClipDefinition[];
  /** Deferred so no audio context is constructed before consent. */
  readonly createEngine: () => AudioEngine;
  readonly onFailure?: (clipId: string, reason: string) => void;
  readonly fadeMs?: number;
}

export interface AudioSnapshot {
  readonly mode: AudioMode;
  readonly muted: boolean;
  readonly unlocked: boolean;
  readonly activeAmbience: string | null;
  readonly suspended: boolean;
}

export const SILENT_SNAPSHOT: AudioSnapshot = Object.freeze({
  mode: 'unknown',
  muted: false,
  unlocked: false,
  activeAmbience: null,
  suspended: false,
});

export function clampGain(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}
