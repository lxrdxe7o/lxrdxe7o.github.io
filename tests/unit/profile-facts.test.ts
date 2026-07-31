import { describe, expect, it } from 'vitest';
import { profileFacts, publishableProfileFacts, recognition, collaborators } from '../../src/data/profile';
import { experienceEntries } from '../../src/data/experience';
import { capabilityGroups } from '../../src/data/skills';

describe('verified profile data', () => {
  it('never exposes a non-publishable fact through the public selector', () => {
    expect(publishableProfileFacts().every((fact) => fact.publishable)).toBe(true);
    expect(publishableProfileFacts().length).toBe(profileFacts.filter((fact) => fact.publishable).length);
  });

  it('keeps project evidence date ordered without invented open-ended ranges', () => {
    const years = experienceEntries.map((entry) => entry.year);
    expect(years).toEqual([...years].sort((a, b) => b - a));
    expect(experienceEntries.every((entry) => !('endDate' in entry))).toBe(true);
  });

  it('requires evidence for every capability and never stores percentages', () => {
    for (const group of capabilityGroups) {
      expect(group.capabilities.length).toBeGreaterThan(0);
      for (const capability of group.capabilities) {
        expect(capability.evidence.length).toBeGreaterThan(0);
        expect(JSON.stringify(capability)).not.toMatch(/percent|proficiency|rating/i);
      }
    }
  });

  it('omits unverified recognition and collaborator modules', () => {
    expect(recognition).toEqual([]);
    expect(collaborators).toEqual([]);
  });
});
