import type { AuditReport, CurationCandidate, RepositoryEvidence } from '../../src/types/audit';
import { scoreAndClassifyRepository } from './repository-signals';

export function generateAuditReport(username: string, repos: RepositoryEvidence[]): AuditReport {
  const candidates: CurationCandidate[] = repos.map((repo) => scoreAndClassifyRepository(repo));

  const flagshipCandidates = candidates
    .filter((c) => c.classification === 'flagship')
    .sort((a, b) => b.score - a.score)
    .map((candidate, idx) => ({ ...candidate, proposedOrder: idx + 1 }));

  const archiveCandidates = candidates
    .filter((c) => c.classification === 'archive')
    .sort((a, b) => b.score - a.score)
    .map((candidate, idx) => ({ ...candidate, proposedOrder: flagshipCandidates.length + idx + 1 }));

  const excludedCandidates = candidates.filter((c) => c.classification === 'excluded');

  const missingUserFacts: string[] = [];
  const mediaProductionNeeds: string[] = [];

  for (const candidate of [...flagshipCandidates, ...archiveCandidates]) {
    if (candidate.contentGaps.length > 0) {
      for (const gap of candidate.contentGaps) {
        missingUserFacts.push(`[${candidate.title}] ${gap}`);
      }
    }
    if (!candidate.evidence.hasScreenshots) {
      mediaProductionNeeds.push(`[${candidate.title}] Capture high-res desktop & mobile screenshots`);
    }
    if (candidate.evidence.homepageUrl) {
      mediaProductionNeeds.push(`[${candidate.title}] Record video loop of live interface at ${candidate.evidence.homepageUrl}`);
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    username,
    totalRepositoriesAudited: repos.length,
    flagshipCandidates,
    archiveCandidates,
    excludedCandidates,
    missingUserFacts,
    mediaProductionNeeds,
  };
}

export function formatReportMarkdown(report: AuditReport): string {
  const lines: string[] = [];

  lines.push(`# Portfolio Content Audit & Curation Report`);
  lines.push(``);
  lines.push(`**Audited User:** \`${report.username}\`  `);
  lines.push(`**Generated At:** ${report.generatedAt}  `);
  lines.push(`**Total Repositories Evaluated:** ${report.totalRepositoriesAudited}`);
  lines.push(``);

  lines.push(`## 1. Recommended Flagship Case Studies (Proposed Order)`);
  lines.push(``);
  if (report.flagshipCandidates.length === 0) {
    lines.push(`*No repositories met the flagship threshold based on current automated signals.*`);
  } else {
    for (const c of report.flagshipCandidates) {
      lines.push(`### ${c.proposedOrder}. ${c.title} (\`${c.slug}\`)`);
      lines.push(`- **Score:** ${c.score}/100 | **Visual Potential:** ${c.visualPotential} | **State:** ${c.maintenanceState}`);
      lines.push(`- **Repository:** [${c.evidence.fullName}](${c.evidence.sourceUrl})`);
      if (c.evidence.homepageUrl) {
        lines.push(`- **Live Site:** [${c.evidence.homepageUrl}](${c.evidence.homepageUrl})`);
      }
      lines.push(`- **Languages/Topics:** ${c.evidence.languages.join(', ') || 'N/A'} ${c.evidence.topics.length ? `(${c.evidence.topics.join(', ')})` : ''}`);
      lines.push(`- **Draft Positioning:** ${c.draftPositioning}`);
      if (c.strengths.length > 0) {
        lines.push(`- **Key Strengths:** ${c.strengths.join('; ')}`);
      }
      if (c.contentGaps.length > 0) {
        lines.push(`- **Gaps / Action Needed:** ${c.contentGaps.join('; ')}`);
      }
      lines.push(``);
    }
  }

  lines.push(`## 2. Supporting Archive Projects`);
  lines.push(``);
  if (report.archiveCandidates.length === 0) {
    lines.push(`*No archive projects identified.*`);
  } else {
    for (const c of report.archiveCandidates) {
      lines.push(`- **${c.title}** (\`${c.slug}\`): ${c.draftPositioning} — [Repo](${c.evidence.sourceUrl}) (Score: ${c.score}/100)`);
    }
    lines.push(``);
  }

  lines.push(`## 3. Excluded Repositories`);
  lines.push(``);
  if (report.excludedCandidates.length === 0) {
    lines.push(`*None.*`);
  } else {
    lines.push(report.excludedCandidates.map((c) => `\`${c.evidence.name}\``).join(', '));
    lines.push(``);
  }

  lines.push(`## 4. Content Gaps & Verification Items`);
  lines.push(``);
  if (report.missingUserFacts.length === 0) {
    lines.push(`*All candidate projects have verified descriptions and documentation.*`);
  } else {
    for (const item of report.missingUserFacts) {
      lines.push(`- [ ] ${item}`);
    }
  }
  lines.push(``);

  lines.push(`## 5. Media Production Tasks for Task 5`);
  lines.push(``);
  if (report.mediaProductionNeeds.length === 0) {
    lines.push(`*No media capture required.*`);
  } else {
    for (const item of report.mediaProductionNeeds) {
      lines.push(`- [ ] ${item}`);
    }
  }
  lines.push(``);

  return lines.join('\n');
}
