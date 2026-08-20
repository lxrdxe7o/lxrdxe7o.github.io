import { describe, expect, it } from 'vitest';

import {
  buildReleaseManifest,
  verifyReleaseManifest,
  type ReleaseManifest,
} from '../../scripts/qa/release-check';

describe('release manifest', () => {
  it('records every built route with a hash and byte size', async () => {
    const manifest = await buildReleaseManifest(process.cwd(), '2026-08-16T00:00:00.000Z');
    expect(manifest.schemaVersion).toBe(1);
    expect(manifest.routes.length).toBeGreaterThanOrEqual(22);
    for (const route of manifest.routes) {
      expect(route.path).toMatch(/\/(index\.html|404\.html)$|\.html$/);
      expect(route.bytes).toBeGreaterThan(0);
      expect(route.sha256).toMatch(/^[a-f0-9]{64}$/);
    }
  });

  it('records pinned dependency versions', async () => {
    const manifest = await buildReleaseManifest(process.cwd(), '2026-08-16T00:00:00.000Z');
    expect(manifest.dependencyVersions.astro).toBe('7.1.2');
    expect(manifest.dependencyVersions.three).toBe('0.185.1');
  });

  it('is reproducible for identical inputs', async () => {
    const first = await buildReleaseManifest(process.cwd(), '2026-08-16T00:00:00.000Z');
    const second = await buildReleaseManifest(process.cwd(), '2026-08-16T00:00:00.000Z');
    expect(second.routes).toEqual(first.routes);
    expect(second.dependencyVersions).toEqual(first.dependencyVersions);
  });

  it('verifies an existing manifest against a clean rebuild', async () => {
    const existing: ReleaseManifest = await buildReleaseManifest(
      process.cwd(),
      '2026-08-16T00:00:00.000Z',
    );
    expect(await verifyReleaseManifest(process.cwd(), existing)).toBe(true);
  });

  it('marks approval status as pending until the user signs off', async () => {
    const manifest = await buildReleaseManifest(process.cwd(), '2026-08-16T00:00:00.000Z');
    expect(manifest.approvalStatus).toBe('pending-user-approval');
  });
});
