import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Points,
  Scene,
} from 'three';

import { CameraRig } from '../../CameraRig';
import {
  createSpatialFieldMaterial,
  type SpatialFieldMaterial,
} from '../../materials/createSpatialFieldMaterial';
import type { ResourceScope } from '../../ResourceTracker';
import { SeededRandom } from '../../SeededRandom';
import type {
  Frame,
  PointerPosition,
  ScenePreparationManifest,
  SceneRenderState,
  SceneState,
  Viewport,
} from '../../types';
import { BaseScene } from '../BaseScene';

/**
 * First Lab experiment: an original seeded field/particle study. It uses the
 * persistent render loop and ResourceTracker exactly like every route scene —
 * Lab never creates a second canvas or renderer. The seed comes from the
 * route manifest, so the same URL params always reproduce the same field.
 */
export class FieldExperiment extends BaseScene {
  private readonly scene = new Scene();
  private readonly cameraRig = new CameraRig();
  private points: Points<BufferGeometry, SpatialFieldMaterial> | null = null;
  private material: SpatialFieldMaterial | null = null;

  constructor(scope: ResourceScope, route: string) {
    super(`experiment:field:${route}`, scope);
    this.scene.background = new Color(0x060408);
  }

  getRenderState(): SceneRenderState {
    return { scene: this.scene, camera: this.cameraRig.camera };
  }

  protected onPrepare(manifest: ScenePreparationManifest): void {
    const random = new SeededRandom(manifest.seed);
    // Lab fields are denser and slower than the home scene: a study, not a
    // background. Quality tiers still bound the particle count.
    const positions = new Float32Array(manifest.particleCount * 3);
    const phases = new Float32Array(manifest.particleCount);
    const scales = new Float32Array(manifest.particleCount);

    for (let index = 0; index < manifest.particleCount; index += 1) {
      const offset = index * 3;
      const depth = random.range(-22, 4);
      const radius = Math.pow(random.next(), 0.6) * (6 + Math.abs(depth) * 0.2);
      const angle = random.range(0, Math.PI * 2);
      positions[offset] = Math.cos(angle) * radius + random.signed(0.2);
      positions[offset + 1] = Math.sin(angle) * radius * 0.55 + random.signed(0.16);
      positions[offset + 2] = depth;
      phases[index] = random.range(0, Math.PI * 2);
      scales[index] = random.range(0.4, 2.4);
    }

    const geometry = this.scope.track(new BufferGeometry(), 'geometry');
    geometry.setAttribute('position', new BufferAttribute(positions, 3));
    geometry.setAttribute('aPhase', new BufferAttribute(phases, 1));
    geometry.setAttribute('aScale', new BufferAttribute(scales, 1));
    geometry.computeBoundingSphere();

    this.material = this.scope.track(createSpatialFieldMaterial(), 'material');
    this.points = new Points(geometry, this.material);
    this.points.frustumCulled = false;
    this.scene.add(this.points);
    this.cameraRig.setReducedMotion(manifest.reducedMotion);
  }

  protected onEnter(previous: SceneState | null): void {
    if (this.material) this.material.uniforms.uIntensity.value = previous ? 0.82 : 0.95;
  }

  protected onUpdate(frame: Frame): void {
    if (!this.material || !this.points) return;
    this.material.uniforms.uTime.value = frame.elapsed;
    const motionScale = this.manifest?.reducedMotion ? 0.12 : 1;
    this.points.rotation.y = frame.elapsed * 0.014 * motionScale;
    this.points.rotation.z = Math.sin(frame.elapsed * 0.05) * 0.02 * motionScale;
    this.cameraRig.update(frame);
  }

  protected onResize(viewport: Viewport): void {
    this.cameraRig.resize(viewport);
  }

  protected onPointer(position: PointerPosition): void {
    this.cameraRig.setPointer(position);
    if (this.material) {
      this.material.uniforms.uPointer.value.x = position.x;
      this.material.uniforms.uPointer.value.y = position.y;
    }
  }

  protected onExit(next: SceneState | null): void {
    if (this.material) this.material.uniforms.uIntensity.value = next ? 0.35 : 0.2;
  }

  protected onDispose(): void {
    if (this.points) this.scene.remove(this.points);
    this.points = null;
    this.material = null;
    this.cameraRig.reset();
    this.scene.clear();
  }
}
