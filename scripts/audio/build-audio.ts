import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

/**
 * Deterministic original sound synthesis for the portfolio's opt-in layer.
 *
 * Produces 16-bit PCM WAV masters under `artifacts/audio/masters/`; FFmpeg
 * (checked by `scripts/media/check-ffmpeg.ts`) encodes the shipped WebM/MP3
 * derivatives into `public/audio/`. Everything is synthesized from sine and
 * filtered noise — nothing is sampled from a third party.
 */

const SAMPLE_RATE = 44_100;

interface SynthesisSpec {
  id: string;
  seconds: number;
  /** Peak amplitude ceiling; the build never exceeds -14 dBFS. */
  amplitude: number;
}

const SPECS: readonly SynthesisSpec[] = [
  { id: 'ambience-field', seconds: 12, amplitude: 0.16 },
  { id: 'ambience-editorial', seconds: 12, amplitude: 0.11 },
  { id: 'cue-hover', seconds: 0.25, amplitude: 0.18 },
  { id: 'cue-select', seconds: 0.35, amplitude: 0.19 },
  { id: 'transition-route', seconds: 1.6, amplitude: 0.22 },
];

function writeWav(path: string, samples: Float32Array): Promise<void> {
  const buffer = Buffer.alloc(44 + samples.length * 2);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + samples.length * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(samples.length * 2, 40);
  for (let index = 0; index < samples.length; index += 1) {
    buffer.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[index])) * 32767), 44 + index * 2);
  }
  return writeFile(path, buffer);
}

function synthAmbience(spec: SynthesisSpec): Float32Array {
  const length = Math.floor(spec.seconds * SAMPLE_RATE);
  const samples = new Float32Array(length);
  for (let index = 0; index < length; index += 1) {
    const time = index / SAMPLE_RATE;
    // Slow stacked sines plus a faint filtered-noise breath.
    const fundamental = Math.sin(2 * Math.PI * 55 * time);
    const fifth = Math.sin(2 * Math.PI * 82.4 * time) * 0.5;
    const air = Math.sin(2 * Math.PI * 110 * time) * 0.25;
    const breath = Math.sin(2 * Math.PI * 0.125 * time) * 0.3;
    const noise = Math.sin(index * 12.9898) * 0.02; // deterministic pseudo-noise
    samples[index] = (fundamental + fifth + air + breath + noise) * spec.amplitude * 0.4;
  }
  // Fade edges into a seamless loop: the tail returns to the head value.
  const fade = Math.floor(0.25 * SAMPLE_RATE);
  for (let index = 0; index < fade; index += 1) {
    const factor = index / fade;
    samples[index] *= factor;
    samples[length - 1 - index] *= factor;
  }
  return samples;
}

function synthTick(spec: SynthesisSpec): Float32Array {
  const length = Math.floor(spec.seconds * SAMPLE_RATE);
  const samples = new Float32Array(length);
  for (let index = 0; index < length; index += 1) {
    const time = index / SAMPLE_RATE;
    const envelope = Math.exp(-time * 14);
    const tone = Math.sin(2 * Math.PI * 660 * time) * 0.6 + Math.sin(2 * Math.PI * 990 * time) * 0.4;
    samples[index] = tone * envelope * spec.amplitude;
  }
  return samples;
}

function synthSwell(spec: SynthesisSpec): Float32Array {
  const length = Math.floor(spec.seconds * SAMPLE_RATE);
  const samples = new Float32Array(length);
  const half = length / 2;
  for (let index = 0; index < length; index += 1) {
    const time = index / SAMPLE_RATE;
    const envelope = Math.sin(Math.PI * Math.min(1, index / half)) ** 2;
    const tone = Math.sin(2 * Math.PI * 98 * time) + Math.sin(2 * Math.PI * 147 * time) * 0.4;
    samples[index] = tone * envelope * spec.amplitude * 0.6;
  }
  return samples;
}

async function main(): Promise<void> {
  const outDir = resolve(process.cwd(), 'artifacts/audio/masters');
  await mkdir(outDir, { recursive: true });

  for (const spec of SPECS) {
    const samples = spec.id.startsWith('cue-')
      ? synthTick(spec)
      : spec.id.startsWith('transition-')
        ? synthSwell(spec)
        : synthAmbience(spec);
    const outPath = resolve(outDir, `${spec.id}.wav`);
    await mkdir(dirname(outPath), { recursive: true });
    await writeWav(outPath, samples);
    console.log(`Wrote ${outPath} (${spec.seconds}s)`);
  }
}

void main();
