import type { CurationCandidate, CurationClassification, RepositoryEvidence } from '../../src/types/audit';

export function scoreAndClassifyRepository(repo: RepositoryEvidence): CurationCandidate {
  let score = 50;
  const strengths: string[] = [];
  const contentGaps: string[] = [];
  const blockedClaims: string[] = [];

  // Description check
  if (!repo.description) {
    contentGaps.push('Missing repository description');
    score -= 15;
  } else {
    strengths.push('Has repository description');
    score += 10;
  }

  // Documentation check
  if (repo.hasDocumentation) {
    strengths.push('Contains documentation / README');
    score += 15;
  } else {
    contentGaps.push('Lacks dedicated documentation or README');
    score -= 10;
  }

  // Screenshots check
  if (repo.hasScreenshots) {
    strengths.push('Has visual preview / screenshots in repository');
    score += 15;
  } else {
    contentGaps.push('Missing recorded visual assets');
  }

  // Homepage / Live site check
  if (repo.homepageUrl) {
    strengths.push(`Live deployment available at ${repo.homepageUrl}`);
    score += 15;
  } else {
    contentGaps.push('No live deployment URL listed');
  }

  // Stars & Forks
  score += Math.min(repo.stars * 2, 20);
  if (repo.stars > 5) {
    strengths.push(`Community interest (${repo.stars} stars)`);
  }

  // Fork check
  if (repo.isFork) {
    score -= 40;
    contentGaps.push('Repository is a fork of an external project');
  }

  // License check
  if (repo.license) {
    strengths.push(`Open source license (${repo.license})`);
    score += 5;
  } else {
    contentGaps.push('No license file found');
  }

  // Bound score 0-100
  score = Math.max(0, Math.min(100, score));

  // Determine maintenance state
  let maintenanceState: CurationCandidate['maintenanceState'] = 'active';
  if (repo.isArchived) {
    maintenanceState = 'archived';
  } else {
    const pushedYear = new Date(repo.pushedAt).getFullYear();
    if (pushedYear < 2024) {
      maintenanceState = 'legacy';
    } else if (pushedYear < 2025) {
      maintenanceState = 'stable';
    }
  }

  // Classification
  let classification: CurationClassification = 'archive';
  if (repo.isFork && repo.stars < 20) {
    classification = 'excluded';
  } else if (repo.isArchived) {
    classification = 'archive';
  } else if (score >= 65 && !repo.isFork) {
    classification = 'flagship';
  } else if (score >= 35) {
    classification = 'archive';
  } else {
    classification = 'excluded';
  }

  // Determine visual potential
  let visualPotential: CurationCandidate['visualPotential'] = 'low';
  if (repo.homepageUrl || repo.hasScreenshots || repo.topics.some((t) => ['web', 'webgl', 'portfolio', 'ui', 'frontend', 'app'].includes(t.toLowerCase()))) {
    visualPotential = 'high';
  } else if (repo.languages.some((l) => ['TypeScript', 'JavaScript', 'HTML', 'Vue', 'React', 'CSS', 'Svelte'].includes(l))) {
    visualPotential = 'medium';
  }

  // Draft positioning from evidence only
  const draftPositioning = repo.description
    ? `${repo.name}: ${repo.description}`
    : `${repo.name} - Open source project built with ${repo.languages.join(', ') || 'code'}.`;

  const slug = repo.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  return {
    slug,
    title: formatTitle(repo.name),
    evidence: repo,
    classification,
    score,
    strengths,
    contentGaps,
    visualPotential,
    maintenanceState,
    draftPositioning,
    blockedClaims,
  };
}

export function validateFactClaims(text: string, verifiedFacts: string[]): { cleanPositioning: string; blockedClaims: string[] } {
  const blockedClaims: string[] = [];
  let cleanPositioning = text;

  // Regex patterns for unverified numbers/metrics like 1,000,000 users, $50k revenue, etc.
  const suspiciousMetricsPattern = /((?:\d+[\d,.]*|\$\d+[\d,.]*)\s*(?:users|downloads|revenue|uptime|clients|star|usd|k|m|%)|\d{2,}\.?\d*%\s*uptime)/gi;

  const matches = text.match(suspiciousMetricsPattern);
  if (matches) {
    for (const match of matches) {
      if (!verifiedFacts.includes(match)) {
        blockedClaims.push(`Unverified metric claim: "${match}"`);
        cleanPositioning = cleanPositioning.replace(match, '[unverified metric omitted]');
      }
    }
  }

  return { cleanPositioning, blockedClaims };
}

function formatTitle(name: string): string {
  return name
    .split(/[-_]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
