import { describe, expect, it } from 'vitest';
import { usesEntries, usesReviewedAt, isEditorialReviewCurrent, assertEditorialReviewCurrent } from '../../src/data/uses';
import { nowEntries, nowReviewedAt } from '../../src/data/now';
import { contactLinks, isValidContactHref } from '../../src/data/contact';

describe('utility content', () => {
  it('gives every uses entry provenance and a visible review date', () => {
    expect(usesEntries.length).toBeGreaterThan(0);
    for (const entry of usesEntries) {
      expect(entry.fact.publishable).toBe(true);
      expect(entry.fact.source).toBeTruthy();
      expect(entry.reviewedAt).toEqual(usesReviewedAt);
    }
  });

  it('marks stale editorial reviews as expired', () => {
    expect(isEditorialReviewCurrent(usesReviewedAt, new Date('2026-08-01'), 550)).toBe(true);
    expect(isEditorialReviewCurrent(usesReviewedAt, new Date('2029-01-01'), 550)).toBe(false);
    expect(() => assertEditorialReviewCurrent(usesReviewedAt, new Date('2029-01-01'), 550)).toThrow(/expired/i);
  });

  it('publishes only approved Now statements with one visible review date', () => {
    expect(nowEntries.every((entry) => entry.fact.publishable)).toBe(true);
    expect(nowReviewedAt.toISOString()).toContain('2026-07-21');
  });

  it('allows only valid mailto and https contact URIs', () => {
    expect(contactLinks.length).toBe(2);
    expect(contactLinks.every((link) => isValidContactHref(link.href))).toBe(true);
    expect(isValidContactHref('javascript:alert(1)')).toBe(false);
    expect(isValidContactHref('mailto:not-an-email')).toBe(false);
  });
});
