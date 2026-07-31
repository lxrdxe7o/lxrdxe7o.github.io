import type { Fact } from './facts';
import { approvedFact, EDITORIAL_VERIFIED_AT } from './editorial';

export interface NowEntry {
  label: string;
  fact: Fact<string>;
}

export const nowReviewedAt = EDITORIAL_VERIFIED_AT;

export const nowEntries: readonly NowEntry[] = [
  {
    label: 'Public work',
    fact: approvedFact(
      'The approved project record marks public work as active across web publishing, editor configuration, terminal tooling, and software utilities.',
      'artifacts/audit/reports/portfolio-audit.md',
    ),
  },
];
