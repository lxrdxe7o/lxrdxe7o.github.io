import { execFile } from 'node:child_process';
import { mkdir, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';

import { checkFfmpeg } from '../media/check-ffmpeg.ts';

const execFileAsync = promisify(execFile);

const MASTERS_DIR = resolve(process.cwd(), 'artifacts/audio/masters');
const OUT_DIR = resolve(process.cwd(), 'public/audio');

async function main(): Promise<void> {
  const ffmpeg = await checkFfmpeg();
  if (!ffmpeg.available) throw new Error(ffmpeg.error);

  await mkdir(OUT_DIR, { recursive: true });
  const masters = (await readdir(MASTERS_DIR)).filter((file) => file.endsWith('.wav'));

  for (const master of masters) {
    const id = master.replace(/\.wav$/, '');
    const source = join(MASTERS_DIR, master);

    // WebM (opus) — preferred for Chromium/Firefox/Edge.
    await execFileAsync('ffmpeg', [
      '-y', '-hide_banner', '-loglevel', 'error',
      '-i', source,
      '-c:a', 'libopus', '-b:a', '96k',
      join(OUT_DIR, `${id}.webm`),
    ]);
    // MP3 — compatibility fallback for Safari.
    await execFileAsync('ffmpeg', [
      '-y', '-hide_banner', '-loglevel', 'error',
      '-i', source,
      '-c:a', 'libmp3lame', '-b:a', '128k',
      join(OUT_DIR, `${id}.mp3`),
    ]);
    console.log(`Encoded ${id}.webm + ${id}.mp3`);
  }
}

void main();
