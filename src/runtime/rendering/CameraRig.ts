import { PerspectiveCamera, Vector2 } from 'three';

import type { Frame, PointerPosition, Viewport } from './types';

export interface CameraRigOptions {
  readonly fieldOfView?: number;
  readonly near?: number;
  readonly far?: number;
  readonly depth?: number;
  readonly parallax?: number;
  readonly reducedMotion?: boolean;
}

export class CameraRig {
  readonly camera: PerspectiveCamera;
  private readonly target = new Vector2();
  private readonly current = new Vector2();
  private readonly depth: number;
  private readonly parallax: number;
  private reducedMotion: boolean;

  constructor(options: CameraRigOptions = {}) {
    this.depth = options.depth ?? 6.5;
    this.parallax = options.parallax ?? 0.24;
    this.reducedMotion = options.reducedMotion ?? false;
    this.camera = new PerspectiveCamera(
      options.fieldOfView ?? 42,
      1,
      options.near ?? 0.1,
      options.far ?? 80,
    );
    this.camera.position.set(0, 0, this.depth);
    this.camera.lookAt(0, 0, 0);
  }

  setPointer(position: PointerPosition): void {
    if (this.reducedMotion) {
      this.target.set(0, 0);
      return;
    }
    this.target.set(
      Math.max(-1, Math.min(1, position.x)),
      Math.max(-1, Math.min(1, position.y)),
    );
  }

  setReducedMotion(reducedMotion: boolean): void {
    this.reducedMotion = reducedMotion;
    if (reducedMotion) this.target.set(0, 0);
  }

  update(frame: Frame): void {
    const response = frame.delta === 0 ? 0 : 1 - Math.exp(-frame.delta * 4.8);
    this.current.lerp(this.target, response);
    this.camera.position.x = this.current.x * this.parallax;
    this.camera.position.y = this.current.y * this.parallax * 0.72;
    this.camera.position.z = this.depth;
    this.camera.lookAt(0, 0, 0);
    this.camera.updateMatrixWorld();
  }

  resize(viewport: Viewport): void {
    this.camera.aspect = viewport.width / Math.max(1, viewport.height);
    this.camera.updateProjectionMatrix();
  }

  reset(): void {
    this.target.set(0, 0);
    this.current.set(0, 0);
    this.camera.position.set(0, 0, this.depth);
    this.camera.lookAt(0, 0, 0);
    this.camera.updateMatrixWorld();
  }
}
