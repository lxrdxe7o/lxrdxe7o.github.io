import type { Fact } from './facts';
import { approvedFact } from './editorial';

export interface ContactLink {
  kind: 'email' | 'external';
  label: string;
  display: string;
  href: string;
  accessibleLabel: string;
  fact: Fact<string>;
}

export function isValidContactHref(href: string): boolean {
  if (href.startsWith('mailto:')) {
    const address = href.slice('mailto:'.length);
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address);
  }
  try {
    return new URL(href).protocol === 'https:';
  } catch {
    return false;
  }
}

const configuredLinks: readonly ContactLink[] = [
  {
    kind: 'email',
    label: 'Email',
    display: 'ishrak7106@gmail.com',
    href: 'mailto:ishrak7106@gmail.com',
    accessibleLabel: 'Email Ishraful Haque',
    fact: approvedFact('ishrak7106@gmail.com', 'https://github.com/lxrdxe7o/lxrdxe7o.me'),
  },
  {
    kind: 'external',
    label: 'GitHub',
    display: 'github.com/lxrdxe7o',
    href: 'https://github.com/lxrdxe7o',
    accessibleLabel: 'Open GitHub profile',
    fact: approvedFact('https://github.com/lxrdxe7o', 'src/data/navigation.ts'),
  },
];

export const contactLinks = configuredLinks.filter((link) => link.fact.publishable && isValidContactHref(link.href));
