import { defineCollection, reference } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

import {
  buildProjectSchema,
  buildWritingSchema,
  buildNoteSchema,
  buildExperimentSchema,
} from './content/schema';

const projects = defineCollection({
  loader: glob({ base: './src/content/projects', pattern: '**/*.{md,mdx}' }),
  schema: buildProjectSchema(z),
});

const writing = defineCollection({
  loader: glob({ base: './src/content/writing', pattern: '**/*.{md,mdx}' }),
  // Writing may optionally reference published projects. `reference` validates
  // that the referenced ids exist in the `projects` collection at build time.
  schema: buildWritingSchema(z).and(
    z.object({ relatedProjects: z.array(reference('projects')).optional() }),
  ),
});

const notes = defineCollection({
  loader: glob({ base: './src/content/notes', pattern: '**/*.{md,mdx}' }),
  schema: buildNoteSchema(z),
});

const lab = defineCollection({
  loader: glob({ base: './src/content/lab', pattern: '**/*.{md,mdx}' }),
  schema: buildExperimentSchema(z),
});

export const collections = { projects, writing, notes, lab };
