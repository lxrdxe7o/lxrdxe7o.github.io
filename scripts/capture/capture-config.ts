import type { CaptureViewport, ProjectCaptureConfig } from '../../src/types/media.ts';

/** Standard desktop capture viewport used across every project. */
export const DESKTOP_VIEWPORT: CaptureViewport = {
  id: 'desktop',
  label: 'Desktop',
  width: 1440,
  height: 900,
  deviceScaleFactor: 2,
};

/** Standard mobile capture viewport used across every project. */
export const MOBILE_VIEWPORT: CaptureViewport = {
  id: 'mobile',
  label: 'Mobile',
  width: 390,
  height: 844,
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
};

function manualSourceConfig(slug: string, notes: string): ProjectCaptureConfig {
  return {
    slug,
    method: 'manual-source-required',
    seed: 1,
    viewports: [DESKTOP_VIEWPORT, MOBILE_VIEWPORT],
    milestones: [],
    notes,
  };
}

/**
 * Deterministic capture configuration for every project approved in the
 * Task 4 audit (`artifacts/audit/reports/portfolio-audit.md`). Only
 * `xero-dev` currently exposes a live, navigable web route, so it is the
 * only project this pipeline can capture automatically today. The remaining
 * approved flagship projects are CLI tools, editor configuration, a Discord
 * bot, and coursework applications with no live deployment; each is marked
 * `manual-source-required` with an explanation rather than silently
 * skipped, per the plan's "never fabricate media" constraint. See
 * `docs/media/capture-plan.md` for the follow-up each one needs.
 */
export const PROJECT_CAPTURE_CONFIGS: Readonly<Record<string, ProjectCaptureConfig>> = {
  'xero-dev': {
    slug: 'xero-dev',
    method: 'live-url',
    routeUrl: 'https://lxrdxe7o.vercel.app/',
    seed: 1,
    viewports: [DESKTOP_VIEWPORT, MOBILE_VIEWPORT],
    milestones: [
      { id: 'hero', label: 'Landing hero', action: 'initial' },
      { id: 'scroll-mid', label: 'Mid-scroll composition', action: 'scroll', scrollToRatio: 0.5 },
    ],
    video: { milestoneId: 'hero', durationMs: 6000 },
  },
  krakenvim: manualSourceConfig(
    'krakenvim',
    'Neovim configuration distribution with no navigable web route. Requires an operator-directed terminal recording of the editor in use.',
  ),
  hachi: manualSourceConfig(
    'hachi',
    'Rust terminal UI for asusctl with no navigable web route. Requires an operator-directed terminal recording.',
  ),
  mikeneko: manualSourceConfig(
    'mikeneko',
    'Discord bot with no public web interface. Requires an operator-directed Discord screen capture.',
  ),
  'shiro-nekoo-115': manualSourceConfig(
    'shiro-nekoo-115',
    'Coursework hospital management system in C with no live deployment. Requires an operator-directed local build and capture.',
  ),
  deaddrop: manualSourceConfig(
    'deaddrop',
    'C project with no live deployment. Requires an operator-directed local build and capture.',
  ),
  dotfiles: manualSourceConfig(
    'dotfiles',
    'Personal dotfiles repository with no single representative interface. Requires an operator-selected desktop screenshot.',
  ),
  'tora-neko-311': manualSourceConfig(
    'tora-neko-311',
    'Coursework airline booking system in PHP with no live deployment. Requires an operator-directed local build and capture.',
  ),
  'kuro-nekoo-215': manualSourceConfig(
    'kuro-nekoo-215',
    'Coursework vehicle shop management desktop application in Java with no live deployment. Requires an operator-directed local build and capture.',
  ),
};

export function getProjectCaptureConfig(slug: string): ProjectCaptureConfig {
  const config = PROJECT_CAPTURE_CONFIGS[slug];
  if (!config) {
    throw new Error(`No capture configuration registered for project "${slug}".`);
  }
  return config;
}
