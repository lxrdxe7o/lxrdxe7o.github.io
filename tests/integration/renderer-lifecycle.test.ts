import { describe, expect, it } from 'vitest';

import type { RuntimeSnapshot } from '../../src/runtime/core/types';
import { Renderer } from '../../src/runtime/rendering/Renderer';
import { SceneController } from '../../src/runtime/rendering/SceneController';
import { createSceneManifest } from '../../src/runtime/rendering/scene-manifest';
import { ResourceTracker, type ResourceScope } from '../../src/runtime/rendering/ResourceTracker';
import type {
  Frame,
  FrameRequestCallback,
  PointerPosition,
  RendererBackend,
  RenderingAdapter,
  RenderingRuntime,
  RenderingSurface,
  SceneState,
  ScenePreparationManifest,
  Viewport,
} from '../../src/runtime/rendering/types';

function runtimeSnapshot(
  overrides: Partial<RuntimeSnapshot> = {},
): RuntimeSnapshot {
  return {
    phase: 'active',
    route: '/',
    entryMode: 'silent',
    entryPreference: 'silent',
    audioState: 'silent',
    indexState: 'closed',
    navigationTarget: null,
    qualityTier: 'high',
    capabilities: {
      reducedMotion: false,
      reducedData: false,
      pointer: 'fine',
      webgl: true,
      visibility: 'visible',
    },
    recoverableError: null,
    ...overrides,
  };
}

class MemoryRuntime implements RenderingRuntime {
  private readonly subscribers = new Set<(snapshot: RuntimeSnapshot) => void>();
  readonly degradations: Array<{ code: string; message: string }> = [];

  constructor(private snapshot = runtimeSnapshot()) {}

  getSnapshot(): RuntimeSnapshot {
    return this.snapshot;
  }

  subscribe(subscriber: (snapshot: RuntimeSnapshot) => void): () => void {
    this.subscribers.add(subscriber);
    return () => this.subscribers.delete(subscriber);
  }

  degrade(error: { code: string; message: string }): void {
    this.degradations.push(error);
  }

  update(overrides: Partial<RuntimeSnapshot>): void {
    this.snapshot = runtimeSnapshot({ ...this.snapshot, ...overrides });
    for (const subscriber of this.subscribers) subscriber(this.snapshot);
  }

  listenerCount(): number {
    return this.subscribers.size;
  }
}

class MemoryBackend implements RendererBackend {
  pixelRatios: number[] = [];
  sizes: Array<{ width: number; height: number }> = [];
  renders = 0;
  disposals = 0;
  contextLosses = 0;

  setPixelRatio(value: number): void {
    this.pixelRatios.push(value);
  }

  setSize(width: number, height: number): void {
    this.sizes.push({ width, height });
  }

  render(): void {
    this.renders += 1;
  }

  dispose(): void {
    this.disposals += 1;
  }

  forceContextLoss(): void {
    this.contextLosses += 1;
  }
}

class MemoryAdapter implements RenderingAdapter {
  readonly backend = new MemoryBackend();
  readonly frames = new Map<number, FrameRequestCallback>();
  mode: 'enhanced' | 'static' = 'static';
  rendererAttempts = 0;
  rendererCreations = 0;
  failRendererCreation = false;
  failResizeSubscription = false;
  resizeSubscriptions = 0;
  resizeReleases = 0;
  visibilitySubscriptions = 0;
  visibilityReleases = 0;
  pointerSubscriptions = 0;
  pointerReleases = 0;
  viewport = { width: 1440, height: 900 };
  devicePixelRatio = 4;
  visibility: 'visible' | 'hidden' = 'visible';
  private frameId = 0;
  private resizeListener: (() => void) | null = null;
  private visibilityListener: (() => void) | null = null;
  private pointerListener: ((position: PointerPosition) => void) | null = null;

  createRenderer(): RendererBackend {
    this.rendererAttempts += 1;
    if (this.failRendererCreation) throw new Error('No context available.');
    this.rendererCreations += 1;
    return this.backend;
  }

  requestFrame(callback: FrameRequestCallback): number {
    this.frameId += 1;
    this.frames.set(this.frameId, callback);
    return this.frameId;
  }

  cancelFrame(handle: number): void {
    this.frames.delete(handle);
  }

  observeResize(_surface: RenderingSurface, listener: () => void): () => void {
    this.resizeSubscriptions += 1;
    if (this.failResizeSubscription) throw new Error('Resize subscription failed.');
    this.resizeListener = listener;
    return () => {
      if (this.resizeListener === listener) this.resizeListener = null;
      this.resizeReleases += 1;
    };
  }

  subscribeVisibility(listener: () => void): () => void {
    this.visibilitySubscriptions += 1;
    this.visibilityListener = listener;
    return () => {
      if (this.visibilityListener === listener) this.visibilityListener = null;
      this.visibilityReleases += 1;
    };
  }

  subscribePointer(
    _surface: RenderingSurface,
    listener: (position: PointerPosition) => void,
  ): () => void {
    this.pointerSubscriptions += 1;
    this.pointerListener = listener;
    return () => {
      if (this.pointerListener === listener) this.pointerListener = null;
      this.pointerReleases += 1;
    };
  }

  measure(): { width: number; height: number } {
    return this.viewport;
  }

  readDevicePixelRatio(): number {
    return this.devicePixelRatio;
  }

  readVisibility(): 'visible' | 'hidden' {
    return this.visibility;
  }

  present(surface: RenderingSurface, mode: 'enhanced' | 'static'): void {
    this.mode = mode;
    surface.canvas.hidden = mode === 'static';
    surface.fallback.hidden = mode === 'enhanced';
    surface.host.dataset.rendererMode = mode;
    surface.host.dataset.rendererCreations = String(this.rendererCreations);
  }

  flushFrame(time: number): void {
    const next = [...this.frames.entries()][0];
    if (!next) return;
    this.frames.delete(next[0]);
    next[1](time);
  }

  emitResize(): void {
    this.resizeListener?.();
  }

  emitVisibility(visibility: 'visible' | 'hidden'): void {
    this.visibility = visibility;
    this.visibilityListener?.();
  }

  emitPointer(position: PointerPosition): void {
    this.pointerListener?.(position);
  }
}

class DisposableSceneResource {
  disposals = 0;

  dispose(): void {
    this.disposals += 1;
  }
}

class MemoryScene implements SceneState {
  readonly id: string;
  readonly renderState = { scene: {}, camera: {} };
  readonly resource: DisposableSceneResource;
  updates: Frame[] = [];
  viewports: Viewport[] = [];
  pointers: PointerPosition[] = [];
  enters = 0;
  exits = 0;
  disposals = 0;

  constructor(
    readonly manifest: ScenePreparationManifest,
    scope: ResourceScope,
    private readonly preparation?: {
      readonly started: () => void;
      readonly gate: Promise<void>;
    },
  ) {
    this.id = `${manifest.route}:${manifest.qualityTier}`;
    this.resource = scope.track(new DisposableSceneResource(), 'geometry');
  }

  async prepare(manifest: ScenePreparationManifest): Promise<void> {
    expect(manifest).toEqual(this.manifest);
    this.preparation?.started();
    await this.preparation?.gate;
  }

  enter(): void {
    this.enters += 1;
  }

  update(frame: Frame): void {
    this.updates.push(frame);
  }

  resize(viewport: Viewport): void {
    this.viewports.push(viewport);
  }

  setPointer(position: PointerPosition): void {
    this.pointers.push(position);
  }

  exit(): void {
    this.exits += 1;
  }

  dispose(): void {
    this.disposals += 1;
  }

  getRenderState(): { scene: object; camera: object } {
    return this.renderState;
  }
}

function createSurface(): RenderingSurface {
  return {
    host: { dataset: {}, clientWidth: 1440, clientHeight: 900 },
    canvas: { dataset: {}, hidden: false },
    fallback: { dataset: {}, hidden: true },
  };
}

function createHarness(snapshot = runtimeSnapshot()): {
  runtime: MemoryRuntime;
  adapter: MemoryAdapter;
  surface: RenderingSurface;
  renderer: Renderer;
  scenes: MemoryScene[];
} {
  const runtime = new MemoryRuntime(snapshot);
  const adapter = new MemoryAdapter();
  const surface = createSurface();
  const scenes: MemoryScene[] = [];
  const renderer = new Renderer({
    runtime,
    adapter,
    surface,
    seed: 0x1a2b3c4d,
    createSceneController: (tracker) =>
      new SceneController({
        tracker,
        createScene: ({ manifest, scope }) => {
          const scene = new MemoryScene(manifest, scope);
          scenes.push(scene);
          return scene;
        },
      }),
  });
  return { runtime, adapter, surface, renderer, scenes };
}

describe('Renderer lifecycle', () => {
  it('retains one renderer while route scopes are replaced and released', async () => {
    const { runtime, adapter, renderer, scenes, surface } = createHarness();
    await renderer.initialize();

    for (let index = 0; index < 50; index += 1) {
      runtime.update({ route: `/route-${index}` });
      await renderer.settled();
    }

    expect(adapter.rendererCreations).toBe(1);
    expect(surface.host.dataset.rendererCreations).toBe('1');
    expect(scenes).toHaveLength(51);
    expect(scenes.slice(0, -1).every((scene) => scene.disposals === 1)).toBe(true);
    expect(scenes.slice(0, -1).every((scene) => scene.resource.disposals === 1)).toBe(true);
    expect(renderer.getDiagnostics().resources).toMatchObject({
      scopes: 1,
      resources: 1,
    });
  });

  it('creates stable scene preparation manifests from fixed seeds', () => {
    const first = createSceneManifest('/projects', 'high', 0xdecafbad, false);
    const second = createSceneManifest('/projects', 'high', 0xdecafbad, false);
    const differentRoute = createSceneManifest('/about', 'high', 0xdecafbad, false);

    expect(first).toEqual(second);
    expect(first).not.toEqual(differentRoute);
    expect(first.particleFingerprint).toMatch(/^[a-f0-9]{8}$/);
  });

  it('rebuilds the active scene when reduced-motion changes at the same route and tier', async () => {
    const { runtime, renderer, scenes } = createHarness();
    await renderer.initialize();
    const fullMotionCount = scenes[0]?.manifest.particleCount;

    runtime.update({
      capabilities: { ...runtime.getSnapshot().capabilities, reducedMotion: true },
    });
    await renderer.settled();

    expect(scenes).toHaveLength(2);
    expect(scenes[0]?.disposals).toBe(1);
    expect(scenes[1]?.manifest.reducedMotion).toBe(true);
    expect(scenes[1]?.manifest.particleCount).toBeLessThan(fullMotionCount ?? 0);
  });

  it('waits for in-flight preparation before releasing a destroyed scene scope', async () => {
    let resolveStarted: (() => void) | undefined;
    let resolvePreparation: (() => void) | undefined;
    const started = new Promise<void>((resolve) => {
      resolveStarted = resolve;
    });
    const gate = new Promise<void>((resolve) => {
      resolvePreparation = resolve;
    });
    const tracker = new ResourceTracker();
    const deferredScenes: MemoryScene[] = [];
    const controller = new SceneController({
      tracker,
      createScene: ({ manifest, scope }) => {
        const scene = new MemoryScene(manifest, scope, {
          started: () => resolveStarted?.(),
          gate,
        });
        deferredScenes.push(scene);
        return scene;
      },
    });

    const activation = controller.activate(
      createSceneManifest('/', 'high', 0x12345678, false),
    );
    await started;
    const disposal = controller.dispose();

    expect(deferredScenes[0]?.resource.disposals).toBe(0);
    resolvePreparation?.();
    await Promise.all([activation, disposal]);

    expect(deferredScenes[0]?.disposals).toBe(1);
    expect(deferredScenes[0]?.resource.disposals).toBe(1);
    expect(tracker.snapshot()).toMatchObject({ scopes: 0, resources: 0 });
  });

  it('bounds DPR, resizes through one observer, and forwards pointer input', async () => {
    const { adapter, renderer, scenes } = createHarness();
    await renderer.initialize();

    expect(adapter.backend.pixelRatios.at(-1)).toBe(2);
    expect(adapter.backend.sizes.at(-1)).toEqual({ width: 1440, height: 900 });

    adapter.viewport = { width: 800, height: 600 };
    adapter.devicePixelRatio = 1.25;
    adapter.emitResize();
    adapter.emitPointer({ x: 0.5, y: -0.25 });

    expect(adapter.resizeSubscriptions).toBe(1);
    expect(adapter.backend.pixelRatios.at(-1)).toBe(1.25);
    expect(adapter.backend.sizes.at(-1)).toEqual({ width: 800, height: 600 });
    expect(scenes.at(-1)?.viewports.at(-1)).toEqual({
      width: 800,
      height: 600,
      dpr: 1.25,
    });
    expect(scenes.at(-1)?.pointers.at(-1)).toEqual({ x: 0.5, y: -0.25 });
  });

  it('runs one deterministic frame loop and pauses for visibility or static mode', async () => {
    const { runtime, adapter, renderer, scenes } = createHarness();
    await renderer.initialize();

    expect(adapter.frames.size).toBe(1);
    adapter.flushFrame(1000);
    adapter.flushFrame(1016);
    expect(adapter.backend.renders).toBe(2);
    expect(scenes.at(-1)?.updates.map(({ delta }) => delta)).toEqual([0, 0.016]);

    adapter.emitVisibility('hidden');
    expect(adapter.frames.size).toBe(0);
    adapter.emitVisibility('visible');
    expect(adapter.frames.size).toBe(1);

    runtime.update({
      qualityTier: 'static',
      capabilities: { ...runtime.getSnapshot().capabilities, reducedData: true },
    });
    await renderer.settled();
    expect(adapter.mode).toBe('static');
    expect(adapter.frames.size).toBe(0);
  });

  it('uses the static fallback without creating a WebGL renderer when unsupported', async () => {
    const snapshot = runtimeSnapshot({
      qualityTier: 'static',
      capabilities: {
        reducedMotion: false,
        reducedData: false,
        pointer: 'fine',
        webgl: false,
        visibility: 'visible',
      },
    });
    const { adapter, renderer, surface } = createHarness(snapshot);

    await renderer.initialize();

    expect(adapter.rendererAttempts).toBe(0);
    expect(adapter.rendererCreations).toBe(0);
    expect(adapter.mode).toBe('static');
    expect(surface.canvas.hidden).toBe(true);
    expect(surface.fallback.hidden).toBe(false);
    expect(adapter.frames.size).toBe(0);
    expect(renderer.getDiagnostics().mode).toBe('static');
  });

  it('falls back and degrades recoverably when renderer construction fails', async () => {
    const { runtime, adapter, renderer, surface } = createHarness();
    adapter.failRendererCreation = true;

    await expect(renderer.initialize()).resolves.toBeUndefined();

    expect(runtime.degradations).toEqual([
      {
        code: 'renderer-initialization',
        message: 'The interactive background is unavailable; static content remains active.',
      },
    ]);
    expect(surface.canvas.hidden).toBe(true);
    expect(surface.fallback.hidden).toBe(false);
    expect(adapter.frames.size).toBe(0);
    runtime.update({ route: '/about' });
    await renderer.settled();
    expect(adapter.rendererAttempts).toBe(1);
    expect(adapter.rendererCreations).toBe(0);
  });

  it('releases partially installed adapters when initialization setup fails', async () => {
    const { runtime, adapter, renderer, surface } = createHarness();
    adapter.failResizeSubscription = true;

    await expect(renderer.initialize()).resolves.toBeUndefined();

    expect(runtime.listenerCount()).toBe(0);
    expect(adapter.resizeSubscriptions).toBe(1);
    expect(adapter.visibilitySubscriptions).toBe(0);
    expect(adapter.pointerSubscriptions).toBe(0);
    expect(adapter.rendererAttempts).toBe(0);
    expect(surface.canvas.hidden).toBe(true);
    expect(surface.fallback.hidden).toBe(false);
    expect(runtime.degradations).toHaveLength(1);
  });

  it('releases the loop, observers, scenes, resources, and context exactly once', async () => {
    const { runtime, adapter, renderer, scenes } = createHarness();
    await renderer.initialize();

    const firstDestroy = renderer.destroy();
    const secondDestroy = renderer.destroy();
    expect(secondDestroy).toBe(firstDestroy);
    await firstDestroy;

    expect(runtime.listenerCount()).toBe(0);
    expect(adapter.frames.size).toBe(0);
    expect(adapter.resizeReleases).toBe(1);
    expect(adapter.visibilityReleases).toBe(1);
    expect(adapter.pointerReleases).toBe(1);
    expect(adapter.backend.disposals).toBe(1);
    expect(adapter.backend.contextLosses).toBe(1);
    expect(scenes.at(-1)?.disposals).toBe(1);
    expect(scenes.at(-1)?.resource.disposals).toBe(1);
    expect(renderer.getDiagnostics().resources).toMatchObject({
      disposed: true,
      scopes: 0,
      resources: 0,
    });
  });
});
