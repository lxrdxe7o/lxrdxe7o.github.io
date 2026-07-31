import type { AssetDescriptor } from '../assets/types';
import type { RuntimeSnapshot } from '../core/types';
import type { TransitionController } from '../transitions/TransitionController';
import type { NavigationCause } from '../transitions/transition-presets';
import type { FocusManager } from './focus-manager';
import type { HistoryState } from './history-state';

export type NavigationPhase =
  | 'idle'
  | 'request'
  | 'outgoing'
  | 'prepare'
  | 'swap'
  | 'incoming'
  | 'settle'
  | 'cancelled';

export interface NavigationRuntimeBridge {
  getSnapshot(): RuntimeSnapshot;
  prepareNavigation(target: string): void;
  commitNavigation(): void;
  setRoute(route: string): void;
  setIndexOpen(open: boolean): void;
}

export interface NavigationAssetBridge {
  loadScope(
    scope: string,
    descriptors: readonly AssetDescriptor[],
    signal: AbortSignal,
  ): Promise<unknown>;
  releaseScope(scope: string): void;
}

export interface NavigationScrollBridge {
  rememberRoute(route: string): void;
  restoreRoute(route: string, hash?: string): void;
  applyPolicy(): unknown;
}

export interface NavigationAudioBridge {
  crossfadeRoute(route: string): void;
}

export interface NavigationControllerOptions {
  readonly runtime: NavigationRuntimeBridge;
  readonly transitions: TransitionController;
  readonly focus: FocusManager;
  readonly history: HistoryState;
  readonly assets?: NavigationAssetBridge;
  readonly scroll?: NavigationScrollBridge;
  readonly audio?: NavigationAudioBridge;
  readonly resolveAssets: (route: string) => readonly AssetDescriptor[];
  readonly resolveScope: (route: string) => string;
  readonly readDocumentTitle: () => string;
}

interface ActiveNavigation {
  readonly from: string;
  readonly to: string;
  readonly cause: NavigationCause;
  readonly controller: AbortController;
}

/**
 * Sequences one route change: request, outgoing, prepare, swap, incoming,
 * settle. Astro owns document replacement; this owns everything around it and
 * guarantees that an interrupted navigation always leaves a usable page.
 */
export class NavigationController {
  private phase: NavigationPhase = 'idle';
  private active: ActiveNavigation | null = null;
  private destroyed = false;

  constructor(private readonly options: NavigationControllerOptions) {}

  getPhase(): NavigationPhase {
    return this.phase;
  }

  get pendingTarget(): string | null {
    return this.active?.to ?? null;
  }

  /**
   * Starts a navigation. A duplicate request for the destination already in
   * flight is ignored; a request for a different destination supersedes it.
   */
  async begin(to: string, cause: NavigationCause = 'link'): Promise<boolean> {
    if (this.destroyed) return false;

    const from = this.options.runtime.getSnapshot().route;
    if (this.active) {
      if (this.active.to === to) return false;
      this.cancel();
    }

    const controller = new AbortController();
    this.active = { from, to, cause, controller };
    this.phase = 'request';

    this.options.runtime.setIndexOpen(false);
    this.options.runtime.prepareNavigation(to);
    this.options.scroll?.rememberRoute(from);
    this.options.history.rememberScroll(0);
    if (cause !== 'history') this.options.history.claimForwardKey();

    const snapshot = this.options.runtime.getSnapshot();
    this.options.transitions.plan({
      fromRoute: from,
      toRoute: to,
      cause,
      qualityTier: snapshot.qualityTier,
      reducedMotion: snapshot.capabilities.reducedMotion,
    });

    this.phase = 'outgoing';
    await this.options.transitions.runOutgoing(from, to);
    if (this.isStale(controller)) return false;

    this.phase = 'prepare';
    await this.prepareAssets(to, controller.signal);
    return !this.isStale(controller);
  }

  /**
   * First page load: adopt the route without moving focus or replaying a
   * transition. Only client-side navigation should relocate focus.
   */
  adoptInitialRoute(route: string): void {
    if (this.destroyed) return;
    this.options.runtime.setRoute(route);
    this.options.audio?.crossfadeRoute(route);
    this.phase = 'idle';
  }

  /** Called at Astro's swap boundary. */
  beginSwap(): void {
    if (this.destroyed || !this.active) return;
    this.phase = 'swap';
    this.options.transitions.beginSwap();
  }

  /**
   * Called once the new document is live. Commits runtime state, restores
   * scroll, moves focus to the new heading and plays the incoming animation.
   */
  async complete(route: string, hash = ''): Promise<void> {
    if (this.destroyed) return;
    const controller = this.active?.controller;

    this.options.runtime.setRoute(route);
    this.options.runtime.commitNavigation();
    this.options.transitions.endSwap();

    if (this.active) this.options.assets?.releaseScope(this.options.resolveScope(this.active.from));
    this.options.scroll?.restoreRoute(route, hash);
    this.options.scroll?.applyPolicy();
    this.options.audio?.crossfadeRoute(route);
    this.options.focus.focusRouteHeading(this.options.readDocumentTitle());

    this.phase = 'incoming';
    await this.options.transitions.runIncoming();

    if (controller && this.active?.controller !== controller) return;

    this.phase = 'settle';
    await this.options.transitions.settle();
    this.active = null;
    this.phase = 'idle';
  }

  /** Aborts in-flight work and fast-forwards visuals to a settled state. */
  cancel(): void {
    const active = this.active;
    this.active = null;
    if (!active) {
      this.phase = 'idle';
      return;
    }

    active.controller.abort();
    this.options.transitions.cancel();
    this.phase = 'cancelled';
  }

  /** Recovers from a failed preparation or swap without stranding the visitor. */
  fail(route: string): void {
    this.cancel();
    this.options.runtime.setRoute(route);
    this.options.runtime.commitNavigation();
    this.options.focus.focusRouteHeading();
    this.phase = 'idle';
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.active?.controller.abort();
    this.active = null;
    this.phase = 'idle';
  }

  private async prepareAssets(route: string, signal: AbortSignal): Promise<void> {
    const assets = this.options.assets;
    if (!assets) return;
    const descriptors = this.options.resolveAssets(route);
    if (descriptors.length === 0) return;

    try {
      await assets.loadScope(this.options.resolveScope(route), descriptors, signal);
    } catch {
      // Route assets are enhancements: the document still swaps without them.
    }
  }

  private isStale(controller: AbortController): boolean {
    return (
      this.destroyed ||
      controller.signal.aborted ||
      this.active?.controller !== controller
    );
  }
}
