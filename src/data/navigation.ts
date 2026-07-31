/**
 * Single source of truth for route labels/links used by the persistent
 * shell (header, footer) and, later, the full-screen Index (Task 16).
 * Nothing else should hardcode a route label — import from here instead.
 */

export interface NavLink {
  label: string;
  href: string;
}

/** The two most prominent controls, per the plan's "Work/About emphasis". */
export const primaryLinks: readonly NavLink[] = [
  { label: 'Work', href: '/projects' },
  { label: 'About', href: '/about' },
];

/** Every other public route, surfaced in the footer until the Index exists. */
export const secondaryLinks: readonly NavLink[] = [
  { label: 'Experience', href: '/experience' },
  { label: 'Skills', href: '/skills' },
  { label: 'Uses', href: '/uses' },
  { label: 'Writing', href: '/blog' },
  { label: 'Notes', href: '/notes' },
  { label: 'Now', href: '/now' },
  { label: 'Contact', href: '/contact' },
];

/** Verified public profile links. Never fabricate an unverified profile here. */
export const socialLinks: readonly NavLink[] = [{ label: 'GitHub', href: 'https://github.com/lxrdxe7o' }];
