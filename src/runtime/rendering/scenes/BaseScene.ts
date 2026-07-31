import type { ResourceScope } from '../ResourceTracker';
import type {
  Frame,
  PointerPosition,
  ScenePreparationManifest,
  SceneRenderState,
  SceneState,
  Viewport,
} from '../types';

export abstract class BaseScene implements SceneState {
  private prepared = false;
  private active = false;
  private disposed = false;
  protected manifest: ScenePreparationManifest | null = null;
  protected viewport: Viewport = Object.freeze({ width: 1, height: 1, dpr: 1 });
  protected pointer: PointerPosition = Object.freeze({ x: 0, y: 0 });

  protected constructor(
    readonly id: string,
    protected readonly scope: ResourceScope,
  ) {}

  async prepare(manifest: ScenePreparationManifest): Promise<void> {
    this.assertUsable();
    if (this.prepared) throw new Error(`Scene "${this.id}" has already been prepared.`);
    this.manifest = Object.freeze({ ...manifest });
    await this.onPrepare(this.manifest);
    this.prepared = true;
  }

  async enter(previous: SceneState | null): Promise<void> {
    this.assertPrepared();
    if (this.active) return;
    await this.onEnter(previous);
    this.active = true;
  }

  update(frame: Frame): void {
    this.assertPrepared();
    if (!this.active) return;
    this.onUpdate(frame);
  }

  resize(viewport: Viewport): void {
    this.assertUsable();
    this.viewport = Object.freeze({ ...viewport });
    this.onResize(this.viewport);
  }

  setPointer(position: PointerPosition): void {
    this.assertUsable();
    this.pointer = Object.freeze({
      x: Math.max(-1, Math.min(1, position.x)),
      y: Math.max(-1, Math.min(1, position.y)),
    });
    this.onPointer(this.pointer);
  }

  async exit(next: SceneState | null): Promise<void> {
    if (this.disposed || !this.active) return;
    await this.onExit(next);
    this.active = false;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.active = false;
    this.onDispose();
    this.scope.release();
  }

  abstract getRenderState(): SceneRenderState | null;

  protected abstract onPrepare(manifest: ScenePreparationManifest): void | Promise<void>;
  protected abstract onEnter(previous: SceneState | null): void | Promise<void>;
  protected abstract onUpdate(frame: Frame): void;
  protected abstract onResize(viewport: Viewport): void;
  protected abstract onPointer(position: PointerPosition): void;
  protected abstract onExit(next: SceneState | null): void | Promise<void>;
  protected abstract onDispose(): void;

  private assertPrepared(): void {
    this.assertUsable();
    if (!this.prepared) throw new Error(`Scene "${this.id}" is not prepared.`);
  }

  private assertUsable(): void {
    if (this.disposed) throw new Error(`Scene "${this.id}" is disposed.`);
  }
}
