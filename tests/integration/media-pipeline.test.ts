import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { chromium, type Browser } from '@playwright/test';
import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { ProjectCaptureConfig } from '../../src/types/media';
import { captureProjectMedia } from '../../scripts/capture/capture-project';
import { checkFfmpeg, requireFfmpeg } from '../../scripts/media/check-ffmpeg';
import { encodeVideoLoop, hasAudioStream } from '../../scripts/media/encode-video';
import { RESPONSIVE_IMAGE_WIDTHS, processImage } from '../../scripts/media/process-images';

const execFileAsync = promisify(execFile);

const FIXTURE_PAGE_URL = new URL('../fixtures/media/sample-page.html', import.meta.url).toString();

async function sha256(path: string): Promise<string> {
  const buffer = await readFile(path);
  return createHash('sha256').update(buffer).digest('hex');
}

describe('check-ffmpeg', () => {
  it('reports ffmpeg/ffprobe availability with version strings', async () => {
    const result = await checkFfmpeg();
    expect(typeof result.available).toBe('boolean');
    if (result.available) {
      expect(result.ffmpegVersion).toMatch(/ffmpeg/i);
      expect(result.ffprobeVersion).toMatch(/ffprobe/i);
    }
  });
});

describe('processImage', () => {
  let workDir: string;
  let sourcePath: string;

  beforeAll(async () => {
    workDir = await mkdtemp(join(tmpdir(), 'media-pipeline-images-'));
    sourcePath = join(workDir, 'source.png');
    await sharp({
      create: { width: 2400, height: 1350, channels: 3, background: { r: 20, g: 24, b: 30 } },
    })
      .png()
      .toFile(sourcePath);
  });

  afterAll(async () => {
    await rm(workDir, { recursive: true, force: true });
  });

  it('produces every configured width/format combination within budget', async () => {
    const outputDir = join(workDir, 'out-a');
    const result = await processImage({
      sourcePath,
      outputDir,
      assetId: 'fixture-hero',
      publicBasePath: '/media/projects/fixture',
    });

    const widths = [...new Set(result.variants.map((v) => v.width))].sort((a, b) => a - b);
    expect(widths).toEqual([...RESPONSIVE_IMAGE_WIDTHS]);
    expect(result.variants.map((v) => v.format).sort()).toEqual(
      ['avif', 'avif', 'avif', 'avif', 'jpeg', 'jpeg', 'jpeg', 'jpeg', 'webp', 'webp', 'webp', 'webp'].sort(),
    );
    for (const variant of result.variants) {
      expect(variant.bytes).toBeGreaterThan(0);
      expect(variant.bytes).toBeLessThan(700_000);
    }
    expect(result.aspectRatio).toBeCloseTo(2400 / 1350, 5);
  });

  it('never upscales beyond the source width', async () => {
    const smallSourcePath = join(workDir, 'small-source.png');
    await sharp({
      create: { width: 500, height: 300, channels: 3, background: { r: 10, g: 10, b: 10 } },
    })
      .png()
      .toFile(smallSourcePath);

    const result = await processImage({
      sourcePath: smallSourcePath,
      outputDir: join(workDir, 'out-small'),
      assetId: 'fixture-small',
      publicBasePath: '/media/projects/fixture',
    });

    for (const variant of result.variants) {
      expect(variant.width).toBeLessThanOrEqual(500);
    }
  });

  it('encodes byte-identical output across repeated runs on the same source', async () => {
    const outputDirA = join(workDir, 'determinism-a');
    const outputDirB = join(workDir, 'determinism-b');
    const resultA = await processImage({
      sourcePath,
      outputDir: outputDirA,
      assetId: 'fixture-hero',
      publicBasePath: '/media/projects/fixture',
      widths: [960],
      formats: ['webp'],
    });
    const resultB = await processImage({
      sourcePath,
      outputDir: outputDirB,
      assetId: 'fixture-hero',
      publicBasePath: '/media/projects/fixture',
      widths: [960],
      formats: ['webp'],
    });

    const hashA = await sha256(join(outputDirA, 'fixture-hero-960.webp'));
    const hashB = await sha256(join(outputDirB, 'fixture-hero-960.webp'));
    expect(hashA).toBe(hashB);
    expect(resultA.variants[0].bytes).toBe(resultB.variants[0].bytes);
  });
});

describe('encodeVideoLoop', () => {
  let workDir: string;
  let sourceVideoPath: string;
  let ffmpegAvailable = false;

  beforeAll(async () => {
    const availability = await checkFfmpeg();
    ffmpegAvailable = availability.available;
    if (!ffmpegAvailable) return;

    workDir = await mkdtemp(join(tmpdir(), 'media-pipeline-video-'));
    sourceVideoPath = join(workDir, 'source.mp4');
    // Deterministic synthetic clip: no camera/screen capture involved, generated
    // purely from FFmpeg's test-pattern source filter so the fixture needs no
    // committed binary asset.
    await execFileAsync('ffmpeg', [
      '-y',
      '-f',
      'lavfi',
      '-i',
      'testsrc=duration=1:size=320x240:rate=10',
      '-pix_fmt',
      'yuv420p',
      sourceVideoPath,
    ]);
  });

  afterAll(async () => {
    if (workDir) await rm(workDir, { recursive: true, force: true });
  });

  it('requireFfmpeg resolves when the binaries are installed', async () => {
    if (!ffmpegAvailable) return;
    await expect(requireFfmpeg()).resolves.toMatchObject({ available: true });
  });

  it('produces muted mp4/webm loops with a poster frame, all within budget', async () => {
    if (!ffmpegAvailable) return;

    const outputDir = join(workDir, 'out');
    const result = await encodeVideoLoop({
      sourcePath: sourceVideoPath,
      outputDir,
      assetId: 'fixture-loop',
      publicBasePath: '/media/projects/fixture',
    });

    expect(result.variants.map((v) => v.format).sort()).toEqual(['mp4', 'webm']);
    expect(result.width).toBe(320);
    expect(result.height).toBe(240);
    expect(result.posterVariant.format).toBe('jpeg');

    for (const variant of result.variants) {
      expect(variant.bytes).toBeGreaterThan(0);
      expect(variant.bytes).toBeLessThan(6_000_000);
      const absolutePath = join(outputDir, variant.path.split('/').pop()!);
      await expect(hasAudioStream(absolutePath)).resolves.toBe(false);
    }
  }, 30_000);
});

describe('captureProjectMedia (deterministic fixture capture)', () => {
  let browser: Browser;

  beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
  });

  afterAll(async () => {
    await browser.close();
  });

  const fixtureConfig: ProjectCaptureConfig = {
    slug: 'fixture-project',
    method: 'live-url',
    routeUrl: FIXTURE_PAGE_URL,
    seed: 1,
    viewports: [{ id: 'desktop', label: 'Desktop', width: 800, height: 600, deviceScaleFactor: 1 }],
    milestones: [{ id: 'hero', label: 'Landing hero', action: 'initial' }],
  };

  it('captures byte-identical stills for the same fixture page across two runs', async () => {
    const workspaceA = await mkdtemp(join(tmpdir(), 'media-pipeline-capture-a-'));
    const workspaceB = await mkdtemp(join(tmpdir(), 'media-pipeline-capture-b-'));
    await mkdir(join(workspaceA, 'src', 'data', 'media-manifests'), { recursive: true });
    await mkdir(join(workspaceB, 'src', 'data', 'media-manifests'), { recursive: true });

    try {
      const resultA = await captureProjectMedia({
        browser,
        config: fixtureConfig,
        workspaceRoot: workspaceA,
        capturedAt: '2026-01-01T00:00:00.000Z',
      });
      const resultB = await captureProjectMedia({
        browser,
        config: fixtureConfig,
        workspaceRoot: workspaceB,
        capturedAt: '2026-01-01T00:00:00.000Z',
      });

      expect(resultA.manifest.assets.length).toBe(resultB.manifest.assets.length);
      expect(resultA.manifest.assets.length).toBeGreaterThan(0);

      for (const assetA of resultA.manifest.assets) {
        const assetB = resultB.manifest.assets.find((a) => a.id === assetA.id);
        expect(assetB).toBeDefined();
        expect(assetA.variants.length).toBe(assetB!.variants.length);

        for (const variantA of assetA.variants) {
          const variantB = assetB!.variants.find(
            (v) => v.format === variantA.format && v.width === variantA.width,
          );
          expect(variantB).toBeDefined();

          const fileNameA = variantA.path.split('/').pop()!;
          const fileNameB = variantB!.path.split('/').pop()!;
          const hashA = await sha256(join(resultA.publicMediaDir, fileNameA));
          const hashB = await sha256(join(resultB.publicMediaDir, fileNameB));
          expect(hashA).toBe(hashB);
        }
      }
    } finally {
      await rm(workspaceA, { recursive: true, force: true });
      await rm(workspaceB, { recursive: true, force: true });
    }
  }, 60_000);

  it('rejects projects that are not capturable by URL', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'media-pipeline-manual-'));
    try {
      await expect(
        captureProjectMedia({
          browser,
          config: {
            slug: 'manual-project',
            method: 'manual-source-required',
            seed: 1,
            viewports: [],
            milestones: [],
            notes: 'No live deployment.',
          },
          workspaceRoot: workspace,
          capturedAt: '2026-01-01T00:00:00.000Z',
        }),
      ).rejects.toThrow(/not capturable/i);
    } finally {
      await rm(workspace, { recursive: true, force: true });
    }
  });
});
