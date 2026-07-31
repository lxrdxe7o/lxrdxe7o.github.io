import type { Fact } from './facts';
import { approvedFact, publishableFacts } from './editorial';

export interface ProfileField {
  key: 'mark' | 'name' | 'title';
  label: string;
  value: string;
}

export const profileFacts: readonly Fact<ProfileField>[] = [
  approvedFact({ key: 'mark', label: 'Public identity', value: 'lxrdxe7o' }, 'plan.md#2.1'),
  approvedFact({ key: 'name', label: 'Name', value: 'Ishraful Haque' }, 'plan.md#2.1'),
  approvedFact({ key: 'title', label: 'Professional title', value: 'Full-Stack Developer' }, 'plan.md#2.1'),
];

export const biographyFacts: readonly Fact<string>[] = [
  approvedFact(
    'Ishraful Haque publishes independent software work under the name lxrdxe7o.',
    'plan.md#2.1',
  ),
  approvedFact(
    'The public project record includes TypeScript web publishing, Lua editor configuration, Rust terminal tooling, and software written in C, PHP, and Java.',
    'artifacts/audit/reports/portfolio-audit.md',
  ),
];

export interface ExternalEntity {
  name: string;
  href: string;
  context: string;
}

export const recognition: readonly ExternalEntity[] = [];
export const collaborators: readonly ExternalEntity[] = [];

export interface Credit {
  category: 'Typography' | 'Technology' | 'Media';
  name: string;
  href?: string;
  note: string;
}

export const credits: readonly Credit[] = [
  { category: 'Typography', name: 'Geist', note: 'Display and interface typeface; self-hosted with its repository license.' },
  { category: 'Typography', name: 'JetBrains Mono', note: 'Technical and metadata typeface; self-hosted with its repository license.' },
  { category: 'Technology', name: 'Astro', href: 'https://astro.build/', note: 'Static route and content framework.' },
  { category: 'Media', name: 'Project captures', note: 'Original captures from owned public projects; provenance is recorded in each media manifest.' },
];

export function publishableProfileFacts(): Fact<ProfileField>[] {
  return publishableFacts(profileFacts);
}

export function profileValue(key: ProfileField['key']): string | undefined {
  return publishableProfileFacts().find((fact) => fact.value.key === key)?.value.value;
}
