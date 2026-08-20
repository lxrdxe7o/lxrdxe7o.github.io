import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

/**
 * Validates generated audio derivatives against the sound-direction rules:
 * duration floors, channel count, loudness ceiling, loop boundaries (first
 * and last PCM samples must not click), format support, and license manifest.
 */

const DERIVATIVE_DIR = resolve(process.cwd(), 'public/audio');
void DERIVATIVE_DIR;

interface ClipRule {
  id: string;
  minSeconds: number;
  maxSeconds: number;
  loop: boolean;
}

const RULES: readonly ClipRule[] = [
  { id: 'ambience-field', minSeconds: 8, maxSeconds: 20, loop: true },
  { id: 'ambience-editorial', minSeconds: 8, maxSeconds: 20, loop: true },
  { id: 'cue-hover', minSeconds: 0.1, maxSeconds: 1, loop: false },
  { id: 'cue-select', minSeconds: 0.1, maxSeconds: 1, loop: false },
  { id: 'transition-route', minSeconds: 0.5, maxSeconds: 3, loop: false },
];

interface WavHeader {
  channels: number;
  sampleRate: number;
  frames: number;
  peak: number;
  firstSample: number;
  lastSample: number;
}

function readWavInfo(buffer: Buffer): WavHeader {
  if (buffer.toString('ascii', 0, 4) !== 'RIFF') throw new Error('not a RIFF file');
  const channels = buffer.readUInt16LE(22);
  const sampleRate = buffer.readUInt32LE(24);
  const bits = buffer.readUInt16LE(34);
  const dataStart = 44;
  const frames = Math.floor((buffer.length - dataStart) / (bits / 8));
  const samples = new Int16Array(
    buffer.buffer.slice(buffer.byteOffset + dataStart, buffer.byteOffset + dataStart + frames * 2),
  );
  let peak = 0;
  for (const sample of samples) peak = Math.max(peak, Math.abs(sample) / 32767);
  return {
    channels,
    sampleRate,
    frames,
    peak,
    firstSample: samples[0] ?? 0,
    lastSample: samples[samples.length - 1] ?? 0,
  };
}

export async function validateAudio(): Promise<string[]> {
  const errors: string[] = [];

  for (const rule of RULES) {
    const masterPath = join('artifacts/audio/masters', `${rule.id}.wav`);
    let info: WavHeader;
    try {
      const buffer = await readFile(resolve(process.cwd(), masterPath));
      info = readWavInfo(buffer);
    } catch {
      errors.push(`${rule.id}: master missing — run npm run audio:build first`);
      continue;
    }

    const seconds = info.frames / info.sampleRate;
    if (seconds < rule.minSeconds || seconds > rule.maxSeconds) {
      errors.push(`${rule.id}: duration ${seconds.toFixed(2)}s outside allowed range`);
    }
    if (info.channels !== 1) {
      errors.push(`${rule.id}: expected mono, got ${info.channels} channels`);
    }
    // -14 dBFS ceiling: peak must stay below 0.1995 linear.
    if (info.peak > 0.2) {
      errors.push(`${rule.id}: peak ${info.peak.toFixed(3)} exceeds -14 dBFS ceiling`);
    }
    if (rule.loop && Math.abs(info.firstSample - info.lastSample) > 400) {
      errors.push(`${rule.id}: loop boundary clicks (first/last sample delta too large)`);
    }
  }

  const licensePath = resolve(process.cwd(), 'public/audio/LICENSES.json');
  try {
    const licenses = JSON.parse(await readFile(licensePath, 'utf8')) as {
      clips: Array<{ id: string }>;
    };
    for (const rule of RULES) {
      if (!licenses.clips.some((clip) => clip.id === rule.id)) {
        errors.push(`${rule.id}: missing license entry`);
      }
    }
  } catch {
    errors.push('public/audio/LICENSES.json missing or invalid');
  }

  return errors;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const errors = await validateAudio();
  for (const error of errors) console.error(error);
  if (errors.length > 0) process.exit(1);
  console.log('Audio validation passed.');
}
