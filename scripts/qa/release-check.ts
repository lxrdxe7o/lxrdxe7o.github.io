import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';

/**
 * Builds a reproducible release manifest: route inventory, asset hashes,
 * dependency versions, and approval status. Runs against the production
 * `dist/` after a clean build.
 */

export interface ReleaseManifest {
  schemaVersion: number;
  generatedAt: string;
  buildEnvironment: {
    node: string;
    npm: string;
  };
  routes: Array<{ path: string; bytes: number; sha256: string }>;
  dependencyVersions: Record<string, string>;
  approvalStatus: 'pending-user-approval';
}

async function collectDistFiles(distDir: string): Promise<string[]> {
  const entries = await readdir(distDir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const full = join(distDir, entry.name);
    if (entry.isDirectory()) files.push(...(await collectDistFiles(full)));
    else files.push(full);
  }
  return files;
}

export async function buildReleaseManifest(
  workspaceRoot: string,
  generatedAt = new Date().toISOString(),
): Promise<ReleaseManifest> {
  const distDir = resolve(workspaceRoot, 'dist');
  const pkgPath = resolve(workspaceRoot, 'package.json');
  const pkg = JSON.parse(await readFile(pkgPath, 'utf8')) as {
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
  };

  const files = await collectDistFiles(distDir);
  const routes = await Promise.all(
    files
      .filter((file) => file.endsWith('.html'))
      .map(async (file) => {
        const contents = await readFile(file);
        return {
          path: file.replace(distDir, '').replace(/^\/+/, '/'),
          bytes: contents.byteLength,
          sha256: createHash('sha256').update(contents).digest('hex'),
        };
      }),
  );

  return {
    schemaVersion: 1,
    generatedAt,
    buildEnvironment: {
      node: process.version,
      npm: process.env.npm_version ?? 'unknown',
    },
    routes: routes.sort((left, right) => left.path.localeCompare(right.path)),
    dependencyVersions: {
      ...pkg.dependencies,
      ...pkg.devDependencies,
    },
    approvalStatus: 'pending-user-approval',
  };
}

export async function writeReleaseManifest(
  workspaceRoot: string,
): Promise<ReleaseManifest> {
  const manifest = await buildReleaseManifest(workspaceRoot);
  const { writeFile, mkdir } = await import('node:fs/promises');
  const outDir = resolve(workspaceRoot, 'artifacts');
  await mkdir(outDir, { recursive: true });
  await writeFile(
    join(outDir, 'release-manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8',
  );
  return manifest;
}

export async function verifyReleaseManifest(
  workspaceRoot: string,
  existing: ReleaseManifest,
): Promise<boolean> {
  const rebuilt = await buildReleaseManifest(
    workspaceRoot,
    existing.generatedAt,
  );
  return (
    JSON.stringify(rebuilt.routes) === JSON.stringify(existing.routes) &&
    JSON.stringify(rebuilt.dependencyVersions) ===
      JSON.stringify(existing.dependencyVersions)
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const workspaceRoot = process.cwd();
  const manifest = await writeReleaseManifest(workspaceRoot);
  const { readFile } = await import('node:fs/promises');
  const previousPath = join(workspaceRoot, 'artifacts/release-manifest.json');
  const previous = JSON.parse(await readFile(previousPath, 'utf8')) as ReleaseManifest;
  const reproducible = await verifyReleaseManifest(workspaceRoot, previous);
  console.log(
    JSON.stringify(
      {
        routes: manifest.routes.length,
        reproducible,
        approvalStatus: manifest.approvalStatus,
      },
      null,
      2,
    ),
  );
  if (!reproducible) process.exit(1);
}
