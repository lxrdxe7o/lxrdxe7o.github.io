import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { Vector2 } from 'three';
import {
  ACESFilmicToneMapping,
  SRGBColorSpace,
  WebGLRenderer,
  Color, type Camera,
  type Scene,
} from 'three';

import type { ExperienceRuntime } from '../core/ExperienceRuntime';
import { Renderer } from './Renderer';
import { SceneController } from './SceneController';
import { HomeScene } from './scenes/HomeScene';
import { FieldExperiment } from './scenes/lab/FieldExperiment';
import { StaticScene } from './scenes/StaticScene';
import type {
  FrameRequestCallback,
  PointerPosition,
  RendererBackend,
  RenderingAdapter,
  RenderingMode,
  RenderingSurface,
} from './types';

class ThreeRendererBackend implements RendererBackend {
  readonly renderer: WebGLRenderer;
  private composer: EffectComposer | null = null;
  private renderPass: RenderPass | null = null;
  private bloomPass: UnrealBloomPass | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      depth: true,
      stencil: false,
      powerPreference: 'high-performance',
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
    });
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.setClearColor(0x050306, 1);
  }

  setPixelRatio(value: number): void {
    this.renderer.setPixelRatio(value);
    if (this.composer) this.composer.setPixelRatio(value);
  }

  setSize(width: number, height: number): void {
    this.renderer.setSize(width, height, false);
    if (this.composer) this.composer.setSize(width, height);
  }

  render(scene: unknown, camera: unknown): void {
    if (!this.composer) {
      this.composer = new EffectComposer(this.renderer);
      this.renderPass = new RenderPass(scene as Scene, camera as Camera);
      this.renderPass.clearColor = new Color(0x050306);
      this.renderPass.clearAlpha = 1.0;
      this.composer.addPass(this.renderPass);
      this.bloomPass = new UnrealBloomPass(new Vector2(window.innerWidth, window.innerHeight), 0.3, 0.4, 0.85);
      this.composer.addPass(this.bloomPass);
    } else {
      if (this.renderPass) {
        this.renderPass.scene = scene as Scene;
        this.renderPass.camera = camera as Camera;
      }
    }
    this.composer.render();
  }

  forceContextLoss(): void {
    this.renderer.forceContextLoss();
  }

  dispose(): void {
    if (this.composer) this.composer.dispose();
    this.renderer.dispose();
  }
}

export class BrowserRenderingAdapter implements RenderingAdapter {
  private rendererAttempts = 0;
  private rendererCreations = 0;

  createRenderer(surface: RenderingSurface): RendererBackend {
    this.rendererAttempts += 1;
    surface.host.dataset.rendererAttempts = String(this.rendererAttempts);
    const backend = new ThreeRendererBackend(surface.canvas as HTMLCanvasElement);
    this.rendererCreations += 1;
    surface.host.dataset.rendererCreations = String(this.rendererCreations);
    return backend;
  }

  requestFrame(callback: FrameRequestCallback): number {
    return window.requestAnimationFrame(callback);
  }

  cancelFrame(handle: number): void {
    window.cancelAnimationFrame(handle);
  }

  observeResize(surface: RenderingSurface, listener: () => void): () => void {
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => listener());
      observer.observe(surface.host as unknown as Element);
      return () => observer.disconnect();
    }
    window.addEventListener('resize', listener, { passive: true });
    return () => window.removeEventListener('resize', listener);
  }

  subscribeVisibility(listener: () => void): () => void {
    document.addEventListener('visibilitychange', listener);
    return () => document.removeEventListener('visibilitychange', listener);
  }

  subscribePointer(
    surface: RenderingSurface,
    listener: (position: PointerPosition) => void,
  ): () => void {
    const host = surface.host as HTMLElement;
    const move = (event: PointerEvent): void => {
      const bounds = host.getBoundingClientRect();
      const width = Math.max(1, bounds.width);
      const height = Math.max(1, bounds.height);
      listener({
        x: Math.max(-1, Math.min(1, ((event.clientX - bounds.left) / width) * 2 - 1)),
        y: Math.max(-1, Math.min(1, -(((event.clientY - bounds.top) / height) * 2 - 1))),
      });
    };
    const reset = (): void => listener({ x: 0, y: 0 });
    host.addEventListener('pointermove', move, { passive: true });
    host.addEventListener('pointerleave', reset, { passive: true });
    host.addEventListener('pointercancel', reset, { passive: true });
    return () => {
      host.removeEventListener('pointermove', move);
      host.removeEventListener('pointerleave', reset);
      host.removeEventListener('pointercancel', reset);
    };
  }

  measure(surface: RenderingSurface): { width: number; height: number } {
    const host = surface.host as HTMLElement;
    const bounds = host.getBoundingClientRect();
    return {
      width: bounds.width || host.clientWidth || window.innerWidth,
      height: bounds.height || host.clientHeight || window.innerHeight,
    };
  }

  readDevicePixelRatio(): number {
    return window.devicePixelRatio || 1;
  }

  readVisibility(): 'visible' | 'hidden' {
    return document.visibilityState === 'hidden' ? 'hidden' : 'visible';
  }

  present(surface: RenderingSurface, mode: RenderingMode): void {
    const canvas = surface.canvas as HTMLCanvasElement;
    const fallback = surface.fallback as HTMLElement;
    canvas.hidden = mode === 'static';
    fallback.hidden = mode === 'enhanced';
    surface.host.dataset.rendererMode = mode;
    surface.host.dataset.rendererAttempts = String(this.rendererAttempts);
    surface.host.dataset.rendererCreations = String(this.rendererCreations);
    canvas.setAttribute('aria-hidden', 'true');
  }
}

import { ProjectCarouselScene } from './scenes/ProjectCarouselScene';

export function createBrowserRenderer(
  surface: RenderingSurface,
  runtime: ExperienceRuntime,
): Renderer {
  return new Renderer({
    runtime,
    surface,
    adapter: new BrowserRenderingAdapter(),
    seed: 0x6c787264,
    createSceneController: (tracker) =>
      new SceneController({
        tracker,
        createScene: ({ manifest, scope }) => {
          if (manifest.qualityTier === 'static') return new StaticScene(scope, manifest.route);
          if (manifest.route.startsWith('/lab')) return new FieldExperiment(scope, manifest.route);
          if (manifest.route === '/' || manifest.route.startsWith('/projects')) {
            return new ProjectCarouselScene(scope, manifest.route);
          }
          return new HomeScene(scope, manifest.route);
        },
      }),
  });
}

