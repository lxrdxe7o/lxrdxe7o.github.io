import type { TransitionPreset } from './transition-presets';

/**
 * Implemented by the scene controller. The renderer owns exactly one canvas
 * and one context, so a transition never creates a second renderer: it drives
 * a blend factor that the outgoing and incoming scene states both read.
 */
export interface SceneBlendTarget {
  /** Retains the outgoing scene so it can be blended out. Returns false when unsupported. */
  beginBlend(fromRoute: string, toRoute: string): boolean;
  /** 0 = outgoing fully visible, 1 = incoming fully visible. */
  setBlendProgress(progress: number): void;
  /** Releases the retained outgoing scene and its resources. */
  endBlend(): void;
}

export interface BlendClock {
  now(): number;
  requestFrame(callback: (time: number) => void): number;
  cancelFrame(handle: number): void;
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/**
 * Blends the persistent canvas between two route scene states. Only medium and
 * high tiers request a blend; everything else switches instantly so a
 * constrained device never renders two scenes at once.
 */
export class RenderTransition {
  private frameHandle: number | null = null;
  private blending = false;
  private cancelled = false;

  constructor(
    private readonly target: SceneBlendTarget,
    private readonly clock: BlendClock,
  ) {}

  get isBlending(): boolean {
    return this.blending;
  }

  async play(
    fromRoute: string,
    toRoute: string,
    preset: TransitionPreset,
  ): Promise<void> {
    if (!preset.blendScene || preset.blendMs <= 0) return;

    this.cancelled = false;
    if (!this.target.beginBlend(fromRoute, toRoute)) return;

    this.blending = true;
    const start = this.clock.now();

    try {
      await new Promise<void>((resolve) => {
        const step = (time: number) => {
          if (this.cancelled) {
            resolve();
            return;
          }
          const elapsed = Math.max(0, time - start);
          const progress = Math.min(1, elapsed / preset.blendMs);
          this.target.setBlendProgress(easeInOut(progress));

          if (progress >= 1) {
            resolve();
            return;
          }
          this.frameHandle = this.clock.requestFrame(step);
        };
        this.frameHandle = this.clock.requestFrame(step);
      });
    } finally {
      this.finish();
    }
  }

  /** Fast-forwards to the incoming scene; used on interruption and errors. */
  cancel(): void {
    if (!this.blending) return;
    this.cancelled = true;
    if (this.frameHandle !== null) {
      this.clock.cancelFrame(this.frameHandle);
      this.frameHandle = null;
    }
    this.target.setBlendProgress(1);
    this.finish();
  }

  private finish(): void {
    if (this.frameHandle !== null) {
      this.clock.cancelFrame(this.frameHandle);
      this.frameHandle = null;
    }
    if (!this.blending) return;
    this.blending = false;
    this.target.setBlendProgress(1);
    this.target.endBlend();
  }
}

/** No-op blend target for static mode and environments without WebGL. */
export function createInertBlendTarget(): SceneBlendTarget {
  return {
    beginBlend: () => false,
    setBlendProgress: () => undefined,
    endBlend: () => undefined,
  };
}
