import type {
  QualityTier,
  RecoverableRuntimeError,
  RuntimeSnapshot,
} from '../core/types';
import type { ResourceScope, ResourceTracker } from './ResourceTracker';

export interface PointerPosition {
  readonly x: number;
  readonly y: number;
}

export interface Viewport {
  readonly width: number;
  readonly height: number;
  readonly dpr: number;
}

export interface Frame {
  readonly time: number;
  readonly delta: number;
  readonly elapsed: number;
  readonly index: number;
}

export type FrameRequestCallback = (time: number) => void;

export interface FrameScheduler {
  requestFrame(callback: FrameRequestCallback): number;
  cancelFrame(handle: number): void;
}

export interface ScenePreparationManifest {
  readonly route: string;
  readonly qualityTier: QualityTier;
  readonly seed: number;
  readonly reducedMotion: boolean;
  readonly particleCount: number;
  readonly particleFingerprint: string;
}

export interface SceneRenderState {
  readonly scene: unknown;
  readonly camera: unknown;
}

export interface SceneState {
  readonly id: string;
  prepare(manifest: ScenePreparationManifest): void | Promise<void>;
  enter(previous: SceneState | null): void | Promise<void>;
  update(frame: Frame): void;
  resize(viewport: Viewport): void;
  setPointer(position: PointerPosition): void;
  exit(next: SceneState | null): void | Promise<void>;
  dispose(): void;
  getRenderState(): SceneRenderState | null;
}

export interface SceneFactoryContext {
  readonly manifest: ScenePreparationManifest;
  readonly scope: ResourceScope;
  readonly tracker: ResourceTracker;
}

export type SceneFactory = (context: SceneFactoryContext) => SceneState;

export interface RendererBackend {
  setPixelRatio(value: number): void;
  setSize(width: number, height: number): void;
  render(scene: unknown, camera: unknown): void;
  dispose(): void;
  forceContextLoss?(): void;
}

export interface SurfaceDataset {
  [key: string]: string | undefined;
}

export interface SurfaceElement {
  readonly dataset: SurfaceDataset;
  hidden?: boolean;
}

export interface HostSurface extends SurfaceElement {
  readonly clientWidth: number;
  readonly clientHeight: number;
}

export interface CanvasSurface extends SurfaceElement {
  hidden: boolean;
}

export interface RenderingSurface {
  readonly host: HostSurface;
  readonly canvas: CanvasSurface;
  readonly fallback: SurfaceElement & { hidden: boolean };
}

export type RenderingMode = 'enhanced' | 'static';

export interface RenderingAdapter extends FrameScheduler {
  createRenderer(surface: RenderingSurface): RendererBackend;
  observeResize(surface: RenderingSurface, listener: () => void): () => void;
  subscribeVisibility(listener: () => void): () => void;
  subscribePointer(
    surface: RenderingSurface,
    listener: (position: PointerPosition) => void,
  ): () => void;
  measure(surface: RenderingSurface): { readonly width: number; readonly height: number };
  readDevicePixelRatio(): number;
  readVisibility(): 'visible' | 'hidden';
  present(surface: RenderingSurface, mode: RenderingMode): void;
}

export interface RenderingRuntime {
  getSnapshot(): RuntimeSnapshot;
  subscribe(subscriber: (snapshot: RuntimeSnapshot) => void): () => void;
  degrade(error: RecoverableRuntimeError): void;
}

export const DPR_CAPS = Object.freeze({
  static: 1,
  low: 1,
  medium: 1.5,
  high: 2,
}) satisfies Readonly<Record<QualityTier, number>>;
