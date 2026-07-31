import type { Fact } from './facts';
import { approvedFact, EDITORIAL_VERIFIED_AT } from './editorial';

export interface UsesValue {
  item: string;
  purpose: string;
}

export interface UsesEntry {
  category: 'Editor' | 'Workflow' | 'Platform' | 'Service';
  fact: Fact<UsesValue>;
  link?: string;
  reviewedAt: Date;
}

export const usesReviewedAt = EDITORIAL_VERIFIED_AT;

export const usesEntries: readonly UsesEntry[] = [
  {
    category: 'Editor',
    fact: approvedFact({ item: 'Neovim', purpose: 'Editor configuration maintained through KrakenVim.' }, 'https://github.com/lxrdxe7o/KrakenVim'),
    link: 'https://github.com/lxrdxe7o/KrakenVim',
    reviewedAt: usesReviewedAt,
  },
  {
    category: 'Workflow',
    fact: approvedFact({ item: 'GNU Stow', purpose: 'Manages the public workstation configuration repository.' }, 'https://github.com/lxrdxe7o/dotfiles'),
    link: 'https://github.com/lxrdxe7o/dotfiles',
    reviewedAt: usesReviewedAt,
  },
  {
    category: 'Platform',
    fact: approvedFact({ item: 'Linux, Hyprland, and Wayland', purpose: 'Recorded platform and desktop environment configuration.' }, 'https://github.com/lxrdxe7o/dotfiles'),
    link: 'https://github.com/lxrdxe7o/dotfiles',
    reviewedAt: usesReviewedAt,
  },
  {
    category: 'Service',
    fact: approvedFact({ item: 'GitHub', purpose: 'Hosts the public source repositories referenced throughout this portfolio.' }, 'https://github.com/lxrdxe7o'),
    link: 'https://github.com/lxrdxe7o',
    reviewedAt: usesReviewedAt,
  },
];

export function isEditorialReviewCurrent(reviewedAt: Date, now = new Date(), maxAgeDays = 550): boolean {
  const age = now.getTime() - reviewedAt.getTime();
  return age >= 0 && age <= maxAgeDays * 24 * 60 * 60 * 1000;
}

export function assertEditorialReviewCurrent(reviewedAt: Date, now = new Date(), maxAgeDays = 550): void {
  if (!isEditorialReviewCurrent(reviewedAt, now, maxAgeDays)) {
    throw new Error(`Editorial review expired: ${reviewedAt.toISOString()}`);
  }
}
