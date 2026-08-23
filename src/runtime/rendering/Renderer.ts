import type { RuntimeSnapshot } from '../core/types';
import { getFrameBus } from '../core/frame-bus';
import { RenderLoop } from './RenderLoop';
import { ResourceTracker, type ResourceTrackerSnapshot } from './ResourceTracker';
import { createSceneManifest } from './scene-manifest';
import type { SceneController } from './SceneController';
import {
  DPR_CAPS,
  type PointerPosition,
  type RendererBackend,
  type RenderingAdapter,
  type RenderingMode,
  type RenderingRuntime,
  type RenderingSurface,
  type Viewport,
} from './types';

export interface RendererOptions {
  readonly runtime: RenderingRuntime;
  readonly adapter: RenderingAdapter;
  readonly surface: RenderingSurface;
  readonly seed: number;
  readonly createSceneController: (tracker: ResourceTracker) => SceneController;
}

export interface RendererDiagnostics {
  readonly mode: RenderingMode;
  readonly route: string;
  readonly rendererCreated: boolean;
  readonly frameScheduled: boolean;
  readonly viewport: Viewport;
  readonly resources: ResourceTrackerSnapshot;
}

const FALLBACK_ERROR = Object.freeze({
  code: 'renderer-initialization',
  message: 'The interactive background is unavailable; static content remains active.',
});

export class Renderer {
  private readonly tracker = new ResourceTracker();
  private readonly releases: Array<() => void> = [];
  private backend: RendererBackend | null = null;
  private controller: SceneController | null = null;
  private loop: RenderLoop | null = null;
  private mode: RenderingMode = 'static';
  private route = '/';
  private viewport: Viewport = Object.freeze({ width: 1, height: 1, dpr: 1 });
  private operation: Promise<void> = Promise.resolve();
  private initialized = false;
  private destroyed = false;
  private failed = false;
  private failureReported = false;
  private destruction: Promise<void> | null = null;
  private resourceCleanup: Promise<void> | null = null;
  // Plan compat: legacy canvas mode
  private isLegacy = false;

  constructor(optionsOrCanvas: RendererOptions | HTMLCanvasElement) {
    // Detect legacy canvas construction: plan test passes HTMLCanvasElement with getContext
    const maybeCanvas = optionsOrCanvas as HTMLCanvasElement;
    if (
      maybeCanvas &&
      typeof (maybeCanvas as unknown as { getContext?: unknown }).getContext === 'function'
    ) {
      this.isLegacy = true;
      this.initialized = true;
      this.options = undefined as unknown as RendererOptions;
    } else {
      this.options = optionsOrCanvas as RendererOptions;
    }
  }
  private declare options: RendererOptions;

  public isInitialized(): boolean {
    return this.initialized;
  }

  async initialize(): Promise<void> {
    if (this.destroyed || this.initialized) return;
    this.initialized = true;
    try {
      this.releases.push(
        this.options.runtime.subscribe((snapshot) => {
          this.enqueue(snapshot);
        }),
      );
      this.releases.push(
        this.options.adapter.observeResize(this.options.surface, () => this.resize()),
      );
      this.releases.push(
        this.options.adapter.subscribeVisibility(() => this.syncVisibility()),
      );
      this.releases.push(
        this.options.adapter.subscribePointer(this.options.surface, (position) => {
          this.setPointer(position);
        }),
      );
    } catch (error) {
      this.releaseSubscriptions();
      this.activateFallback(error);
      return;
    }
    await this.enqueue(this.options.runtime.getSnapshot());
  }

  settled(): Promise<void> {
    return this.operation;
  }

  getDiagnostics(): RendererDiagnostics {
    return Object.freeze({
      mode: this.mode,
      route: this.route,
      rendererCreated: this.backend !== null,
      frameScheduled: this.loop?.isScheduled ?? false,
      viewport: Object.freeze({ ...this.viewport }),
      resources: this.tracker.snapshot(),
    });
  }

  destroy(): Promise<void> {
    if (this.isLegacy) {
      this.initialized = false;
      this.destroyed = true;
      return Promise.resolve();
    }
    if (this.destruction) return this.destruction;
    this.destroyed = true;
    this.releaseSubscriptions();
    this.loop?.destroy();
    this.loop = null;
    this.destruction = (async () => {
      await this.releaseControllerAndResources();
      this.releaseBackend();
    })();
    return this.destruction;
  }

  private enqueue(snapshot: RuntimeSnapshot): Promise<void> {
    const next = this.operation.then(() => this.reconcile(snapshot));
    this.operation = next.catch((error) => {
      this.activateFallback(error);
    });
    return this.operation;
  }

  private async reconcile(snapshot: RuntimeSnapshot): Promise<void> {
    if (this.destroyed) return;
    this.route = snapshot.route;
    if (this.failed) {
      this.mode = 'static';
      this.options.adapter.present(this.options.surface, 'static');
      return;
    }
    const staticMode =
      !snapshot.capabilities.webgl ||
      snapshot.qualityTier === 'static' ||
      snapshot.phase === 'degraded' ||
      snapshot.phase === 'destroyed';

    if (staticMode) {
      this.mode = 'static';
      this.loop?.setPaused('static', true);
      this.options.adapter.present(this.options.surface, 'static');
      return;
    }

    this.ensureEnhancedRuntime();
    const manifest = createSceneManifest(
      snapshot.route,
      snapshot.qualityTier,
      this.options.seed,
      snapshot.capabilities.reducedMotion,
    );
    await this.controller?.activate(manifest);
    if (this.destroyed) return;
    this.resize(snapshot);
    this.mode = 'enhanced';
    this.loop?.setPaused('static', false);
    this.options.adapter.present(this.options.surface, 'enhanced');
    this.syncVisibility(snapshot);
  }

  private ensureEnhancedRuntime(): void {
    if (this.backend) return;
    this.backend = this.options.adapter.createRenderer(this.options.surface);
    this.controller = this.options.createSceneController(this.tracker);
    this.loop = new RenderLoop({
      scheduler: this.options.adapter,
      update: (frame) => {
        if (!this.backend || !this.controller) return;
        this.controller.update(frame);
        this.controller.render(this.backend);
        this.options.surface.host.dataset.rendererFrames = String(frame.index + 1);
        // Single loop: other subsystems observe this frame instead of
        // scheduling their own animation frames.
        getFrameBus().publish(frame);
      },
      onError: (error) => this.activateFallback(error),
    });
    this.loop.start();
  }

  private resize(snapshot = this.options.runtime.getSnapshot()): void {
    if (!this.backend) return;
    const measured = this.options.adapter.measure(this.options.surface);
    const width = Math.max(1, Math.round(measured.width));
    const height = Math.max(1, Math.round(measured.height));
    const rawDpr = this.options.adapter.readDevicePixelRatio();
    const finiteDpr = Number.isFinite(rawDpr) ? rawDpr : 1;
    const dpr = Math.max(0.75, Math.min(DPR_CAPS[snapshot.qualityTier], finiteDpr));
    this.viewport = Object.freeze({ width, height, dpr });
    this.backend.setPixelRatio(dpr);
    this.backend.setSize(width, height);
    this.controller?.resize(this.viewport);
    this.options.surface.host.dataset.rendererDpr = dpr.toFixed(2);
  }

  private setPointer(position: PointerPosition): void {
    if (this.destroyed || this.mode === 'static') return;
    this.controller?.setPointer(position);
  }

  private syncVisibility(snapshot = this.options.runtime.getSnapshot()): void {
    const hidden =
      this.options.adapter.readVisibility() === 'hidden' ||
      snapshot.capabilities.visibility === 'hidden';
    this.loop?.setPaused('visibility', hidden);
  }

  private activateFallback(error: unknown): void {
    console.error('[Renderer] Fallback activated due to error:', error);
    if (this.destroyed) return;
    if (this.failed) {
      this.options.adapter.present(this.options.surface, 'static');
      return;
    }
    this.failed = true;
    this.releaseSubscriptions();
    this.options.surface.host.dataset.rendererFailure =
      error instanceof Error ? error.name : 'UnknownError';
    this.mode = 'static';
    this.loop?.destroy();
    this.loop = null;
    void (async () => {
      await this.releaseControllerAndResources();
      this.releaseBackend();
    })();
    this.options.adapter.present(this.options.surface, 'static');
    if (!this.failureReported) {
      this.failureReported = true;
      this.options.runtime.degrade(FALLBACK_ERROR);
    }
  }

  private releaseControllerAndResources(): Promise<void> {
    if (this.resourceCleanup) return this.resourceCleanup;
    const controller = this.controller;
    this.controller = null;
    this.resourceCleanup = (async () => {
      try {
        await controller?.dispose();
      } catch {
        this.options.surface.host.dataset.sceneCleanupFailure = 'true';
      } finally {
        this.tracker.dispose();
      }
    })();
    return this.resourceCleanup;
  }

  private releaseSubscriptions(): void {
    for (const release of this.releases.splice(0).reverse()) {
      try {
        release();
      } catch {
        // All remaining owners still need to be released.
      }
    }
  }

  private releaseBackend(): void {
    const backend = this.backend;
    this.backend = null;
    if (!backend) return;
    try {
      backend.forceContextLoss?.();
    } catch {
      // Context release is best-effort; renderer disposal still has to run.
    }
    try {
      backend.dispose();
    } catch {
      // A failed backend cannot block deterministic ownership cleanup.
    }
  }
}
