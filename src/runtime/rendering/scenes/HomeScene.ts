import {
  BufferAttribute,
  BufferGeometry,
  Color,
  FogExp2,
  Points,
  Scene,
} from 'three';

import { CameraRig } from '../CameraRig';
import {
  createSpatialFieldMaterial,
  type SpatialFieldMaterial,
} from '../materials/createSpatialFieldMaterial';
import type { ResourceScope } from '../ResourceTracker';
import { SeededRandom } from '../SeededRandom';
import type {
  Frame,
  PointerPosition,
  ScenePreparationManifest,
  SceneRenderState,
  SceneState,
  Viewport,
} from '../types';
import { BaseScene } from './BaseScene';

export class HomeScene extends BaseScene {
  private readonly scene = new Scene();
  private readonly cameraRig = new CameraRig();
  private points: Points<BufferGeometry, SpatialFieldMaterial> | null = null;
  private material: SpatialFieldMaterial | null = null;

  constructor(scope: ResourceScope, route: string) {
    super(`spatial:${route}`, scope);
    this.scene.background = new Color(0x050306);
    this.scene.fog = new FogExp2(0x050306, 0.075);
  }

  getRenderState(): SceneRenderState {
    return { scene: this.scene, camera: this.cameraRig.camera };
  }

  protected onPrepare(manifest: ScenePreparationManifest): void {
    const random = new SeededRandom(manifest.seed);
    const positions = new Float32Array(manifest.particleCount * 3);
    const phases = new Float32Array(manifest.particleCount);
    const scales = new Float32Array(manifest.particleCount);

    for (let index = 0; index < manifest.particleCount; index += 1) {
      const offset = index * 3;
      const depth = random.range(-16, 2.5);
      const radius = Math.pow(random.next(), 0.72) * (4.5 + Math.abs(depth) * 0.16);
      const angle = random.range(0, Math.PI * 2) + depth * 0.08;
      positions[offset] = Math.cos(angle) * radius + random.signed(0.14);
      positions[offset + 1] = Math.sin(angle) * radius * 0.62 + random.signed(0.12);
      positions[offset + 2] = depth;
      phases[index] = random.range(0, Math.PI * 2);
      scales[index] = random.range(0.55, 1.9);
    }

    const geometry = this.scope.track(new BufferGeometry(), 'geometry');
    geometry.setAttribute('position', new BufferAttribute(positions, 3));
    geometry.setAttribute('aPhase', new BufferAttribute(phases, 1));
    geometry.setAttribute('aScale', new BufferAttribute(scales, 1));
    geometry.computeBoundingSphere();

    this.material = this.scope.track(createSpatialFieldMaterial(), 'material');
    this.points = new Points(geometry, this.material);
    this.points.frustumCulled = false;
    this.points.rotation.z = -0.08;
    this.scene.add(this.points);
    this.cameraRig.setReducedMotion(manifest.reducedMotion);
  }

  protected onEnter(previous: SceneState | null): void {
    if (this.material) this.material.uniforms.uIntensity.value = previous ? 0.78 : 0.9;
  }

  protected onUpdate(frame: Frame): void {
    if (!this.material || !this.points) return;
    this.material.uniforms.uTime.value = frame.elapsed;
    const motionScale = this.manifest?.reducedMotion ? 0.18 : 1;
    this.points.rotation.y = frame.elapsed * 0.008 * motionScale;
    this.points.rotation.z = -0.08 + Math.sin(frame.elapsed * 0.08) * 0.012 * motionScale;
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
    if (this.material) this.material.uniforms.uIntensity.value = next ? 0.3 : 0.18;
  }

  protected onDispose(): void {
    if (this.points) this.scene.remove(this.points);
    this.points = null;
    this.material = null;
    this.cameraRig.reset();
    this.scene.clear();
  }
}
