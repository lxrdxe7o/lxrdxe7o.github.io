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
    this.renderer.toneMappingExposure = 0.92;
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
      observer.observe(surface.host as Element);
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
        createScene: ({ manifest, scope }) =>
          manifest.qualityTier === 'static'
            ? new StaticScene(scope, manifest.route)
            : new HomeScene(scope, manifest.route),
      }),
  });
}
