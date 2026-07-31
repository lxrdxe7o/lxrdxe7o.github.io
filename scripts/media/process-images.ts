import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import sharp, { type Sharp } from 'sharp';
import type { ImageAssetFormat, MediaAssetVariant } from '../../src/types/media.ts';

/** Responsive width ladder used for every processed image, in pixels. */
export const RESPONSIVE_IMAGE_WIDTHS = [640, 960, 1280, 1920] as const;

/** Formats produced for every image, most-compressed first. */
export const IMAGE_FORMATS: readonly ImageAssetFormat[] = ['avif', 'webp', 'jpeg'];

/** Per-variant byte budget for a responsive image. Enforced, not advisory. */
export const MAX_IMAGE_VARIANT_BYTES = 700_000;

export interface ProcessImageOptions {
  /** Absolute path to the source master image. */
  sourcePath: string;
  /** Absolute directory the encoded variants are written into. */
  outputDir: string;
  /** Stable asset id used as the output filename prefix. */
  assetId: string;
  /** Site-relative public base path the variants are served from, e.g. `/media/projects/xero-dev`. */
  publicBasePath: string;
  widths?: readonly number[];
  formats?: readonly ImageAssetFormat[];
}

export interface ProcessImageResult {
  variants: MediaAssetVariant[];
  aspectRatio: number;
  sourceWidth: number;
  sourceHeight: number;
}

function applyFormat(pipeline: Sharp, format: ImageAssetFormat): Sharp {
  switch (format) {
    case 'avif':
      return pipeline.avif({ quality: 55 });
    case 'webp':
      return pipeline.webp({ quality: 72 });
    case 'jpeg':
      return pipeline.jpeg({ quality: 78, mozjpeg: true });
  }
}

/**
 * Encodes a source master into a deterministic set of responsive AVIF/WebP/JPEG
 * variants. Widths wider than the source are skipped rather than upscaled;
 * if every configured width exceeds the source, the source's own width is
 * used once per format so every asset still produces at least one variant.
 */
export async function processImage(options: ProcessImageOptions): Promise<ProcessImageResult> {
  const widths = options.widths ?? RESPONSIVE_IMAGE_WIDTHS;
  const formats = options.formats ?? IMAGE_FORMATS;

  const metadata = await sharp(options.sourcePath).metadata();
  const sourceWidth = metadata.width ?? 0;
  const sourceHeight = metadata.height ?? 0;
  if (!sourceWidth || !sourceHeight) {
    throw new Error(`Unable to read dimensions for ${options.sourcePath}`);
  }
  const aspectRatio = sourceWidth / sourceHeight;

  await mkdir(options.outputDir, { recursive: true });

  const eligibleWidths = widths.filter((width) => width <= sourceWidth);
  const targetWidths = eligibleWidths.length > 0 ? eligibleWidths : [sourceWidth];

  const variants: MediaAssetVariant[] = [];
  for (const format of formats) {
    for (const width of targetWidths) {
      const height = Math.round(width / aspectRatio);
      const fileName = `${options.assetId}-${width}.${format}`;
      const outputPath = join(options.outputDir, fileName);
      const pipeline = applyFormat(
        sharp(options.sourcePath).resize({ width, withoutEnlargement: true }),
        format,
      );
      const { size } = await pipeline.toFile(outputPath);

      if (size > MAX_IMAGE_VARIANT_BYTES) {
        throw new Error(
          `${fileName} is ${size} bytes, exceeding the ${MAX_IMAGE_VARIANT_BYTES}-byte responsive image budget.`,
        );
      }

      variants.push({
        format,
        width,
        height,
        bytes: size,
        path: `${options.publicBasePath}/${fileName}`,
      });
    }
  }

  variants.sort((a, b) => a.width - b.width || a.format.localeCompare(b.format));

  return { variants, aspectRatio, sourceWidth, sourceHeight };
}
