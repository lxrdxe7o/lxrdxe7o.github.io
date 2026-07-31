import { execFile } from 'node:child_process';
import { mkdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import type { MediaAssetVariant } from '../../src/types/media.ts';
import { requireFfmpeg, pickAvailableEncoder } from './check-ffmpeg.ts';

/** Preferred software H.264 encoders, in order. Builds vary in which they ship. */
const H264_ENCODER_PREFERENCE = ['libx264', 'libopenh264'] as const;
/** Preferred software VP9 encoders, in order. */
const VP9_ENCODER_PREFERENCE = ['libvpx-vp9'] as const;

const execFileAsync = promisify(execFile);

/** Per-variant byte budget for an encoded video loop. Enforced, not advisory. */
export const MAX_VIDEO_VARIANT_BYTES = 6_000_000;

export interface EncodeVideoOptions {
  /** Absolute path to the source master video (any container FFmpeg can decode). */
  sourcePath: string;
  /** Absolute directory the encoded outputs are written into. */
  outputDir: string;
  /** Stable asset id used as the output filename prefix. */
  assetId: string;
  /** Site-relative public base path the outputs are served from. */
  publicBasePath: string;
  /**
   * Timestamp (seconds) to extract the poster frame from. Defaults to
   * `duration - 0.5s`: recorded loops typically start with page-load/hydration
   * noise, so the settled state near the end of the clip is a safer default
   * than frame `0`.
   */
  posterTimestampSeconds?: number;
}

export interface EncodeVideoResult {
  width: number;
  height: number;
  aspectRatio: number;
  ffmpegVersion: string;
  /** The muted mp4 + webm loop variants. */
  variants: MediaAssetVariant[];
  /** The jpeg poster frame, linked to the video asset via `posterAssetId`. */
  posterVariant: MediaAssetVariant;
}

async function probeDimensions(sourcePath: string): Promise<{ width: number; height: number }> {
  const { stdout } = await execFileAsync('ffprobe', [
    '-v',
    'error',
    '-select_streams',
    'v:0',
    '-show_entries',
    'stream=width,height',
    '-of',
    'csv=p=0:s=x',
    sourcePath,
  ]);
  const [width, height] = stdout.trim().split('x').map(Number);
  if (!width || !height) {
    throw new Error(`Unable to probe video dimensions for ${sourcePath}`);
  }
  return { width, height };
}

async function probeDurationSeconds(sourcePath: string): Promise<number> {
  const { stdout } = await execFileAsync('ffprobe', [
    '-v',
    'error',
    '-show_entries',
    'format=duration',
    '-of',
    'csv=p=0',
    sourcePath,
  ]);
  const seconds = Number.parseFloat(stdout.trim());
  return Number.isFinite(seconds) ? seconds : 0;
}
export async function hasAudioStream(mediaPath: string): Promise<boolean> {
  const { stdout } = await execFileAsync('ffprobe', [
    '-v',
    'error',
    '-select_streams',
    'a',
    '-show_entries',
    'stream=index',
    '-of',
    'csv=p=0',
    mediaPath,
  ]);
  return stdout.trim().length > 0;
}

async function assertUnderBudget(path: string, fileName: string): Promise<number> {
  const { size } = await stat(path);
  if (size > MAX_VIDEO_VARIANT_BYTES) {
    throw new Error(
      `${fileName} is ${size} bytes, exceeding the ${MAX_VIDEO_VARIANT_BYTES}-byte video loop budget.`,
    );
  }
  return size;
}

function h264EncodeArgs(encoder: string): string[] {
  if (encoder === 'libx264') {
    return ['-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-crf', '23', '-preset', 'slow'];
  }
  // libopenh264 has no CRF/preset controls; use a comparable target bitrate instead.
  return ['-c:v', encoder, '-pix_fmt', 'yuv420p', '-b:v', '2500k'];
}

/**
 * Encodes a captured source clip into muted, loop-safe mp4 (H.264) and webm
 * (VP9) variants plus a jpeg poster frame, using an FFmpeg installation
 * checked via {@link requireFfmpeg}. Every output is muted (`-an`) regardless
 * of whether the source carries audio, satisfying the plan's "videos must be
 * controllable, muted by default" constraint at the encode step rather than
 * relying on playback-time attributes alone. The H.264 encoder is resolved
 * dynamically ({@link H264_ENCODER_PREFERENCE}) since not every FFmpeg build
 * ships `libx264`.
 */
export async function encodeVideoLoop(options: EncodeVideoOptions): Promise<EncodeVideoResult> {
  const ffmpegInfo = await requireFfmpeg();
  const [h264Encoder, vp9Encoder] = await Promise.all([
    pickAvailableEncoder(H264_ENCODER_PREFERENCE),
    pickAvailableEncoder(VP9_ENCODER_PREFERENCE),
  ]);
  await mkdir(options.outputDir, { recursive: true });

  const { width, height } = await probeDimensions(options.sourcePath);
  const aspectRatio = width / height;
  const sourceDurationSeconds = await probeDurationSeconds(options.sourcePath);
  const posterTimestampSeconds =
    options.posterTimestampSeconds ?? Math.max(0, sourceDurationSeconds - 0.5);

  const mp4FileName = `${options.assetId}.mp4`;
  const webmFileName = `${options.assetId}.webm`;
  const posterFileName = `${options.assetId}-poster.jpg`;
  const mp4Path = join(options.outputDir, mp4FileName);
  const webmPath = join(options.outputDir, webmFileName);
  const posterPath = join(options.outputDir, posterFileName);

  await execFileAsync('ffmpeg', [
    '-y',
    '-i',
    options.sourcePath,
    '-an',
    ...h264EncodeArgs(h264Encoder),
    '-movflags',
    '+faststart',
    mp4Path,
  ]);

  await execFileAsync('ffmpeg', [
    '-y',
    '-i',
    options.sourcePath,
    '-an',
    '-c:v',
    vp9Encoder,
    '-b:v',
    '0',
    '-crf',
    '32',
    webmPath,
  ]);

  await execFileAsync('ffmpeg', [
    '-y',
    '-ss',
    String(posterTimestampSeconds),
    '-i',
    options.sourcePath,
    '-frames:v',
    '1',
    posterPath,
  ]);

  const [mp4Bytes, webmBytes, posterBytes] = await Promise.all([
    assertUnderBudget(mp4Path, mp4FileName),
    assertUnderBudget(webmPath, webmFileName),
    stat(posterPath).then((s) => s.size),
  ]);

  return {
    width,
    height,
    aspectRatio,
    ffmpegVersion: ffmpegInfo.ffmpegVersion!,
    variants: [
      { format: 'mp4', width, height, bytes: mp4Bytes, path: `${options.publicBasePath}/${mp4FileName}` },
      { format: 'webm', width, height, bytes: webmBytes, path: `${options.publicBasePath}/${webmFileName}` },
    ],
    posterVariant: {
      format: 'jpeg',
      width,
      height,
      bytes: posterBytes,
      path: `${options.publicBasePath}/${posterFileName}`,
    },
  };
}
