// ═══════════════════════════════════════════════════════════════════════════
//  TypeScript Type Definitions
// ═══════════════════════════════════════════════════════════════════════════

export interface Project {
  id: string;
  title: string;
  icon: string;
  description: string;
  tags: string[];
  accentTag?: string;
  features: string[];
  github: string;
  featured: boolean;
}

export interface Skill {
  name: string;
  icon: string;
}

export interface SkillCategory {
  title: string;
  skills: Skill[];
}

export interface Stat {
  number: string;
  label: string;
}

export interface Profile {
  name: string;
  roles: string[];
  tagline: string;
  description: string;
  github: string;
  githubUsername: string;
  about: {
    paragraphs: string[];
    stats: Stat[];
  };
  codePreview: {
    title: string;
    code: string;
  };
}

// CSS Module types
declare module '*.module.css' {
  const classes: { [key: string]: string };
  export default classes;
}
