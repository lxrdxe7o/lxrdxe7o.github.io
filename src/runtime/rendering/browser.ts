

import { Vector2 } from 'three';
import {
  ACESFilmicToneMapping,
  SRGBColorSpace,
  WebGLRenderer,
  type Camera,
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
  }

  setSize(width: number, height: number): void {
    this.renderer.setSize(width, height, false);
  }

  render(scene: unknown, camera: unknown): void {
    this.renderer.render(scene as Scene, camera as Camera);
  }

  forceContextLoss(): void {
    this.renderer.forceContextLoss();
  }

  dispose(): void {
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
    _surface: RenderingSurface,
    listener: (position: PointerPosition) => void,
  ): () => void {
    const move = (event: PointerEvent): void => {
      const width = Math.max(1, window.innerWidth);
      const height = Math.max(1, window.innerHeight);
      listener({
        x: Math.max(-1, Math.min(1, (event.clientX / width) * 2 - 1)),
        y: Math.max(-1, Math.min(1, -((event.clientY / height) * 2 - 1))),
      });
    };
    const reset = (): void => listener({ x: 0, y: 0 });
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerleave', reset, { passive: true });
    window.addEventListener('pointercancel', reset, { passive: true });
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerleave', reset);
      window.removeEventListener('pointercancel', reset);
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

