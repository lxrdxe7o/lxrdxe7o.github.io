import { mkdir, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { chromium, type Browser, type BrowserContext, type Page } from '@playwright/test';
import type {
  CaptureMilestone,
  CaptureViewport,
  MediaAssetDescriptor,
  MediaManifest,
  ProjectCaptureConfig,
} from '../../src/types/media.ts';
import { buildMediaManifest, writeManifestModule } from '../media/build-manifest.ts';
import { encodeVideoLoop } from '../media/encode-video.ts';
import { processImage } from '../media/process-images.ts';
import { getProjectCaptureConfig } from './capture-config.ts';

export interface CaptureProjectOptions {
  browser: Browser;
  config: ProjectCaptureConfig;
  workspaceRoot: string;
  capturedAt: string;
}

export interface CaptureProjectResult {
  manifest: MediaManifest;
  manifestModulePath: string;
  publicMediaDir: string;
  rawCaptureDir: string;
}

interface RawStill {
  milestone: CaptureMilestone;
  viewport: CaptureViewport;
  path: string;
}

export function rawCaptureDir(workspaceRoot: string, slug: string): string {
  return resolve(workspaceRoot, 'artifacts', 'media', 'captures', slug);
}

export function publicMediaDir(workspaceRoot: string, slug: string): string {
  return resolve(workspaceRoot, 'public', 'media', 'projects', slug);
}

function publicBasePath(slug: string): string {
  return `/media/projects/${slug}`;
}

const VOLATILE_TEXT_SELECTOR = 'h1, h2, h3, h4, h5, h6, p, li, span, time, [class*="time" i], [class*="clock" i]';
const VOLATILE_TEXT_PLACEHOLDER = '[masked volatile text]';
const TIMESTAMP_PATTERN = /\b\d{1,2}:\d{2}(?::\d{2})?(?:\s*(?:AM|PM|[A-Z]{2,5}))?\b/g;

/**
 * Masks obvious timestamp-shaped text (clocks, "current time" widgets) so a
 * still capture does not embed the second it happened to run in. Re-applies
 * on every DOM mutation because some pages re-render their own clock text on
 * an interval rather than mutating in place once.
 */
async function maskTimestampText(page: Page): Promise<void> {
  await page.evaluate((pattern) => {
    const timePattern = new RegExp(pattern, 'g');
    const maskTimeTextNodes = () => {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let textNode = walker.nextNode();
      while (textNode) {
        if (textNode.nodeValue && timePattern.test(textNode.nodeValue)) {
          textNode.nodeValue = textNode.nodeValue.replace(timePattern, '[masked time]');
        }
        timePattern.lastIndex = 0;
        textNode = walker.nextNode();
      }
    };
    maskTimeTextNodes();
    const observer = new MutationObserver(() => maskTimeTextNodes());
    observer.observe(document.body, { subtree: true, childList: true, characterData: true });
  }, TIMESTAMP_PATTERN.source);
}

async function sampleVolatileText(page: Page): Promise<string[]> {
  return page.evaluate(
    (selector) =>
      Array.from(document.querySelectorAll<HTMLElement>(selector)).map(
        (element) => (element.innerText || element.textContent || '').trim(),
      ),
    VOLATILE_TEXT_SELECTOR,
  );
}

/**
 * Some pages regenerate part of their own copy on an interval (a live clock,
 * a randomized glitch-text heading, a rotating quote) independent of any CSS
 * animation this pipeline can freeze. Rather than hardcoding which page does
 * this, this samples a broad set of text-bearing elements twice a short
 * delay apart and masks any element whose text changed between samples,
 * then keeps re-applying that mask via a MutationObserver so later
 * regeneration before the eventual screenshot is also caught. Static
 * content is left untouched.
 */
async function maskVolatileDynamicText(page: Page, sampleDelayMs = 400): Promise<void> {
  const firstSample = await sampleVolatileText(page);
  await page.waitForTimeout(sampleDelayMs);
  const secondSample = await sampleVolatileText(page);

  const volatileIndexes: number[] = [];
  firstSample.forEach((text, index) => {
    if (secondSample[index] !== undefined && secondSample[index] !== text) {
      volatileIndexes.push(index);
    }
  });
  if (volatileIndexes.length === 0) return;

  await page.evaluate(
    ({ selector, indexes, placeholder }) => {
      const applyMask = () => {
        const elements = Array.from(document.querySelectorAll<HTMLElement>(selector));
        for (const index of indexes) {
          const element = elements[index];
          if (element && element.textContent !== placeholder) {
            element.dataset.captureVolatile = 'true';
            element.textContent = placeholder;
          }
        }
      };
      applyMask();
      const observer = new MutationObserver(() => applyMask());
      observer.observe(document.body, { subtree: true, childList: true, characterData: true });
    },
    { selector: VOLATILE_TEXT_SELECTOR, indexes: volatileIndexes, placeholder: VOLATILE_TEXT_PLACEHOLDER },
  );
}

async function stabilizePage(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-delay: 0s !important;
        animation-duration: 0.001s !important;
        animation-iteration-count: 1 !important;
        caret-color: transparent !important;
        transition-delay: 0s !important;
        transition-duration: 0.001s !important;
      }
    `,
  });
  try {
    await page.evaluate(async () => {
      if ('fonts' in document) await document.fonts.ready;
    });
  } catch {
    // Fonts API unavailable in this environment; proceed without blocking capture.
  }
  await maskTimestampText(page);
  await maskVolatileDynamicText(page);
}

async function applyMilestone(page: Page, milestone: CaptureMilestone): Promise<void> {
  if (milestone.action === 'scroll' && typeof milestone.scrollToRatio === 'number') {
    await page.evaluate((ratio) => {
      const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      window.scrollTo(0, Math.round(maxScroll * ratio));
    }, milestone.scrollToRatio);
    await page.waitForTimeout(150);
  }
}

async function captureStillsForViewport(
  page: Page,
  routeUrl: string,
  viewport: CaptureViewport,
  milestones: readonly CaptureMilestone[],
  outputDir: string,
): Promise<RawStill[]> {
  await page.goto(routeUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  try {
    await page.waitForLoadState('networkidle', { timeout: 15_000 });
  } catch {
    // Best effort: proceed with whatever has settled after the timeout.
  }
  await stabilizePage(page);

  const stills: RawStill[] = [];
  for (const milestone of milestones) {
    await applyMilestone(page, milestone);
    const fileName = `${viewport.id}-${milestone.id}.png`;
    const outputPath = join(outputDir, fileName);
    await page.screenshot({
      path: outputPath,
      fullPage: true,
      animations: 'disabled',
      caret: 'hide',
    });
    stills.push({ milestone, viewport, path: outputPath });
  }
  return stills;
}

async function captureVideoForViewport(
  browser: Browser,
  routeUrl: string,
  viewport: CaptureViewport,
  durationMs: number,
  outputDir: string,
  outputFileName: string,
): Promise<string> {
  const videoTmpDir = join(outputDir, `video-tmp-${outputFileName}`);
  await mkdir(videoTmpDir, { recursive: true });

  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: viewport.deviceScaleFactor ?? 1,
    isMobile: viewport.isMobile ?? false,
    hasTouch: viewport.hasTouch ?? false,
    recordVideo: {
      dir: videoTmpDir,
      size: { width: viewport.width, height: viewport.height },
    },
  });

  let page: Page | undefined;
  try {
    page = await context.newPage();
    await page.goto(routeUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    try {
      await page.waitForLoadState('networkidle', { timeout: 15_000 });
    } catch {
      // Best effort.
    }
    await stabilizePage(page);
    await page.waitForTimeout(durationMs);
  } finally {
    if (page) await page.close();
    await context.close();
  }

  const video = page?.video();
  if (!video) {
    await rm(videoTmpDir, { recursive: true, force: true });
    throw new Error(`No video was recorded for viewport "${viewport.id}".`);
  }
  const finalPath = join(outputDir, outputFileName);
  await video.saveAs(finalPath);
  await rm(videoTmpDir, { recursive: true, force: true });
  return finalPath;
}

/**
 * Runs the full capture -> process -> manifest pipeline for one approved
 * project that has a live, navigable route (`config.method === 'live-url'`).
 * Raw captures land in the git-ignored `artifacts/media/captures/<slug>/`
 * staging directory; optimized, budget-checked derivatives land in
 * `public/media/projects/<slug>/`; the typed manifest lands in
 * `src/data/media-manifests/<slug>.ts`.
 *
 * Determinism depends on the target page itself rendering the same content
 * for the same URL/viewport/milestone combination — this pipeline stabilizes
 * animations and waits for fonts/network idle, but cannot guarantee
 * determinism against a live site that changes its own content over time.
 */
export async function captureProjectMedia(
  options: CaptureProjectOptions,
): Promise<CaptureProjectResult> {
  const { config } = options;
  if (config.method !== 'live-url' || !config.routeUrl) {
    throw new Error(
      `Project "${config.slug}" is not capturable by this pipeline (method: ${config.method}). ${config.notes ?? ''}`.trim(),
    );
  }
  const routeUrl = config.routeUrl;

  const rawDir = rawCaptureDir(options.workspaceRoot, config.slug);
  const publicDir = publicMediaDir(options.workspaceRoot, config.slug);
  await mkdir(rawDir, { recursive: true });
  await mkdir(publicDir, { recursive: true });

  const descriptors: MediaAssetDescriptor[] = [];

  for (const viewport of config.viewports) {
    const context: BrowserContext = await options.browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: viewport.deviceScaleFactor ?? 1,
      isMobile: viewport.isMobile ?? false,
      hasTouch: viewport.hasTouch ?? false,
    });
    try {
      const page = await context.newPage();
      const stills = await captureStillsForViewport(
        page,
        routeUrl,
        viewport,
        config.milestones,
        rawDir,
      );

      for (const still of stills) {
        const assetId = `${config.slug}-${still.viewport.id}-${still.milestone.id}`;
        const { variants, aspectRatio } = await processImage({
          sourcePath: still.path,
          outputDir: publicDir,
          assetId,
          publicBasePath: publicBasePath(config.slug),
        });
        descriptors.push({
          id: assetId,
          kind: 'image',
          projectSlug: config.slug,
          sourceProvenance: `${routeUrl} @ ${options.capturedAt} (seed ${config.seed}, ${still.viewport.label} — ${still.milestone.label})`,
          alt: `${config.slug} — ${still.viewport.label} view, ${still.milestone.label.toLowerCase()}`,
          reducedDataEligible: still.milestone.action === 'initial',
          preload:
            still.viewport.id === 'desktop' && still.milestone.action === 'initial'
              ? 'high'
              : 'none',
          aspectRatio,
          variants,
        });
      }
    } finally {
      await context.close();
    }
  }

  if (config.video) {
    const milestone = config.milestones.find((m) => m.id === config.video!.milestoneId);
    if (!milestone) {
      throw new Error(
        `Project "${config.slug}" references unknown video milestone "${config.video.milestoneId}".`,
      );
    }
    const desktopViewport =
      config.viewports.find((v) => v.id === 'desktop') ?? config.viewports[0];
    const rawVideoFileName = `${desktopViewport.id}-${milestone.id}.webm`;
    const rawVideoPath = await captureVideoForViewport(
      options.browser,
      routeUrl,
      desktopViewport,
      config.video.durationMs,
      rawDir,
      rawVideoFileName,
    );

    const videoAssetId = `${config.slug}-${desktopViewport.id}-loop`;
    const posterAssetId = `${videoAssetId}-poster`;
    const { variants, posterVariant, aspectRatio } = await encodeVideoLoop({
      sourcePath: rawVideoPath,
      outputDir: publicDir,
      assetId: videoAssetId,
      publicBasePath: publicBasePath(config.slug),
    });

    descriptors.push({
      id: posterAssetId,
      kind: 'image',
      projectSlug: config.slug,
      sourceProvenance: `${routeUrl} @ ${options.capturedAt} (seed ${config.seed}, video poster frame)`,
      alt: `${config.slug} — interface loop poster frame`,
      reducedDataEligible: true,
      preload: 'none',
      aspectRatio,
      variants: [posterVariant],
    });
    descriptors.push({
      id: videoAssetId,
      kind: 'video',
      projectSlug: config.slug,
      sourceProvenance: `${routeUrl} @ ${options.capturedAt} (seed ${config.seed}, ${config.video.durationMs}ms loop)`,
      alt: `${config.slug} — muted interface loop`,
      posterAssetId,
      reducedDataEligible: false,
      preload: 'none',
      aspectRatio,
      variants,
    });
  }

  const manifest = buildMediaManifest({
    projectSlug: config.slug,
    assets: descriptors,
    generatedAt: options.capturedAt,
  });
  const manifestModulePath = resolve(
    options.workspaceRoot,
    'src',
    'data',
    'media-manifests',
    `${config.slug}.ts`,
  );
  await writeManifestModule(manifest, manifestModulePath);

  return {
    manifest,
    manifestModulePath,
    publicMediaDir: publicDir,
    rawCaptureDir: rawDir,
  };
}

async function runFromCommandLine(): Promise<void> {
  const slug = process.argv[2];
  if (!slug) {
    console.error('Usage: node scripts/capture/capture-project.ts <project-slug>');
    process.exitCode = 1;
    return;
  }

  const config = getProjectCaptureConfig(slug);
  if (config.method !== 'live-url') {
    console.error(`[Capture] Project "${slug}" requires manual source material: ${config.notes}`);
    process.exitCode = 1;
    return;
  }

  const browser = await chromium.launch({ headless: true, args: ['--mute-audio'] });
  try {
    const result = await captureProjectMedia({
      browser,
      config,
      workspaceRoot: process.cwd(),
      capturedAt: process.env.CAPTURE_TIMESTAMP ?? new Date().toISOString(),
    });
    const totalVariants = result.manifest.assets.reduce(
      (count, asset) => count + asset.variants.length,
      0,
    );
    console.log(`[Capture] Wrote manifest for "${slug}" to ${result.manifestModulePath}`);
    console.log(`[Capture] Optimized assets in ${result.publicMediaDir}`);
    console.log(
      `[Capture] ${result.manifest.assets.length} media assets, ${totalVariants} total variants.`,
    );
  } finally {
    await browser.close();
  }
}

if (
  process.argv[1]?.endsWith('capture-project.ts') ||
  process.argv[1]?.endsWith('capture-project.js')
) {
  runFromCommandLine().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
