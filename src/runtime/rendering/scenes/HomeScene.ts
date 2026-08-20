import {
  Color,
  FogExp2,
  Scene,
  Object3D,
  DirectionalLight,
  AmbientLight
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import { CameraRig } from '../CameraRig';
import type { ResourceScope } from '../ResourceTracker';
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
  private model: Object3D | null = null;

  constructor(scope: ResourceScope, route: string) {
    super(`spatial:${route}`, scope);
    this.scene.background = new Color(0x050306);
    this.scene.fog = new FogExp2(0x050306, 0.03);

    // Add lighting for the model
    const ambient = new AmbientLight(0xffffff, 1.2);
    this.scene.add(ambient);

    const dirLight = new DirectionalLight(0xaaccff, 2.5);
    dirLight.position.set(5, 5, 5);
    this.scene.add(dirLight);
    
    const dirLight2 = new DirectionalLight(0xffccaa, 1.5);
    dirLight2.position.set(-5, -5, -5);
    this.scene.add(dirLight2);
  }

  getRenderState(): SceneRenderState {
    return { scene: this.scene, camera: this.cameraRig.camera };
  }

  protected async onPrepare(manifest: ScenePreparationManifest): Promise<void> {
    const loader = new GLTFLoader();
    try {
      const gltf = await loader.loadAsync('/models/canvas_bg.glb');
      this.model = gltf.scene;
      
      // Make it large and positioned nicely
      this.model.scale.set(1.5, 1.5, 1.5);
      this.model.position.set(0, 0, -5);
      
      this.scene.add(this.model);
    } catch (err) {
      console.error('Failed to load canvas_bg.glb', err);
    }
    
    this.cameraRig.setReducedMotion(manifest.reducedMotion);
  }

  protected onEnter(previous: SceneState | null): void {
  }

  protected onUpdate(frame: Frame): void {
    const motionScale = this.manifest?.reducedMotion ? 0.18 : 1;
    
    if (this.model) {
      this.model.rotation.y = frame.elapsed * 0.2 * motionScale;
      this.model.rotation.x = Math.sin(frame.elapsed * 0.5) * 0.1 * motionScale;
      this.model.rotation.z = Math.cos(frame.elapsed * 0.3) * 0.05 * motionScale;
    }
    
    this.cameraRig.update(frame);
  }

  protected onResize(viewport: Viewport): void {
    this.cameraRig.resize(viewport);
  }

  protected onPointer(position: PointerPosition): void {
    this.cameraRig.setPointer(position);
  }

  protected onExit(next: SceneState | null): void {
  }

  protected onDispose(): void {
    if (this.model) {
      this.scene.remove(this.model);
    }
    this.model = null;
    this.cameraRig.reset();
    this.scene.clear();
  }
}
