import type { MediaAssetDescriptor, MediaManifest } from '../types/media';
import { xeroDevMediaManifest } from './media-manifests/xero-dev';

export const APPROVED_PROJECT_SLUGS = [
  'xero-dev',
  'krakenvim',
  'hachi',
  'mikeneko',
  'shiro-nekoo-115',
  'deaddrop',
  'dotfiles',
  'tora-neko-311',
  'kuro-nekoo-215',
] as const;

export const FLAGSHIP_SLUGS = APPROVED_PROJECT_SLUGS;
export const ARCHIVE_SLUGS = [
  'surfacepro7-drivers',
  'block327',
  'lxrdxe7o-me',
  'lxrdxe7o',
  'enyo-claw',
  'enyo-dev',
  'wallpapers',
  'ds-test',
  'xero-shell',
] as const;

export type ApprovedProjectSlug = (typeof APPROVED_PROJECT_SLUGS)[number];
export type ProjectPresentation = 'flagship' | 'archive';
export type ProjectType = 'publication' | 'developer-tool' | 'terminal-tool' | 'bot' | 'application' | 'utility' | 'configuration' | 'driver-package' | 'portfolio' | 'profile' | 'repository' | 'asset-collection' | 'experiment' | 'interface';

const PROJECT_TYPES: Readonly<Record<ApprovedProjectSlug, ProjectType>> = {
  'xero-dev': 'publication',
  krakenvim: 'developer-tool',
  hachi: 'terminal-tool',
  mikeneko: 'bot',
  'shiro-nekoo-115': 'application',
  deaddrop: 'utility',
  dotfiles: 'configuration',
  'tora-neko-311': 'application',
  'kuro-nekoo-215': 'application',
};

export const projectMediaManifests: Readonly<Partial<Record<ApprovedProjectSlug, MediaManifest>>> = {
  'xero-dev': xeroDevMediaManifest,
};

export function isApprovedProjectSlug(slug: string): slug is ApprovedProjectSlug {
  return APPROVED_PROJECT_SLUGS.includes(slug as ApprovedProjectSlug);
}

export function classifyProject(slug: string): ProjectPresentation | undefined {
  if (FLAGSHIP_SLUGS.includes(slug as (typeof FLAGSHIP_SLUGS)[number])) return 'flagship';
  if (ARCHIVE_SLUGS.includes(slug as (typeof ARCHIVE_SLUGS)[number])) return 'archive';
  return undefined;
}

export function getProjectType(slug: ApprovedProjectSlug): ProjectType {
  return PROJECT_TYPES[slug];
}

export function resolveNextProjectSlug(slug: string): (typeof FLAGSHIP_SLUGS)[number] | undefined {
  const index = FLAGSHIP_SLUGS.indexOf(slug as (typeof FLAGSHIP_SLUGS)[number]);
  if (index < 0) return undefined;
  return FLAGSHIP_SLUGS[(index + 1) % FLAGSHIP_SLUGS.length];
}

export function resolveFlagshipCycle(startSlug: string, count: number): string[] {
  if (count <= 0) return [];
  const startIndex = FLAGSHIP_SLUGS.indexOf(startSlug as (typeof FLAGSHIP_SLUGS)[number]);
  if (startIndex < 0) return [];
  return Array.from({ length: count }, (_, index) => FLAGSHIP_SLUGS[(startIndex + index) % FLAGSHIP_SLUGS.length]);
}

export function selectProjectHeroAsset(manifest: MediaManifest | undefined): MediaAssetDescriptor | undefined {
  if (!manifest) return undefined;
  return manifest.assets.find((asset) => asset.kind === 'image' && asset.preload === 'high')
    ?? manifest.assets.find((asset) => asset.kind === 'image' && asset.reducedDataEligible);
}

export interface ArchiveRecord {
  slug: string;
  title: string;
  summary: string;
  type: ProjectType;
  technologies: readonly string[];
  year?: number;
  status?: string;
  href: string;
  repository?: string;
}

export const ARCHIVE_PROJECTS: readonly ArchiveRecord[] = [
  {
    slug: 'surfacepro7-drivers',
    title: 'SurfacePro7 Drivers',
    summary: 'Extracted Microsoft Surface Pro 7 firmware and driver components with hardware mapping.',
    type: 'driver-package', technologies: [], year: 2026, status: 'public',
    href: 'https://github.com/lxrdxe7o/SurfacePro7-Drivers', repository: 'https://github.com/lxrdxe7o/SurfacePro7-Drivers',
  },
  {
    slug: 'block327',
    title: 'Block327',
    summary: 'Public software repository with Hack as its recorded language.',
    type: 'repository', technologies: ['Hack'], year: 2026, status: 'public',
    href: 'https://github.com/lxrdxe7o/block327', repository: 'https://github.com/lxrdxe7o/block327',
  },
  {
    slug: 'lxrdxe7o-me',
    title: 'Lxrdxe7o.me',
    summary: 'Public TypeScript repository for this portfolio.',
    type: 'portfolio', technologies: ['TypeScript'], year: 2025, status: 'public',
    href: 'https://github.com/lxrdxe7o/lxrdxe7o.me', repository: 'https://github.com/lxrdxe7o/lxrdxe7o.me',
  },
  {
    slug: 'lxrdxe7o',
    title: 'Lxrdxe7o',
    summary: 'Public GitHub profile configuration repository.',
    type: 'profile', technologies: [], year: 2022, status: 'public',
    href: 'https://github.com/lxrdxe7o/lxrdxe7o', repository: 'https://github.com/lxrdxe7o/lxrdxe7o',
  },
  {
    slug: 'enyo-claw',
    title: 'Enyo Claw',
    summary: 'Public software repository with Python as its recorded language.',
    type: 'utility', technologies: ['Python'], year: 2026, status: 'public',
    href: 'https://github.com/lxrdxe7o/Enyo-claw', repository: 'https://github.com/lxrdxe7o/Enyo-claw',
  },
  {
    slug: 'enyo-dev',
    title: 'Enyo Dev',
    summary: 'Public software repository retained as a concise archive record.',
    type: 'repository', technologies: [], year: 2026, status: 'public',
    href: 'https://github.com/lxrdxe7o/Enyo-dev', repository: 'https://github.com/lxrdxe7o/Enyo-dev',
  },
  {
    slug: 'wallpapers',
    title: 'Wallpapers',
    summary: 'Public wallpaper collection repository.',
    type: 'asset-collection', technologies: [], year: 2025, status: 'public',
    href: 'https://github.com/lxrdxe7o/wallpapers', repository: 'https://github.com/lxrdxe7o/wallpapers',
  },
  {
    slug: 'ds-test',
    title: 'Ds Test',
    summary: 'Public experiment repository with HTML as its recorded language.',
    type: 'experiment', technologies: ['HTML'], year: 2026, status: 'public',
    href: 'https://github.com/lxrdxe7o/ds-test', repository: 'https://github.com/lxrdxe7o/ds-test',
  },
  {
    slug: 'xero-shell',
    title: 'Xero Shell',
    summary: 'Public interface repository with QML as its recorded language.',
    type: 'interface', technologies: ['QML'], year: 2025, status: 'public',
    href: 'https://github.com/lxrdxe7o/xero-shell', repository: 'https://github.com/lxrdxe7o/xero-shell',
  },
];

export interface ArchiveFilters {
  query?: string;
  type?: string;
  technology?: string;
  year?: string;
  status?: string;
}

export function filterArchiveRecords(records: readonly ArchiveRecord[], filters: ArchiveFilters): ArchiveRecord[] {
  const query = filters.query?.trim().toLocaleLowerCase() ?? '';
  return records.filter((record) => {
    const searchable = [record.title, record.summary, record.type, ...record.technologies].join(' ').toLocaleLowerCase();
    if (query && !searchable.includes(query)) return false;
    if (filters.type && record.type !== filters.type) return false;
    if (filters.technology && !record.technologies.includes(filters.technology)) return false;
    if (filters.year && String(record.year ?? '') !== filters.year) return false;
    if (filters.status && record.status !== filters.status) return false;
    return true;
  });
}
