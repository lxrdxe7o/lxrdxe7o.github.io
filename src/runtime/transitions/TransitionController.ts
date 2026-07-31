import { DomTransition, type AnimationTarget, type DomAnimator } from './DomTransition';
import { RenderTransition, type BlendClock, type SceneBlendTarget } from './RenderTransition';
import {
  resolveTransitionPreset,
  type TransitionPreset,
  type TransitionPresetInput,
} from './transition-presets';

export interface TransitionControllerOptions {
  readonly animator: DomAnimator;
  readonly blendTarget: SceneBlendTarget;
  readonly clock: BlendClock;
  /** Resolves the element that carries route content, re-read after each swap. */
  readonly resolveContentTarget: () => AnimationTarget | null;
  /** Toggles pointer-events during the shortest possible swap window. */
  readonly setInteractionBlocked: (blocked: boolean) => void;
}

/**
 * Coordinates DOM choreography with the persistent canvas so a route change
 * reads as one continuous movement rather than two unrelated animations.
 */
export class TransitionController {
  private readonly dom: DomTransition;
  private readonly render: RenderTransition;
  private preset: TransitionPreset | null = null;
  private blendPromise: Promise<void> | null = null;
  private destroyed = false;

  constructor(private readonly options: TransitionControllerOptions) {
    this.dom = new DomTransition(options.animator);
    this.render = new RenderTransition(options.blendTarget, options.clock);
  }

  get activePreset(): TransitionPreset | null {
    return this.preset;
  }

  plan(input: TransitionPresetInput): TransitionPreset {
    this.preset = resolveTransitionPreset(input);
    return this.preset;
  }

  /**
   * Animates the outgoing content and starts the canvas blend. The blend is
   * intentionally not awaited: it continues across the document swap.
   */
  async runOutgoing(fromRoute: string, toRoute: string): Promise<void> {
    if (this.destroyed || !this.preset) return;
    const preset = this.preset;

    this.blendPromise = this.render.play(fromRoute, toRoute, preset).catch(() => undefined);

    const target = this.options.resolveContentTarget();
    if (target) await this.dom.playOutgoing(target, preset);
  }

  /** Blocks interaction only for the swap itself, never for the whole transition. */
  beginSwap(): void {
    if (this.destroyed) return;
    this.options.setInteractionBlocked(true);
  }

  endSwap(): void {
    if (this.destroyed) return;
    this.options.setInteractionBlocked(false);
  }

  async runIncoming(): Promise<void> {
    if (this.destroyed || !this.preset) return;
    const target = this.options.resolveContentTarget();
    if (target) await this.dom.playIncoming(target, this.preset);
  }

  /** Waits for the canvas blend so the scene is settled before the next route. */
  async settle(): Promise<void> {
    const pending = this.blendPromise;
    this.blendPromise = null;
    if (pending) await pending;
    this.preset = null;
  }

  /**
   * Fast-forwards everything to its end state. Used for rapid clicks, history
   * navigation and failures so no visitor is left mid-fade.
   */
  cancel(): void {
    this.render.cancel();
    this.dom.cancel();
    const target = this.options.resolveContentTarget();
    if (target) this.dom.settle(target);
    this.options.setInteractionBlocked(false);
    this.blendPromise = null;
    this.preset = null;
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.render.cancel();
    this.dom.cancel();
    this.options.setInteractionBlocked(false);
    this.blendPromise = null;
    this.preset = null;
  }
}
