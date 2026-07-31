import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface FfmpegAvailability {
  available: boolean;
  ffmpegVersion?: string;
  ffprobeVersion?: string;
  error?: string;
}

async function getVersionLine(bin: string): Promise<string | undefined> {
  try {
    const { stdout } = await execFileAsync(bin, ['-version']);
    return stdout.split('\n')[0]?.trim();
  } catch {
    return undefined;
  }
}

/** Returns the set of encoder names this FFmpeg build was compiled with. */
export async function listAvailableEncoders(): Promise<Set<string>> {
  const { stdout } = await execFileAsync('ffmpeg', ['-hide_banner', '-encoders']);
  const names = new Set<string>();
  for (const line of stdout.split('\n')) {
    const match = /^\s*[VAS.][F.][S.][X.][B.][D.]\s+(\S+)/.exec(line);
    if (match) names.add(match[1]);
  }
  return names;
}

/**
 * Picks the first available encoder from an ordered preference list. FFmpeg
 * builds vary in which software encoders they ship (some minimal builds omit
 * `libx264` for licensing reasons but ship `libopenh264` instead), so the
 * video encoder always resolves its codec through this rather than
 * hardcoding a single name.
 */
export async function pickAvailableEncoder(candidates: readonly string[]): Promise<string> {
  const available = await listAvailableEncoders();
  const found = candidates.find((candidate) => available.has(candidate));
  if (!found) {
    throw new Error(
      `None of the required encoders are available: ${candidates.join(', ')}. This FFmpeg build may be missing codec support — install a build with one of these encoders.`,
    );
  }
  return found;
}

/** Checks whether both `ffmpeg` and `ffprobe` are installed and on `PATH`. */
export async function checkFfmpeg(): Promise<FfmpegAvailability> {
  const [ffmpegVersion, ffprobeVersion] = await Promise.all([
    getVersionLine('ffmpeg'),
    getVersionLine('ffprobe'),
  ]);

  if (!ffmpegVersion || !ffprobeVersion) {
    return {
      available: false,
      ffmpegVersion,
      ffprobeVersion,
      error:
        'ffmpeg and ffprobe must both be installed and on PATH to encode video loops. Install FFmpeg (https://ffmpeg.org/download.html) and retry.',
    };
  }

  return { available: true, ffmpegVersion, ffprobeVersion };
}

/** Same as {@link checkFfmpeg} but throws an actionable error instead of returning `available: false`. */
export async function requireFfmpeg(): Promise<FfmpegAvailability> {
  const result = await checkFfmpeg();
  if (!result.available) {
    throw new Error(result.error ?? 'ffmpeg is unavailable.');
  }
  return result;
}

if (process.argv[1]?.endsWith('check-ffmpeg.ts') || process.argv[1]?.endsWith('check-ffmpeg.js')) {
  checkFfmpeg().then((result) => {
    console.log(JSON.stringify(result, null, 2));
    if (!result.available) process.exitCode = 1;
  });
}
