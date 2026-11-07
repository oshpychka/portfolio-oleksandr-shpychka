export type Todo = `TODO:${string}`;

export type ProjectType = 'commercial' | 'personal';

export interface ProjectEntry {
  slug: string;
  title: string;
  year: number | Todo;
  type: ProjectType;
  role: string;
  stack: string[];
  summary: string;
  cover: string;
  gallery?: string[];
  liveUrl?: string;
  codeUrl?: string;
  featured?: boolean;
  order?: number;
  challenge?: string;
  solution?: string;
  result?: string;
}
