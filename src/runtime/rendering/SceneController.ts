import type { ResourceScope, ResourceTracker } from './ResourceTracker';
import type {
  Frame,
  PointerPosition,
  RendererBackend,
  SceneFactory,
  ScenePreparationManifest,
  SceneState,
  Viewport,
} from './types';

export interface SceneControllerOptions {
  readonly tracker: ResourceTracker;
  readonly createScene: SceneFactory;
}

interface ActiveScene {
  readonly key: string;
  readonly scope: ResourceScope;
  readonly scene: SceneState;
}

export class SceneController {
  private current: ActiveScene | null = null;
  private viewport: Viewport = Object.freeze({ width: 1, height: 1, dpr: 1 });
  private pointer: PointerPosition = Object.freeze({ x: 0, y: 0 });
  private operation: Promise<void> = Promise.resolve();
  private requestedGeneration = 0;
  private scopeSequence = 0;
  private destroyed = false;

  constructor(private readonly options: SceneControllerOptions) {}

  activate(manifest: ScenePreparationManifest): Promise<void> {
    if (this.destroyed) return Promise.resolve();
    const key = [
      manifest.route,
      manifest.qualityTier,
      manifest.reducedMotion ? 'reduced' : 'full',
      manifest.particleCount,
      manifest.particleFingerprint,
    ].join(':');
    if (this.current?.key === key) return this.operation;

    const generation = ++this.requestedGeneration;
    const task = this.operation.then(async () => {
      if (this.destroyed || generation !== this.requestedGeneration) return;
      const scope = this.options.tracker.createScope(
        `scene:${++this.scopeSequence}:${manifest.route}`,
      );
      let candidate: SceneState | null = null;
      try {
        candidate = this.options.createScene({
          manifest,
          scope,
          tracker: this.options.tracker,
        });
        await candidate.prepare(manifest);
        if (this.destroyed || generation !== this.requestedGeneration) {
          candidate.dispose();
          scope.release();
          return;
        }
        candidate.resize(this.viewport);
        candidate.setPointer(this.pointer);
      } catch (error) {
        candidate?.dispose();
        scope.release();
        throw error;
      }

      if (!candidate) {
        scope.release();
        throw new Error('Scene factory did not return a scene.');
      }
      if (this.destroyed || generation !== this.requestedGeneration) {
        candidate.dispose();
        scope.release();
        return;
      }

      const previous = this.current;
      try {
        await previous?.scene.exit(candidate);
        if (this.destroyed || generation !== this.requestedGeneration) {
          candidate.dispose();
          scope.release();
          return;
        }
        await candidate.enter(previous?.scene ?? null);
        if (this.destroyed || generation !== this.requestedGeneration) {
          candidate.dispose();
          scope.release();
          return;
        }
      } catch (error) {
        candidate.dispose();
        scope.release();
        throw error;
      }
      this.current = { key, scope, scene: candidate };
      if (previous) this.disposeScene(previous);
    });
    this.operation = task.catch(() => undefined);
    return task;
  }

  update(frame: Frame): void {
    this.current?.scene.update(frame);
  }

  render(renderer: RendererBackend): void {
    const state = this.current?.scene.getRenderState();
    if (state) renderer.render(state.scene, state.camera);
  }

  resize(viewport: Viewport): void {
    this.viewport = Object.freeze({ ...viewport });
    this.current?.scene.resize(this.viewport);
  }

  setPointer(position: PointerPosition): void {
    this.pointer = Object.freeze({
      x: Math.max(-1, Math.min(1, position.x)),
      y: Math.max(-1, Math.min(1, position.y)),
    });
    this.current?.scene.setPointer(this.pointer);
  }

  settled(): Promise<void> {
    return this.operation;
  }

  async dispose(): Promise<void> {
    if (!this.destroyed) {
      this.destroyed = true;
      this.requestedGeneration += 1;
    }
    await this.operation;
    if (this.current) this.disposeScene(this.current);
    this.current = null;
  }

  private disposeScene(active: ActiveScene): void {
    try {
      active.scene.dispose();
    } finally {
      active.scope.release();
    }
  }
}
