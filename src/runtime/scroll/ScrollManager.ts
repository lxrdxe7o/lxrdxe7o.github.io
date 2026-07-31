import {
  decideScrollMode,
  type ScrollDecision,
  type ScrollMode,
  type ScrollPolicyInput,
} from './scroll-policy';
import {
  INITIAL_SCROLL,
  ScrollPositionMemory,
  ScrollState,
  type ScrollSection,
  type ScrollSnapshot,
} from './scroll-state';

/** The minimal surface used from a smooth-scroll library such as Lenis. */
export interface SmoothScrollInstance {
  raf(time: number): void;
  scrollTo(target: number | string, options?: { immediate?: boolean }): void;
  stop(): void;
  start(): void;
  destroy(): void;
}

export interface ScrollEnvironment {
  now(): number;
  readPosition(): number;
  readScrollableDistance(): number;
  readSections(): readonly ScrollSection[];
  scrollToPosition(position: number, smooth: boolean): void;
  resolveAnchorPosition(hash: string): number | null;
  onScroll(listener: () => void): () => void;
  setScrollLocked(locked: boolean): void;
}

export interface ScrollManagerOptions {
  readonly environment: ScrollEnvironment;
  /** Live policy inputs, re-read whenever the runtime state changes. */
  readonly readPolicyInput: () => ScrollPolicyInput;
  /** Returns null when smooth scrolling is unavailable or disallowed. */
  readonly createSmoothScroll?: () => SmoothScrollInstance | null;
}

export type ScrollSubscriber = (snapshot: ScrollSnapshot) => void;

/**
 * Owns scroll observation and the conditional smooth-scroll enhancement.
 * Native scrolling always keeps working: the smooth instance is created only
 * while the policy allows it and is destroyed the moment it does not.
 */
export class ScrollManager {
  private readonly state = new ScrollState();
  private readonly memory = new ScrollPositionMemory();
  private readonly subscribers = new Set<ScrollSubscriber>();
  private releaseScroll: (() => void) | null = null;
  private smooth: SmoothScrollInstance | null = null;
  private decision: ScrollDecision = { mode: 'native', reason: 'not-started' };
  private restoring = false;
  private started = false;
  private destroyed = false;

  constructor(private readonly options: ScrollManagerOptions) {}

  start(): void {
    if (this.started || this.destroyed) return;
    this.started = true;
    this.releaseScroll = this.options.environment.onScroll(() => this.handleScroll());
    this.applyPolicy();
    this.handleScroll();
  }

  get mode(): ScrollMode {
    return this.decision.mode;
  }

  get policyReason(): string {
    return this.decision.reason;
  }

  /** Re-evaluates eligibility; safe to call on every runtime state change. */
  applyPolicy(): ScrollDecision {
    if (this.destroyed) return this.decision;
    const next = decideScrollMode(this.options.readPolicyInput());
    if (next.mode === this.decision.mode && next.reason === this.decision.reason) {
      return this.decision;
    }
    this.decision = next;

    if (next.mode === 'smooth') this.enableSmooth();
    else this.disableSmooth();
    return this.decision;
  }

  /** Driven by the single render loop; a no-op in native mode. */
  tick(time = this.options.environment.now()): void {
    if (this.destroyed) return;
    this.smooth?.raf(time);
  }

  subscribe(subscriber: ScrollSubscriber): () => void {
    if (this.destroyed) return () => undefined;
    this.subscribers.add(subscriber);
    let active = true;
    return () => {
      if (!active) return;
      active = false;
      this.subscribers.delete(subscriber);
    };
  }

  getSnapshot(): ScrollSnapshot {
    return this.state.read();
  }

  setScrollLocked(locked: boolean): void {
    this.options.environment.setScrollLocked(locked);
    if (locked) this.smooth?.stop();
    else this.smooth?.start();
    this.applyPolicy();
  }

  rememberRoute(route: string): void {
    this.memory.remember(route, this.options.environment.readPosition());
  }

  /**
   * Restores a remembered position, or lands on the hash target, or returns to
   * the top for a fresh route. Restoration is always immediate so focus and
   * transitions are not fighting an animation.
   */
  restoreRoute(route: string, hash = ''): void {
    if (this.destroyed) return;
    this.restoring = true;
    try {
      if (hash) {
        const anchor = this.options.environment.resolveAnchorPosition(hash);
        if (anchor !== null) {
          this.options.environment.scrollToPosition(anchor, false);
          this.smooth?.scrollTo(anchor, { immediate: true });
          return;
        }
      }
      const remembered = this.memory.recall(route);
      const target = remembered ?? 0;
      this.options.environment.scrollToPosition(target, false);
      this.smooth?.scrollTo(target, { immediate: true });
    } finally {
      this.handleScroll();
      this.restoring = false;
    }
  }

  forgetRoute(route: string): void {
    this.memory.forget(route);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.started = false;
    this.disableSmooth();
    if (this.releaseScroll) {
      try {
        this.releaseScroll();
      } catch {
        // Detachment is best-effort during teardown.
      }
      this.releaseScroll = null;
    }
    this.subscribers.clear();
    this.memory.clear();
    this.state.reset();
  }

  private enableSmooth(): void {
    if (this.smooth || !this.options.createSmoothScroll) return;
    try {
      this.smooth = this.options.createSmoothScroll();
    } catch {
      // Falling back to native scrolling is always acceptable.
      this.smooth = null;
      this.decision = { mode: 'native', reason: 'smooth-scroll-failed' };
    }
  }

  private disableSmooth(): void {
    const instance = this.smooth;
    this.smooth = null;
    if (!instance) return;
    try {
      instance.destroy();
    } catch {
      // The native scroller remains authoritative regardless.
    }
  }

  private handleScroll(): void {
    if (this.destroyed) return;
    const environment = this.options.environment;
    const snapshot = this.state.sample({
      position: environment.readPosition(),
      scrollableDistance: environment.readScrollableDistance(),
      time: environment.now(),
      sections: environment.readSections(),
      restoring: this.restoring,
    });

    for (const subscriber of [...this.subscribers]) {
      try {
        subscriber(snapshot);
      } catch {
        this.subscribers.delete(subscriber);
      }
    }
  }
}

export { INITIAL_SCROLL };

/** Browser implementation. Only constructed in the client bootstrap. */
export function createBrowserScrollEnvironment(
  readSections: () => readonly ScrollSection[] = () => [],
): ScrollEnvironment {
  return {
    now: () => performance.now(),
    readPosition: () => window.scrollY,
    readScrollableDistance: () =>
      Math.max(0, document.documentElement.scrollHeight - window.innerHeight),
    readSections,
    scrollToPosition: (position, smooth) => {
      window.scrollTo({ top: position, behavior: smooth ? 'smooth' : 'auto' });
    },
    resolveAnchorPosition: (hash) => {
      const id = hash.startsWith('#') ? hash.slice(1) : hash;
      if (!id) return null;
      const target = document.getElementById(id);
      if (!target) return null;
      return target.getBoundingClientRect().top + window.scrollY;
    },
    onScroll: (listener) => {
      window.addEventListener('scroll', listener, { passive: true });
      return () => window.removeEventListener('scroll', listener);
    },
    setScrollLocked: (locked) => {
      document.documentElement.toggleAttribute('data-scroll-locked', locked);
    },
  };
}
