import { AudioBusGraph } from './AudioBus';
import { ambienceForRoute, clipById, preloadableClips } from './audio-manifest';
import {
  SILENT_SNAPSHOT,
  clampGain,
  type AudioClipDefinition,
  type AudioClipHandle,
  type AudioEngine,
  type AudioManagerOptions,
  type AudioMode,
  type AudioSnapshot,
} from './types';

const DEFAULT_FADE_MS = 700;

interface ActiveClip {
  readonly definition: AudioClipDefinition;
  readonly handle: AudioClipHandle;
}

/**
 * Opt-in sound. The engine is not constructed, no file is requested and no
 * playback is attempted until `unlock()` runs inside an explicit user gesture
 * and the mode is `enabled`.
 *
 * Silent mode is not a degraded path: it simply never creates the engine, and
 * no timing or navigation logic anywhere depends on audible playback.
 */
export class AudioManager {
  private readonly buses = new AudioBusGraph();
  private readonly clips = new Map<string, AudioClipHandle>();
  private readonly fadeMs: number;
  private engine: AudioEngine | null = null;
  private mode: AudioMode = 'unknown';
  private muted = false;
  private suspended = false;
  private unlocked = false;
  private ambience: ActiveClip | null = null;
  private destroyed = false;

  constructor(private readonly options: AudioManagerOptions) {
    this.fadeMs = options.fadeMs ?? DEFAULT_FADE_MS;
  }

  getSnapshot(): AudioSnapshot {
    if (this.destroyed) return SILENT_SNAPSHOT;
    return Object.freeze({
      mode: this.mode,
      muted: this.muted,
      unlocked: this.unlocked,
      activeAmbience: this.ambience?.definition.id ?? null,
      suspended: this.suspended,
    });
  }

  get isAudible(): boolean {
    return this.mode === 'enabled' && this.unlocked && !this.muted && !this.suspended;
  }

  /**
   * Must be called synchronously from a real user gesture. Creating the engine
   * here — and only here — is what guarantees no autoplay attempt.
   */
  unlock(): boolean {
    if (this.destroyed || this.unlocked) return this.unlocked;
    if (this.mode !== 'enabled') return false;

    try {
      this.engine = this.options.createEngine();
      this.unlocked = true;
      this.engine.setMuted(this.muted);
      for (const clip of preloadableClips(this.options.manifest)) {
        this.ensureClip(clip);
      }
      return true;
    } catch (error) {
      this.engine = null;
      this.unlocked = false;
      this.reportFailure('engine', error);
      return false;
    }
  }

  /** `silent` releases everything; `enabled` only permits future playback. */
  setMode(mode: AudioMode): void {
    if (this.destroyed || mode === this.mode) return;
    this.mode = mode;

    if (mode !== 'enabled') {
      this.stopAmbience(true);
      this.releaseEngine();
    }
  }

  setMuted(muted: boolean): void {
    if (this.destroyed || muted === this.muted) return;
    this.muted = muted;
    this.engine?.setMuted(muted);

    if (!muted && this.mode === 'enabled' && this.ambience && !this.suspended) {
      this.fadeTo(this.ambience, this.targetGain(this.ambience.definition));
    }
  }

  /**
   * Crossfades route ambience. Repeated calls during rapid navigation cancel
   * the previous fade and release the outgoing clip, so no orphan sound
   * survives its owner.
   */
  crossfadeRoute(route: string): void {
    if (this.destroyed || !this.isAudibleTarget()) return;
    const next = ambienceForRoute(route, this.options.manifest);

    if (!next) {
      this.stopAmbience(false);
      return;
    }
    if (this.ambience?.definition.id === next.id) return;

    this.stopAmbience(false);
    const handle = this.ensureClip(next);
    if (!handle) return;

    this.ambience = { definition: next, handle };
    try {
      handle.volume(0);
      handle.play();
      handle.fade(0, this.targetGain(next), this.fadeMs);
    } catch (error) {
      this.ambience = null;
      this.reportFailure(next.id, error);
    }
  }

  /** Fire-and-forget interaction cue. Silently ignored when not audible. */
  playCue(id: string): void {
    if (this.destroyed || !this.isAudible) return;
    const definition = clipById(id, this.options.manifest);
    if (!definition || definition.loop) return;

    const handle = this.ensureClip(definition);
    if (!handle) return;
    try {
      handle.volume(this.targetGain(definition));
      handle.play();
    } catch (error) {
      this.reportFailure(id, error);
    }
  }

  /** Called when the page is hidden; output stops but consent is remembered. */
  suspend(): void {
    if (this.destroyed || this.suspended) return;
    this.suspended = true;
    if (this.ambience) this.fadeTo(this.ambience, 0);
    this.engine?.suspend();
  }

  resume(): void {
    if (this.destroyed || !this.suspended) return;
    this.suspended = false;
    this.engine?.resume();
    if (this.ambience && this.isAudible) {
      this.fadeTo(this.ambience, this.targetGain(this.ambience.definition));
    }
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.stopAmbience(true);
    this.releaseEngine();
  }

  private isAudibleTarget(): boolean {
    return this.mode === 'enabled' && this.unlocked && !this.suspended;
  }

  private targetGain(definition: AudioClipDefinition): number {
    if (this.muted) return 0;
    return this.buses.resolve(definition.bus, definition.baseGain);
  }

  private ensureClip(definition: AudioClipDefinition): AudioClipHandle | null {
    if (!this.engine) return null;
    const existing = this.clips.get(definition.id);
    if (existing) return existing;

    try {
      const handle = this.engine.createClip(definition);
      handle.volume(clampGain(this.targetGain(definition)));
      this.clips.set(definition.id, handle);
      return handle;
    } catch (error) {
      // A missing or unsupported file degrades to silence, never to an error.
      this.reportFailure(definition.id, error);
      return null;
    }
  }

  private fadeTo(clip: ActiveClip, target: number): void {
    try {
      clip.handle.fade(clampGain(target), clampGain(target), 0);
      clip.handle.volume(clampGain(target));
    } catch (error) {
      this.reportFailure(clip.definition.id, error);
    }
  }

  private stopAmbience(immediate: boolean): void {
    const current = this.ambience;
    this.ambience = null;
    if (!current) return;

    try {
      if (immediate) {
        current.handle.stop();
      } else {
        current.handle.fade(this.targetGain(current.definition), 0, this.fadeMs);
        current.handle.stop();
      }
    } catch (error) {
      this.reportFailure(current.definition.id, error);
    }
  }

  private releaseEngine(): void {
    for (const [, handle] of this.clips) {
      try {
        handle.stop();
        handle.unload();
      } catch {
        // Teardown continues for the remaining clips.
      }
    }
    this.clips.clear();

    const engine = this.engine;
    this.engine = null;
    this.unlocked = false;
    if (!engine) return;
    try {
      engine.destroy();
    } catch {
      // Nothing further to release.
    }
  }

  private reportFailure(clipId: string, error: unknown): void {
    this.options.onFailure?.(
      clipId,
      error instanceof Error ? error.message : String(error),
    );
  }
}
