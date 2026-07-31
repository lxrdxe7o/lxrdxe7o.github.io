import { BaseScene } from './BaseScene';
import type { ResourceScope } from '../ResourceTracker';
import type {
  Frame,
  PointerPosition,
  ScenePreparationManifest,
  SceneState,
  Viewport,
} from '../types';

export class StaticScene extends BaseScene {
  private elapsed = 0;
  private fingerprint = '';
  private enteredFrom: string | null = null;
  private nextScene: string | null = null;

  constructor(scope: ResourceScope, route: string) {
    super(`static:${route}`, scope);
  }

  getRenderState(): null {
    return null;
  }

  protected onPrepare(manifest: ScenePreparationManifest): void {
    this.fingerprint = manifest.particleFingerprint;
  }

  protected onEnter(previous: SceneState | null): void {
    this.enteredFrom = previous?.id ?? null;
  }

  protected onUpdate(frame: Frame): void {
    this.elapsed = frame.elapsed;
  }

  protected onResize(viewport: Viewport): void {
    this.viewport = Object.freeze({ ...viewport, dpr: 1 });
  }

  protected onPointer(position: PointerPosition): void {
    this.pointer = Object.freeze({ ...position });
  }

  protected onExit(next: SceneState | null): void {
    this.nextScene = next?.id ?? null;
  }

  protected onDispose(): void {
    this.elapsed = 0;
    this.fingerprint = '';
    this.enteredFrom = null;
    this.nextScene = null;
  }
}
