### Task 1: Capture the Current and Reference Behavioral Baselines

**Objective:** Create a reproducible evidence set for current-route behavior and the reference's observable layout, loader, entry, navigation, project sequence, transitions, responsive states, and reduced-motion behavior before migration begins.

**Files:**
- Modify: `package.json`, `.gitignore`
- Create: `playwright.config.ts`, `scripts/reference/capture-reference.ts`, `scripts/reference/capture-current.ts`
- Create: `tests/visual/baseline-capture.spec.ts`, `tests/fixtures/viewports.ts`
- Create: `docs/reference/behavioral-baseline.md`, `docs/reference/interaction-inventory.md`
- Generate and ignore: `artifacts/baseline/current/`, `artifacts/baseline/reference/`

**Implementation guidance:**
- Pin Playwright and add deterministic capture scripts for desktop, mobile, keyboard-only, reduced-motion, and sound-gate states.
- Record route inventory, content order, cursor/pointer responses, index behavior, scroll milestones, page handoffs, and fallback behavior.
- Keep reference captures internal to parity analysis; never ship them as portfolio assets.
- Mask timestamps and other unstable UI, wait for fonts and network idle, and save a JSON manifest with URL, viewport, preference state, and capture timestamp.
- Document behaviors rather than reverse-engineering or reproducing reference source.

**Tests and validation:**
- [ ] Run the baseline test against the current local site and verify every existing route produces a screenshot and manifest row.
- [ ] Run the reference capture only against public pages and verify sound is never enabled automatically.
- [ ] Validate that each manifest contains unique artifact paths and all approved viewport/preference combinations.
- [ ] Review `behavioral-baseline.md` against the generated evidence and record known gaps explicitly.

**Demo:** Open the generated baseline index and compare current/reference desktop, mobile, reduced-motion, loader, home, Index, project, About, and footer states side by side.

