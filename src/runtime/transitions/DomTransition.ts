import type { TransitionPreset } from './transition-presets';

export interface AnimationTarget {
  readonly style: { setProperty(name: string, value: string): void };
}

export interface AnimationHandle {
  finished: Promise<void>;
  cancel(): void;
  /** Jumps to the end state; used when a transition must not be seen again. */
  complete(): void;
}

export type DomAnimator = (
  target: AnimationTarget,
  keyframes: Record<string, readonly (string | number)[]>,
  options: { duration: number; easing: string },
) => AnimationHandle;

/**
 * Transform and opacity only: no layout-affecting properties are animated, so
 * a route change never triggers reflow mid-transition.
 */
export class DomTransition {
  private active: AnimationHandle | null = null;

  constructor(private readonly animate: DomAnimator) {}

  async playOutgoing(target: AnimationTarget, preset: TransitionPreset): Promise<void> {
    return this.run(target, {
      opacity: [1, 0],
      transform: ['translate3d(0, 0, 0)', `translate3d(0, ${preset.translatePx}px, 0)`],
    }, preset.outgoingMs);
  }

  async playIncoming(target: AnimationTarget, preset: TransitionPreset): Promise<void> {
    return this.run(target, {
      opacity: [0, 1],
      transform: [`translate3d(0, ${-preset.translatePx}px, 0)`, 'translate3d(0, 0, 0)'],
    }, preset.incomingMs);
  }

  /** Cancels any in-flight animation and leaves the element fully visible. */
  settle(target: AnimationTarget): void {
    this.active?.complete();
    this.active = null;
    target.style.setProperty('opacity', '1');
    target.style.setProperty('transform', 'none');
  }

  cancel(): void {
    this.active?.cancel();
    this.active = null;
  }

  private async run(
    target: AnimationTarget,
    keyframes: Record<string, readonly (string | number)[]>,
    duration: number,
  ): Promise<void> {
    this.active?.cancel();
    if (duration <= 0) {
      this.active = null;
      return;
    }

    const handle = this.animate(target, keyframes, {
      duration: duration / 1000,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    });
    this.active = handle;

    try {
      await handle.finished;
    } catch {
      // A cancelled animation is an expected interruption, not an error.
    } finally {
      if (this.active === handle) this.active = null;
    }
  }
}

/**
 * Adapts Motion's `animate` to the internal handle shape. Imported lazily by
 * the bootstrap so Motion never loads during SSR or in Node tests.
 */
export function createMotionAnimator(
  animateFn: (
    target: unknown,
    keyframes: Record<string, unknown>,
    options: Record<string, unknown>,
  ) => {
    finished: Promise<unknown>;
    stop?: () => void;
    cancel?: () => void;
    complete?: () => void;
  },
): DomAnimator {
  return (target, keyframes, options) => {
    const animation = animateFn(target, keyframes as Record<string, unknown>, {
      duration: options.duration,
      ease: options.easing,
    });
    return {
      finished: animation.finished.then(() => undefined),
      cancel: () => {
        animation.stop?.();
        animation.cancel?.();
      },
      complete: () => animation.complete?.(),
    };
  };
}

/** Deterministic animator used by tests and by the no-Motion fallback path. */
export function createImmediateAnimator(): DomAnimator {
  return (target, keyframes) => {
    for (const [property, frames] of Object.entries(keyframes)) {
      const last = frames[frames.length - 1];
      if (last !== undefined) target.style.setProperty(property, String(last));
    }
    return {
      finished: Promise.resolve(),
      cancel: () => undefined,
      complete: () => undefined,
    };
  };
}
