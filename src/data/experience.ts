import type { Fact } from './facts';
import { approvedFact } from './editorial';

export interface ExperienceEvidence {
  label: string;
  href: string;
}

export interface ExperienceEntry {
  year: number;
  project: string;
  role: string;
  summary: string;
  evidence: readonly ExperienceEvidence[];
  fact: Fact<string>;
}

export const experienceEntries: readonly ExperienceEntry[] = [
  {
    year: 2025,
    project: 'Xero.dev',
    role: 'Full-Stack Developer',
    summary: 'Personal developer blog and publication platform built with TypeScript and Next.js.',
    evidence: [{ label: 'Source repository', href: 'https://github.com/lxrdxe7o/xero.dev' }],
    fact: approvedFact('Xero.dev project role and 2025 project year', 'src/content/projects/xero-dev.mdx'),
  },
  {
    year: 2025,
    project: 'KrakenVim',
    role: 'Developer',
    summary: 'A Neovim configuration distribution built in Lua.',
    evidence: [{ label: 'Source repository', href: 'https://github.com/lxrdxe7o/KrakenVim' }],
    fact: approvedFact('KrakenVim project role and 2025 project year', 'src/content/projects/krakenvim.mdx'),
  },
  {
    year: 2025,
    project: 'Hachi',
    role: 'Developer',
    summary: 'A terminal interface for the asusctl Linux utility, written in Rust.',
    evidence: [{ label: 'Source repository', href: 'https://github.com/lxrdxe7o/hachi' }],
    fact: approvedFact('Hachi project role and 2025 project year', 'src/content/projects/hachi.mdx'),
  },
];
