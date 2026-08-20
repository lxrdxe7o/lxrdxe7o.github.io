# Release Checklist

Final pre-release verification for the `lxrdxe7o` portfolio.

## Automated gates (all passing in CI)

- [x] Frozen clean install (`npm ci`)
- [x] `npm run check` — zero type/astro errors
- [x] `npm run lint` — zero lint errors
- [x] `npm run test:unit` — unit + integration suites
- [x] `npm run build` — reproducible static output
- [x] `npm run test:e2e` — route parity, projects, writing, failure modes, SEO, security
- [x] `npm run test:a11y` — zero serious/critical axe violations
- [x] `npm run test:visual` — stable visual baselines
- [x] `npm run test:perf` — budgets and one-canvas stability
- [x] Release manifest reproducible across clean rebuilds

## Content approvals required before release

- [ ] Approve project shortlist, order, and factual positioning (Task 4 output)
- [ ] Approve all public copy: biography, availability, experience, skills,
      Uses, Now, contact information
- [ ] Approve sound direction and parity calibration (Tasks 12 and 26)
- [ ] Confirm no unverified claims remain published

## Asset and attribution inventory

- [ ] Every font file carries its license in `public/fonts/licenses/`
- [ ] Every media manifest records source provenance and alt text
- [ ] Every dependency is pinned and license-approved
- [ ] Social cards generated from original typography only

## Not implicit

- [ ] Commit, push, pull request, and deployment happen only after explicit
      user authorization
