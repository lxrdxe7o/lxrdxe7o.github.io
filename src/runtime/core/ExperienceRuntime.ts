import { readCapabilityFlags } from './capabilities';
import type { RuntimeEvent } from './events';
import { reduceRuntimeState } from './reducer';
import { createInitialRuntimeState } from './state';
import type {
  QualityTier,
  RecoverableRuntimeError,
  RuntimeAdapters,
  RuntimeSnapshot,
  RuntimeSubscriber,
  RuntimeState,
  RuntimePhase,
} from './types';

export interface ExperienceRuntimeOptions {
  readonly route: string;
  readonly adapters: RuntimeAdapters;
}

export class ExperienceRuntime {
  private snapshot: RuntimeSnapshot;
  private readonly subscribers = new Set<RuntimeSubscriber>();
  private readonly teardowns = new Set<() => void>();
  private releaseCapabilities: (() => void) | null = null;
  private drainingSubscribers = false;
  private destroyed = false;
  // Plan compat: legacy minimal state machine
  private readonly isLegacy: boolean;
  private legacyState: RuntimeState | null = null;

  constructor(options?: ExperienceRuntimeOptions) {
    if (!options) {
      this.isLegacy = true;
      this.legacyState = { phase: 'Booting', muted: false };
      this.snapshot = createInitialRuntimeState('/');
      // Align snapshot for legacy mapping
      return;
    }
    this.isLegacy = false;
    this.options = options;
    this.snapshot = createInitialRuntimeState(options.route);
  }
  private declare options: ExperienceRuntimeOptions;

  boot(): void {
    if (this.isLegacy) {
      if (this.legacyState && this.legacyState.phase === 'Booting') {
        this.legacyState.phase = 'Loading';
      }
      return;
    }
    if (this.destroyed || this.snapshot.phase !== 'idle') return;

    this.dispatch({ type: 'BOOT' });
    if (this.getSnapshot().phase !== 'booting') return;

    try {
      const capabilities = readCapabilityFlags(this.options.adapters.capabilities);
      const soundPreference = this.options.adapters.preferences.readSoundPreference();
      this.dispatch({ type: 'CAPABILITIES_RESOLVED', capabilities, soundPreference });
      if (this.getSnapshot().phase !== 'loading') return;

      this.releaseCapabilities = this.options.adapters.capabilities.subscribe(() => {
        this.refreshCapabilities();
      });
    } catch {
      this.dispatch({
        type: 'DEGRADE',
        error: {
          code: 'boot',
          message: 'The enhanced experience could not be initialized.',
        },
      });
    }
  }

  public getState(): RuntimeState {
    if (this.isLegacy && this.legacyState) {
      return { ...this.legacyState };
    }
    // Map advanced snapshot to plan's minimal RuntimeState
    const phase = this.snapshot.phase;
    const entryMode = this.snapshot.entryMode;
    let mapped: RuntimePhase;
    if (phase === 'idle' || phase === 'booting') mapped = 'Booting';
    else if (phase === 'loading') mapped = 'Loading';
    else if (phase === 'entry-gate') mapped = 'EntryGate';
    else if (phase === 'active' || phase === 'index-open' || phase === 'navigating') {
      mapped = entryMode === 'sound' ? 'ActiveSound' : entryMode === 'silent' ? 'ActiveSilent' : 'EntryGate';
    } else if (phase === 'degraded' || phase === 'destroyed') mapped = 'Degraded';
    else mapped = 'Booting';
    const muted = this.snapshot.audioState === 'muted';
    return { phase: mapped, muted };
  }

  public assetsLoaded(): void {
    if (this.isLegacy) {
      if (this.legacyState && this.legacyState.phase === 'Loading') {
        this.legacyState.phase = 'EntryGate';
      }
      return;
    }
    this.completeLoading();
  }

  completeLoading(): void {
    this.dispatch({ type: 'LOAD_COMPLETE' });
  }

  enter(mode: 'sound' | 'silent'): void {
    if (this.isLegacy) {
      if (this.legacyState && this.legacyState.phase === 'EntryGate') {
        this.legacyState.phase = mode === 'sound' ? 'ActiveSound' : 'ActiveSilent';
      }
      return;
    }
    const previous = this.snapshot;
    this.dispatch({ type: 'ENTER', mode });
    if (this.snapshot !== previous && this.snapshot.entryMode === mode) {
      this.options.adapters.preferences.writeSoundPreference(mode);
    }
  }

  prepareNavigation(target: string): void {
    this.dispatch({ type: 'PREPARE_NAVIGATION', target });
  }

  commitNavigation(): void {
    this.dispatch({ type: 'COMMIT_NAVIGATION' });
  }

  setRoute(route: string): void {
    this.dispatch({ type: 'SET_ROUTE', route });
  }

  setIndexOpen(open: boolean): void {
    this.dispatch({ type: 'SET_INDEX_OPEN', open });
  }

  setMuted(muted: boolean): void {
    this.dispatch({ type: 'SET_MUTED', muted });
  }

  /** Applied by the adaptive quality controller from measured frame evidence. */
  setQualityTier(tier: QualityTier): void {
    this.dispatch({ type: 'SET_QUALITY_TIER', tier });
  }

  degrade(error: RecoverableRuntimeError): void {
    this.dispatch({ type: 'DEGRADE', error });
  }

  subscribe(subscriber: RuntimeSubscriber): () => void {
    if (this.destroyed) return () => undefined;
    this.subscribers.add(subscriber);
    let subscribed = true;
    return () => {
      if (!subscribed) return;
      subscribed = false;
      this.subscribers.delete(subscriber);
    };
  }

  registerTeardown(teardown: () => void): () => void {
    if (this.destroyed) {
      this.runTeardown(teardown);
      return () => undefined;
    }

    let registered = true;
    const release = () => {
      if (!registered) return;
      registered = false;
      this.teardowns.delete(release);
      this.runTeardown(teardown);
    };
    this.teardowns.add(release);
    return release;
  }

  getSnapshot(): RuntimeSnapshot {
    return this.snapshot;
  }

  destroy(): void {
    if (this.destroyed) return;
    this.runTeardown(this.releaseCapabilities);
    this.releaseCapabilities = null;
    for (const release of [...this.teardowns]) release();
    this.dispatch({ type: 'DESTROY' });
    this.destroyed = true;
    if (!this.drainingSubscribers) this.subscribers.clear();
  }

  private refreshCapabilities(): void {
    try {
      this.dispatch({
        type: 'CAPABILITIES_CHANGED',
        capabilities: readCapabilityFlags(this.options.adapters.capabilities),
      });
    } catch {
      this.dispatch({
        type: 'DEGRADE',
        error: {
          code: 'capability-refresh',
          message: 'Updated device capabilities could not be read.',
        },
      });
    }
  }

  private runTeardown(teardown: (() => void) | null): void {
    if (!teardown) return;
    try {
      teardown();
    } catch {
      // Teardown is best-effort so one external owner cannot block later cleanup.
    }
  }

  private dispatch(event: RuntimeEvent): void {
    if (this.destroyed) return;
    const next = reduceRuntimeState(this.snapshot, event);
    if (next === this.snapshot) return;
    this.snapshot = next;
    if (this.drainingSubscribers) return;

    this.drainingSubscribers = true;
    const subscribersAtDrainStart = [...this.subscribers];

    // One bounded pass: nested dispatches only replace the authoritative snapshot,
    // so each starting subscriber sees the newest state and runs at most once.
    try {
      for (const subscriber of subscribersAtDrainStart) {
        if (!this.subscribers.has(subscriber)) continue;
        try {
          subscriber(this.snapshot);
        } catch {
          this.subscribers.delete(subscriber);
          this.dispatch({
            type: 'DEGRADE',
            error: {
              code: 'subscriber',
              message: 'A runtime state subscriber failed and was disconnected.',
            },
          });
        }
      }
    } finally {
      this.drainingSubscribers = false;
      if (this.destroyed) this.subscribers.clear();
    }
  }
}
