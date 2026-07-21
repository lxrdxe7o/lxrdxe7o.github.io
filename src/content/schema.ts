/**
 * Strict zod schema factories for every content collection.
 *
 * Each factory receives the `z` namespace rather than importing zod directly,
 * which keeps this module free of the `astro:content` runtime so the schemas are
 * unit-testable in Vitest. `src/content.config.ts` calls these factories with the
 * `z` exported from `astro:content`; the tests call them with the same bundled zod.
 *
 * Guarantees enforced here (see Task 3): valid URLs, accessible media (alt/poster
 * or an explicit decorative flag), plausible/consistent dates, and — critically —
 * that no public (non-draft) entry can carry a non-publishable fact.
 */
import { buildFactSchema, assertPublishableForPublicEntry } from '../data/facts';

/** Zod namespace type, sourced from Astro without a runtime import. */
type Zod = (typeof import('astro/zod'))['z'];

const MIN_YEAR = 1990;
const MAX_YEAR = new Date().getFullYear() + 1;

/** Media manifest item: images need alt text (or decorative), videos need poster + alt. */
export function buildMediaSchema(z: Zod) {
  return z
    .object({
      type: z.enum(['image', 'video']).default('image'),
      src: z.string().min(1, 'Media requires a src'),
      alt: z.string().min(1).optional(),
      poster: z.string().min(1).optional(),
      decorative: z.boolean().optional(),
    })
    .superRefine((media, ctx) => {
      if (media.type === 'image') {
        const hasAlt = typeof media.alt === 'string' && media.alt.length > 0;
        if (!media.decorative && !hasAlt) {
          ctx.addIssue({
            code: 'custom',
            message: 'Image media requires non-empty alt text unless decorative:true',
            path: ['alt'],
          });
        }
      } else {
        const hasPoster = typeof media.poster === 'string' && media.poster.length > 0;
        const hasAlt = typeof media.alt === 'string' && media.alt.length > 0;
        if (!hasPoster) {
          ctx.addIssue({ code: 'custom', message: 'Video media requires a poster', path: ['poster'] });
        }
        if (!hasAlt) {
          ctx.addIssue({ code: 'custom', message: 'Video media requires alt text', path: ['alt'] });
        }
      }
    });
}

interface PublishableEntry {
  draft: boolean;
  facts?: ReadonlyArray<{ publishable: boolean }>;
}

/** Shared refinement: a public entry must not carry a non-publishable fact. */
function refinePublishable(
  data: PublishableEntry,
  ctx: { addIssue: (issue: { code: 'custom'; message: string; path: (string | number)[] }) => void },
): void {
  if (!assertPublishableForPublicEntry(data.draft, data.facts)) {
    ctx.addIssue({
      code: 'custom',
      message: 'A public (draft:false) entry cannot contain a fact with publishable:false',
      path: ['facts'],
    });
  }
}

/** Project collection schema. */
export function buildProjectSchema(z: Zod) {
  const media = buildMediaSchema(z);
  const fact = buildFactSchema(z);
  return z
    .object({
      slug: z.string().min(1),
      title: z.string().min(1),
      summary: z.string().min(1),
      draft: z.boolean().default(false),
      status: z.enum(['active', 'archived', 'concept', 'maintenance']).optional(),
      featured: z.number().int().nonnegative().optional(),
      repository: z.url().optional(),
      live: z.url().optional(),
      links: z
        .array(z.object({ label: z.string().min(1), url: z.url() }))
        .optional(),
      roles: z.array(z.string().min(1)).default([]),
      technologies: z.array(z.string().min(1)).default([]),
      year: z.number().int().min(MIN_YEAR).max(MAX_YEAR).optional(),
      startDate: z.coerce.date().optional(),
      endDate: z.coerce.date().optional(),
      media: z.array(media).default([]),
      credits: z.array(z.string().min(1)).optional(),
      facts: z.array(fact).optional(),
    })
    .superRefine((data, ctx) => {
      if (data.startDate && data.endDate && data.endDate.getTime() < data.startDate.getTime()) {
        ctx.addIssue({
          code: 'custom',
          message: 'endDate must be on or after startDate',
          path: ['endDate'],
        });
      }
      refinePublishable(data, ctx);
    });
}

/** Writing (articles) collection schema. */
export function buildWritingSchema(z: Zod) {
  const fact = buildFactSchema(z);
  return z
    .object({
      slug: z.string().min(1),
      title: z.string().min(1),
      description: z.string().min(1),
      draft: z.boolean().default(false),
      publishDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      tags: z.array(z.string().min(1)).optional(),
      facts: z.array(fact).optional(),
    })
    .superRefine((data, ctx) => {
      if (data.updatedDate && data.updatedDate.getTime() < data.publishDate.getTime()) {
        ctx.addIssue({
          code: 'custom',
          message: 'updatedDate must be on or after publishDate',
          path: ['updatedDate'],
        });
      }
      refinePublishable(data, ctx);
    });
}

/** Notes collection schema. */
export function buildNoteSchema(z: Zod) {
  const fact = buildFactSchema(z);
  return z
    .object({
      slug: z.string().min(1),
      title: z.string().min(1),
      draft: z.boolean().default(false),
      date: z.coerce.date(),
      tags: z.array(z.string().min(1)).optional(),
      facts: z.array(fact).optional(),
    })
    .superRefine(refinePublishable);
}

/** Lab (experiments) collection schema. Lightweight; Task 22 expands it. */
export function buildExperimentSchema(z: Zod) {
  const fact = buildFactSchema(z);
  return z
    .object({
      id: z.string().min(1),
      slug: z.string().min(1),
      title: z.string().min(1),
      draft: z.boolean().default(false),
      seed: z.number().int().optional(),
      capabilityRequirements: z.array(z.string().min(1)).optional(),
      controlSchema: z.record(z.string(), z.unknown()).optional(),
      facts: z.array(fact).optional(),
    })
    .superRefine(refinePublishable);
}
