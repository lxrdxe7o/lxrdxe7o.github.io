# Task 1 Report: Capture Current and Reference Behavioral Baselines

## Status

`DONE_WITH_CONCERNS`

## Commit

- Branch: `feat/astro-portfolio-redesign` (isolated linked worktree; no push, PR, or deploy performed)
- Commit: `e9b2986212b4e385cd148db23d548a08d721fd66` — "test: capture behavioral baselines"
- Base commit inherited: `23ac2fe`
- 11 files changed, 3901 insertions(+), 503 deletions(-)

## Changed files

- `.gitignore` (modified) — adds `.superpowers/`, `artifacts/baseline/`, `artifacts/playwright/`, `test-results/`, `playwright-report/`
- `package.json` (modified) — pins `@playwright/test` at exactly `1.61.1`; adds `test:baseline`, `test:baseline:list`, `capture:current`, `capture:reference`, `typecheck:baseline` scripts
- `package-lock.json` (modified) — reconciles `playwright`/`playwright-core`/`@playwright/test` to `1.61.1`; prunes a stale, previously-undeclared `gh-pages` dependency subtree; reconciles root package name/version and router-devtools placement
- `playwright.config.ts` (new) — single-worker Chromium config, dedicated local server (`reuseExistingServer: false`)
- `tsconfig.scripts.json` (new) — standalone type-check config (lib ES2021) covering `scripts/`, `tests/`, `playwright.config.ts`; does not modify `tsconfig.json` or `npm run build`
- `scripts/reference/capture-current.ts` (new) — current-site capture, volatility masking, baseline index renderer
- `scripts/reference/capture-reference.ts` (new) — public reference capture: ancestor-validated silent-entry selection, audio audit state machine, destination-predicate-gated milestone traversal
- `tests/fixtures/viewports.ts` (new) — route/subject/state definitions, plan builder, manifest validator
- `tests/visual/baseline-capture.spec.ts` (new) — 20 tests
- `docs/reference/behavioral-baseline.md` (new)
- `docs/reference/interaction-inventory.md` (new)

Excluded from the commit: `.agents/` (unrelated review metadata, untracked), `.superpowers/` (ignored), all generated artifacts under `artifacts/baseline/`, `artifacts/playwright/`, `dist/`, `node_modules/` (all ignored/untracked).

## Inherited partial work

This task resumed prior partial implementation already present in the worktree (capture scripts, tests, docs, and a first review-fix pass). This session independently re-verified all of it rather than trusting prior self-reports, found three new Important issues via a fresh review, fixed them with TDD, re-reviewed, and committed.

## TDD evidence (this session)

1. **`tsc` type-check scope gap** (scripts/tests outside `tsconfig.json`'s `include`; `capture-current.ts`'s `replaceAll` needs ES2021, project `lib` is ES2020):
   - RED: reproduced independently with a temporary widened tsconfig — `error TS2550: Property 'replaceAll' does not exist on type 'string'... Try changing the 'lib' compiler option to 'es2021' or later.`
   - GREEN: added `tsconfig.scripts.json` (lib ES2021) + `typecheck:baseline` script — `tsc --noEmit -p tsconfig.scripts.json` exits 0.

2. **Incomplete Blog volatility masking** (live glitch heading with a varying prefix, e.g. `ARCHIV~D <[*...` vs `ARCHX#25...`, plus an unmasked randomized paragraph):
   - RED: new test `keeps masking a continuously regenerating heading and paragraph through capture time` — failed against the old one-shot `/^ARCHIV/i` implementation (`Expected: "[masked dynamic heading]" / Received: "ARCHA~!VGH:DGAL*&KZ#XX<^"`).
   - GREEN: replaced the one-shot mask with a two-sample diff (350ms apart) plus a broadened `/^ARCH/i` heuristic, backed by a persistent `MutationObserver` that keeps re-masking through to the eventual screenshot. Test passes; original static-content masking test (`normalizes volatile current handoff text...`) also still passes unmodified in expectation.
   - Self-introduced regression caught in the same cycle: the added ~350ms delay increased the odds of the Blog page's live clock re-rendering after the original one-shot timestamp mask, reintroducing a raw timestamp (`06:10:36 BST`) on `mobile-touch`. Caught with a second new test, `keeps masking a continuously re-rendering clock through capture time` (RED: `Received string: "CURRENT TIME: 06:10:36 BST..."`), fixed by making the timestamp mask persistent via the same `MutationObserver` pattern (GREEN).
   - Verified directly against regenerated `artifacts/baseline/current/manifest.json` (not just the test suite): all four applicable Blog states now show `[MASKED DYNAMIC HEADING]` and no timestamp leak; legitimate stable text (`REF: XERO-DEV-07`, `Class: ARCHIVAL`, `ARCH LINUX KERNEL 6.18`, ordinary project-card copy) remains unmasked — no false positives from the broadened heuristic.

3. **Reference `desktop-sound-gate` byte-identical to `desktop-pointer`**: fixed as a documentation-accuracy correction only. Both docs now disclose that, for the reference target, this state performs the identical silent-path traversal as `desktop-pointer` (confirmed against the preserved manifest: identical destination URLs, `scrollHeight`, and audio-audit values). The code was deliberately left unchanged and the preserved public reference evidence was **not** rerun, per the constraint to preserve existing reference evidence unless missing or corrupted.

## Exact validation commands and exit codes (final pass, after all fixes)

| Command | Exit code | Result |
| --- | ---: | --- |
| `npm run test:baseline:list` | 0 | 20 tests listed |
| `npm run test:baseline` | 0 | 20/20 passed in 6.2 minutes |
| `npm run typecheck:baseline` | 0 | 0 type errors |
| `npm run build` | 0 | only pre-existing empty `react-vendor` chunk and >500 kB Three.js vendor chunk warnings |
| `npm run lint` | 2 | pre-existing: ESLint 9 cannot find `eslint.config.*` (Task 2 scope; not fixed here) |
| `npm ls @playwright/test playwright --depth=0` | 0 | `@playwright/test@1.61.1` |
| `git diff --check` | 0 | clean |
| `git diff --cached --check` (pre-commit) | 0 | clean |
| manifest/index audit (custom script) | 0 | current 40 captured/10 gap; reference 20 captured/15 blocked; 85 unique artifact paths; index present |
| documentation acceptance check (custom script) | 0 | all routes/milestones/states/counts/historical caveats present |

## Capture counts

- Current portfolio: 40 captured, 10 explicit sound-gate gaps (50 total; 10 routes × 5 states).
- Public reference: 20 captured, 15 blocked (35 total; 7 milestones × 5 states) — **preserved, unchanged** evidence; `generatedAt` remains `2026-07-20T21:43:55.454Z`. The public reference capture was **not** rerun this session.
- 85 unique artifact paths across both manifests.

## Known limitations (carried forward, not fixed here — accepted per DONE_WITH_CONCERNS)

1. **Reference audio-audit historical scope**: the preserved 20/15 reference manifest predates the current script's full pre-click-to-terminal audio interval, complete actionable-ancestor validation, and observable post-dispatch destination predicates. It documents what was captured under the earlier protocol; it does not prove the newer, stricter checks would produce identical results. This is documented explicitly in both `docs/reference/*.md` files.
2. **Reference `desktop-sound-gate` duplication**: for the reference target, this state is a byte-identical rerun of `desktop-pointer`'s silent-path audit (confirmed in the manifest). Fixing this at the code level would require rerunning the public reference capture, which is out of scope (preserve-unless-missing-or-corrupted). Documented as a known limitation in both docs.
3. **Blog masking uses index-based sample correlation**: the two-sample diff approach correlates elements by their position in `querySelectorAll('h1, h2, h3, p')` between two reads 350ms apart. This is heuristic and would misattribute a mask if the Blog page's element count changed between samples. Did not misfire in this session's regenerated evidence (verified directly); noted by the independent re-review as a Minor, accepted as-is.
4. **Capture runs against `npm run dev`, not a production preview build**: `playwright.config.ts`'s `webServer.command` starts the Vite dev server, not `vite build && vite preview`. Possible (unconfirmed) fidelity gap versus what real visitors see; the dev-only font-load warnings and Three.js buffer-resize errors already recorded in the manifest are dev-server artifacts and have not been compared against a production preview capture. Noted by the independent re-review as Minor; not changed here to avoid unnecessary scope/risk for a Minor finding.
5. **`npm run lint` fails** (exit 2) because the pre-existing repository has no ESLint 9 flat config (`eslint.config.*`). This predates Task 1, is explicitly out of scope per the brief (Task 2's responsibility), and was independently reconfirmed unaffected by this change.

## Review history (this session)

- Fresh read-only semantic review (`.agents/tasks/task-1/2026-07-20-235638-review.md`): 0 Critical, 3 Important (Blog masking, `tsc` scope gap, sound-gate duplication), 2 Minor (dev-vs-preview server, undisclosed duplication). All 4 issues from an even earlier review pass were reconfirmed fixed.
- Fixed all 3 Important findings via TDD (see above); left the 2 Minor findings as documented/accepted (1 addressed by a doc fix as part of the sound-gate fix; the dev-server one left unchanged).
- Independent post-fix re-review (`.agents/tasks/task-1/2026-07-21-004000-review.md`): confirmed all three Important findings resolved with direct evidence (not just trusting the test suite), no new Critical/Important issues, one new Minor (index-based correlation fragility) accepted as a documented limitation.

## Self-review notes

- Verified `.agents/` (untracked review metadata) was never staged or committed.
- Verified `.superpowers/` remains gitignored and this report will not be committed.
- Verified the public reference manifest's `generatedAt` timestamp and 20/15 counts are unchanged from before this session — the public reference capture was never rerun.
- Verified package-lock churn is limited to: reconciling stale root package metadata, moving `@tanstack/router-devtools` to devDependencies, removing a previously-undeclared `gh-pages` subtree, and adding exact `@playwright/test`/`playwright`/`playwright-core` 1.61.1 (Apache-2.0 licensed).
- No push, pull request, deployment, or `main`-branch action was performed at any point.

## Concerns for handoff

- `DONE_WITH_CONCERNS` reflects the 5 known limitations above, none of which are spec violations per the brief's own binding requirements — they are evidence-quality caveats explicitly documented in `docs/reference/*.md` and this report.
- `npm run lint`'s exit 2 is expected and is Task 2's responsibility, not Task 1's.
- The public reference manifest is intentionally stale relative to the current script's stricter safety checks; any future task relying on it for exact reference-audio parity should rerun the reference capture first (with the same silent-only safety constraints) rather than treating the preserved 20/15 evidence as current.
