export interface RepositoryEvidence {
  name: string;
  fullName: string;
  sourceUrl: string;
  visibility: 'public' | 'private';
  description: string | null;
  languages: string[];
  topics: string[];
  createdAt: string;
  updatedAt: string;
  pushedAt: string;
  stars: number;
  forks: number;
  isFork: boolean;
  isArchived: boolean;
  license: string | null;
  homepageUrl: string | null;
  hasDocumentation: boolean;
  hasScreenshots: boolean;
}

export type CurationClassification = 'flagship' | 'archive' | 'excluded';

export interface CurationCandidate {
  slug: string;
  title: string;
  evidence: RepositoryEvidence;
  classification: CurationClassification;
  score: number;
  strengths: string[];
  contentGaps: string[];
  visualPotential: 'high' | 'medium' | 'low';
  maintenanceState: 'active' | 'stable' | 'legacy' | 'archived';
  draftPositioning: string;
  blockedClaims: string[];
  proposedOrder?: number;
}

export interface AuditReport {
  generatedAt: string;
  username: string;
  totalRepositoriesAudited: number;
  flagshipCandidates: CurationCandidate[];
  archiveCandidates: CurationCandidate[];
  excludedCandidates: CurationCandidate[];
  missingUserFacts: string[];
  mediaProductionNeeds: string[];
}
