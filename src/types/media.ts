/**
 * Types for the deterministic project media pipeline (capture -> process -> manifest).
 *
 * A {@link MediaManifest} is the durable, versioned record of every optimized
 * asset produced for one project. It is deliberately richer than the
 * lightweight {@link import('./content').MediaItem} used in project
 * frontmatter: the manifest tracks per-variant provenance, byte budgets, and
 * responsive candidates so a route can select sources without re-deriving
 * them, while `MediaItem` stays a simple pointer for authored content.
 */

/** The two media kinds the pipeline produces. */
export type MediaAssetKind = 'image' | 'video';

/** Encoded image container formats, ordered by preference (best compression first). */
export type ImageAssetFormat = 'avif' | 'webp' | 'jpeg';

/** Encoded video container formats. */
export type VideoAssetFormat = 'mp4' | 'webm';

/** Every format a manifest variant may use, including the still poster for a video. */
export type MediaAssetFormat = ImageAssetFormat | VideoAssetFormat;

/** Loading priority hint carried through to the `<img>`/`<video>` element. */
export type PreloadPriority = 'high' | 'low' | 'none';

/** One encoded, byte-measured output of a source asset at a specific width. */
export interface MediaAssetVariant {
  format: MediaAssetFormat;
  width: number;
  height: number;
  /** Encoded file size in bytes; enforced against a per-kind budget at build time. */
  bytes: number;
  /** Site-relative public path, e.g. `/media/projects/xero-dev/hero-1280.webp`. */
  path: string;
}

/**
 * One media asset (an image, or a video plus its poster) belonging to a
 * project, with every encoded variant and the accessibility/runtime metadata
 * needed to render it responsibly.
 */
export interface MediaAssetDescriptor {
  /** Stable identifier, unique within the manifest (e.g. `xero-dev-hero`). */
  id: string;
  kind: MediaAssetKind;
  projectSlug: string;
  /**
   * Where this asset's source material came from: a capture URL + timestamp
   * + seed for automated captures, or an operator attribution note for
   * manually supplied material. Never left blank.
   */
  sourceProvenance: string;
  /** Required for images unless `decorative` is true; always required for video. */
  alt?: string;
  /** Marks a purely decorative image so it may omit alt text. */
  decorative?: boolean;
  /** Required for video: the id of the poster image asset shown before playback. */
  posterAssetId?: string;
  /** Whether this asset may still load under `prefers-reduced-data`. */
  reducedDataEligible: boolean;
  preload: PreloadPriority;
  /** Intrinsic width / height, used to reserve layout space and prevent CLS. */
  aspectRatio: number;
  /** Every encoded output for this asset, one per format/width combination. */
  variants: MediaAssetVariant[];
}

/** The complete, versioned media record for one project. */
export interface MediaManifest {
  schemaVersion: number;
  projectSlug: string;
  generatedAt: string;
  assets: MediaAssetDescriptor[];
}

/** A named viewport the capture pipeline renders a page at. */
export interface CaptureViewport {
  id: string;
  label: string;
  width: number;
  height: number;
  deviceScaleFactor?: number;
  isMobile?: boolean;
  hasTouch?: boolean;
}

/** A single deterministic moment within a page to capture a still from. */
export interface CaptureMilestone {
  id: string;
  label: string;
  action: 'initial' | 'scroll' | 'interact';
  /** For `action: 'scroll'`, the fraction (0-1) of max scroll height to land on. */
  scrollToRatio?: number;
}

/** How a project's source material may legitimately be obtained. */
export type ProjectCaptureMethod = 'live-url' | 'manual-source-required';

/** Optional deterministic video-loop capture parameters for a project. */
export interface ProjectVideoCaptureConfig {
  milestoneId: string;
  durationMs: number;
}

/** Deterministic capture configuration for one approved project. */
export interface ProjectCaptureConfig {
  slug: string;
  method: ProjectCaptureMethod;
  /** Required when `method` is `'live-url'`. */
  routeUrl?: string;
  /** Seed for any pseudo-random capture behavior (none currently randomizes, kept for parity with the runtime's determinism rules). */
  seed: number;
  viewports: CaptureViewport[];
  milestones: CaptureMilestone[];
  video?: ProjectVideoCaptureConfig;
  /** Human-readable explanation, required when `method` is `'manual-source-required'`. */
  notes?: string;
}
