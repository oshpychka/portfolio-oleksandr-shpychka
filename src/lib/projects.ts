import type { ImageMetadata } from 'astro';
import { projects as entries } from '../data/projects';
import type { ProjectEntry } from '../data/types';

export interface Project extends Omit<ProjectEntry, 'cover' | 'gallery'> {
  cover: ImageMetadata;
  gallery: ImageMetadata[];
  isTodo: boolean;
}

const images = import.meta.glob<{ default: ImageMetadata }>(
  '/src/assets/projects/*/*.{jpg,jpeg,png,webp,avif}',
  { eager: true },
);

const REQUIRED = ['slug', 'title', 'year', 'type', 'role', 'stack', 'summary', 'cover'] as const;
const TYPES = ['commercial', 'personal'];
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

class ProjectDataError extends Error {
  constructor(where: string, message: string) {
    super(`[src/data/projects.ts] ${where}: ${message}`);
    this.name = 'ProjectDataError';
  }
}

const isEmpty = (value: unknown) =>
  value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);

const isTodoValue = (value: unknown) => typeof value === 'string' && value.startsWith('TODO:');

function resolveImage(slug: string, file: string, field: string): ImageMetadata {
  const key = `/src/assets/projects/${slug}/${file}`;
  const mod = images[key];
  if (!mod) {
    throw new ProjectDataError(
      `"${slug}".${field}`,
      `image not found at ${key.slice(1)}. Put the file into src/assets/projects/${slug}/ (jpg, png, webp or avif).`,
    );
  }
  return mod.default;
}

function checkUrl(slug: string, field: string, value: unknown) {
  if (value === undefined) return;
  if (typeof value !== 'string' || !/^https?:\/\//.test(value)) {
    throw new ProjectDataError(`"${slug}".${field}`, 'must be an absolute http(s) URL or be removed.');
  }
}

function validate(entry: ProjectEntry, index: number): Project {
  const where = entry?.slug ? `"${entry.slug}"` : `entry #${index + 1}`;
  for (const field of REQUIRED) {
    if (isEmpty(entry[field])) throw new ProjectDataError(where, `required field "${field}" is missing.`);
  }
  if (!SLUG.test(entry.slug)) {
    throw new ProjectDataError(where, 'slug must be lowercase latin letters, digits and hyphens.');
  }
  if (!TYPES.includes(entry.type)) {
    throw new ProjectDataError(where, `type must be 'commercial' or 'personal', got "${entry.type}".`);
  }
  if (typeof entry.year !== 'number' && !isTodoValue(entry.year)) {
    throw new ProjectDataError(where, 'year must be a number.');
  }
  checkUrl(entry.slug, 'liveUrl', entry.liveUrl);
  checkUrl(entry.slug, 'codeUrl', entry.codeUrl);

  const isTodo = [entry.year, entry.role, entry.summary, entry.challenge, entry.solution, entry.result].some(isTodoValue);

  return {
    ...entry,
    cover: resolveImage(entry.slug, entry.cover, 'cover'),
    gallery: (entry.gallery ?? []).map((file, i) => resolveImage(entry.slug, file, `gallery[${i}]`)),
    isTodo,
  };
}

function build(): Project[] {
  const seen = new Set<string>();
  const list = entries.map((entry, index) => {
    const project = validate(entry, index);
    if (seen.has(project.slug)) throw new ProjectDataError(`"${project.slug}"`, 'duplicate slug.');
    seen.add(project.slug);
    return project;
  });
  return list.sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity));
}

export const allProjects = build();

export const featuredProjects = allProjects.filter((p) => p.featured);

export const getProject = (slug: string) => allProjects.find((p) => p.slug === slug);

export const getNextProject = (slug: string) => {
  const i = allProjects.findIndex((p) => p.slug === slug);
  return allProjects[(i + 1) % allProjects.length];
};
