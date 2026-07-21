/**
 * Fact provenance model and publishability rules.
 *
 * A `Fact<T>` binds a value to its verifiable source. Only facts that have been
 * verified and cleared may appear on public (non-draft) entries. This module is
 * intentionally free of any `astro:content` runtime import so it is unit-testable
 * in Vitest. The zod schema is exposed as a factory that receives the `z`
 * namespace (Astro injects its own zod; tests inject the same bundled zod).
 */

/** Zod namespace type, sourced from Astro without a runtime import. */
type Zod = (typeof import('astro/zod'))['z'];

/**
 * A single provenance-tracked fact.
 * @typeParam T - the shape of the fact value.
 */
export interface Fact<T = unknown> {
  /** The asserted value (metric, date, claim, etc.). */
  value: T;
  /** Where the value came from: a URL, citation, or internal reference. */
  source: string;
  /** When the value was last verified. */
  verifiedAt: Date;
  /** Whether the fact is cleared to appear on public entries. */
  publishable: boolean;
}

/** Minimal shape needed to reason about publishability. */
export interface PublishableLike {
  publishable: boolean;
}

/** Build the zod schema for a single {@link Fact}. */
export function buildFactSchema(z: Zod) {
  return z.object({
    // A fact must carry a value; `unknown` allows any shape but rejects `undefined`.
    value: z.unknown().refine((v) => v !== undefined, 'A fact requires a value'),
    source: z.string().min(1, 'A fact requires a non-empty source'),
    verifiedAt: z.coerce.date(),
    publishable: z.boolean(),
  });
}

/** Return the indexes of any facts that are not publishable. */
export function findNonPublishableFacts(
  facts: ReadonlyArray<PublishableLike> | undefined | null,
): number[] {
  if (!facts) return [];
  const result: number[] = [];
  facts.forEach((fact, index) => {
    if (!fact.publishable) result.push(index);
  });
  return result;
}

/**
 * A public (non-draft) entry may not contain any non-publishable fact.
 * Draft entries may retain non-publishable facts.
 */
export function assertPublishableForPublicEntry(
  draft: boolean,
  facts: ReadonlyArray<PublishableLike> | undefined | null,
): boolean {
  if (draft) return true;
  return findNonPublishableFacts(facts).length === 0;
}
