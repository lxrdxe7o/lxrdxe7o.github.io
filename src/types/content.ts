/**
 * TypeScript shapes for typed content entries.
 *
 * These mirror the zod schemas in `src/content/schema.ts` and provide ergonomic
 * types for consumers (pages, components) without depending on generated Astro
 * collection types. The generic {@link Fact} is re-exported from the fact model.
 */
export type { Fact } from '../data/facts';

/** A media manifest item (image or video). */
export interface MediaItem {
  type: 'image' | 'video';
  src: string;
  /** Required for images unless `decorative` is true; always required for videos. */
  alt?: string;
  /** Required for videos. */
  poster?: string;
  /** Marks a purely decorative image so it may omit alt text. */
  decorative?: boolean;
}

/** A labelled external link. */
export interface EntryLink {
  label: string;
  url: string;
}

/** Publication status of a project. */
export type ProjectStatus = 'active' | 'archived' | 'concept' | 'maintenance';

/** A typed project entry (frontmatter + provenance). */
export interface ProjectEntry {
  slug: string;
  title: string;
  summary: string;
  draft: boolean;
  status?: ProjectStatus;
  /** Lower rank = higher priority; unranked entries sort last. */
  featured?: number;
  repository?: string;
  live?: string;
  links?: EntryLink[];
  roles: string[];
  technologies: string[];
  /** Only set when independently verified. */
  year?: number;
  startDate?: Date;
  endDate?: Date;
  media: MediaItem[];
  credits?: string[];
  facts?: import('../data/facts').Fact[];
}

/** A typed article/blog entry. */
export interface ArticleEntry {
  slug: string;
  title: string;
  description: string;
  draft: boolean;
  publishDate: Date;
  updatedDate?: Date;
  tags?: string[];
  facts?: import('../data/facts').Fact[];
}

/** A typed note entry. */
export interface NoteEntry {
  slug: string;
  title: string;
  draft: boolean;
  date: Date;
  tags?: string[];
  facts?: import('../data/facts').Fact[];
}

/** A typed lab experiment entry. */
export interface ExperimentEntry {
  id: string;
  slug: string;
  title: string;
  draft: boolean;
  seed?: number;
  capabilityRequirements?: string[];
  controlSchema?: Record<string, unknown>;
  facts?: import('../data/facts').Fact[];
}
