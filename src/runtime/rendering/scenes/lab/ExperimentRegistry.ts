/**
 * Experiment registry: every Lab experiment declares its identity, seed,
 * capability requirements, and cleanup so the runtime can own exactly one
 * renderer across Lab and non-Lab routes.
 */

import { hashSeed, SeededRandom } from '../../SeededRandom';

export interface ExperimentDefinition {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  /** Required for seeded experiments; missing seed means no randomness. */
  readonly seed?: number;
  readonly capabilityRequirements: readonly string[];
  readonly controlSchema: Readonly<Record<string, { min: number; max: number; step: number; default: number }>>;
}

export interface ExperimentState {
  readonly experiment: ExperimentDefinition;
  readonly params: Readonly<Record<string, number>>;
  readonly random: SeededRandom;
}

const REGISTRY = new Map<string, ExperimentDefinition>();

export function registerExperiment(definition: ExperimentDefinition): void {
  if (REGISTRY.has(definition.id)) {
    throw new Error(`Duplicate experiment id: ${definition.id}`);
  }
  REGISTRY.set(definition.id, Object.freeze({ ...definition }));
}

export function getExperiment(id: string): ExperimentDefinition | null {
  return REGISTRY.get(id) ?? null;
}

export function listExperiments(): readonly ExperimentDefinition[] {
  return [...REGISTRY.values()];
}

export function parseExperimentParams(
  definition: ExperimentDefinition,
  raw: Readonly<Record<string, string>>,
): Readonly<Record<string, number>> {
  const params: Record<string, number> = {};
  for (const [key, schema] of Object.entries(definition.controlSchema)) {
    const candidate = Number(raw[key]);
    const fallback = schema.default;
    const value = Number.isFinite(candidate)
      ? Math.min(schema.max, Math.max(schema.min, candidate))
      : fallback;
    params[key] = Math.round(value / schema.step) * schema.step;
  }
  return Object.freeze(params);
}

export function createExperimentState(
  definition: ExperimentDefinition,
  raw: Readonly<Record<string, string>> = {},
): ExperimentState {
  const params = parseExperimentParams(definition, raw);
  const seed = hashSeed(
    `${definition.seed ?? 0}:${Object.entries(params)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => `${key}=${value}`)
      .join(',')}`,
  );
  return Object.freeze({
    experiment: definition,
    params,
    random: new SeededRandom(seed),
  });
}

// Plan compat: simple class registry for Lab engine
export class ExperimentRegistry {
  private experiments: Map<string, unknown> = new Map();

  public register(id: string, experimentClass: unknown): void {
    this.experiments.set(id, experimentClass);
  }

  public get(id: string): unknown {
    return this.experiments.get(id);
  }
}
