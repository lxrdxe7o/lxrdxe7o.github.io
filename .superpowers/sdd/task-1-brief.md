# Task 1 Brief: Capture Current and Reference Behavioral Baselines

Read this first. It is the complete task scope and contains the exact binding values to use.

## Repository and execution context

- Worktree: `/home/lxrdxe7o/Dev/Personal/lxrdxe7o.me-astro-redesign`
- Branch: `feat/astro-portfolio-redesign`
- Base commit before this task: `23ac2fe`
- Current stack: React 18, Vite 6, TanStack Router, Framer Motion, Three.js, React Three Fiber, and Drei.
- Current baseline: `npm run build` passes. There is no test script. `npm run lint` fails before this task because ESLint 9 cannot find `eslint.config.*`; Task 2 will replace the lint configuration, so do not broaden Task 1 into that migration.
- The environment currently reports Node.js 22.22.2. The approved future target is 22.22.3, but version migration belongs to Task 2.
- The user authorized local task commits. Do not push, open a pull request, deploy, or modify `main`.
- Use test-driven development: add the focused failing test first, confirm the intended failure, implement the smallest complete path, then rerun focused validation.
- Add `.superpowers/` to `.gitignore` along with Task 1 artifact ignores. Never stage or commit `.superpowers/sdd/*`.

## Global constraints

- Preserve and redesign every current public route: `/`, `/about`, `/projects`, `/experience`, `/skills`, `/uses`, `/notes`, `/now`, `/contact`, and `/blog`.
- Add native project case studies, Writing, Lab, and Archive experiences without sending visitors to an external blog.
- Use `lxrdxe7o` as the primary hero identity, `Full-Stack Developer` as the title, and `Ishraful Haque` as the supporting signature.
- Use one restrained crimson signature across the site; do not retain route-specific rainbow themes.
- Match the reference's observable components, sequencing, transitions, interaction physics, audio behavior, and WebGL feel as closely as practical.
- Do not copy reference source code, shaders, branding, copy, fonts, images, video, 3D assets, or audio.
- Use only free and open-source runtime dependencies and distributable assets. Pin dependency versions exactly in `package.json`.
- GSAP remains excluded because the approved dependency policy requires OSI-style open-source licensing. Motion provides DOM choreography instead.
- Never fabricate clients, employers, awards, testimonials, dates, metrics, outcomes, project status, or proficiency. Unverified claims remain unpublished.
- Public repositories and profile data may be used as factual input, but generated copy and project selection require user approval.
- Audio must be opt-in. Sound and silent entry paths must have complete feature parity, persistent preference, and an always-available mute control.
- Provide high-quality desktop and mobile compositions, adaptive WebGL quality, a reduced-motion mode, a static no-WebGL mode, and resilient failure states.
- Meet WCAG 2.2 AA and support keyboard, touch, mouse, coarse pointer, screen reader, zoom, reduced motion, reduced data, and forced-colors use.
- Browser floor: current and previous Chrome, Firefox, Safari, and Edge; iOS Safari 16 or newer; current Android Chrome.
- Performance targets: LCP at or below 2.5 seconds, INP at or below 200 milliseconds, CLS at or below 0.1, one WebGL context, stable 60 FPS on capable desktops, and stable 30 FPS through adaptive downgrades.
- Local task commits are explicitly authorized for this feature worktree only. No push, pull request, deployment, or production action is authorized.

## Objective

Create a reproducible evidence set for current-route behavior and the reference's observable layout, loader, entry, navigation, project sequence, transitions, responsive states, and reduced-motion behavior before migration begins.

## Required files

- Modify: `package.json`, `.gitignore`
- Create: `playwright.config.ts`, `scripts/reference/capture-reference.ts`, `scripts/reference/capture-current.ts`
- Create: `tests/visual/baseline-capture.spec.ts`, `tests/fixtures/viewports.ts`
- Create: `docs/reference/behavioral-baseline.md`, `docs/reference/interaction-inventory.md`
- Generate and ignore: `artifacts/baseline/current/`, `artifacts/baseline/reference/`

## Implementation requirements

- Pin the Playwright test dependency at exactly `1.61.1`; verify the package/version/license before installation. Do not add open version ranges.
- Add deterministic capture scripts for desktop, mobile, keyboard-only, reduced-motion, and sound-gate states.
- Record the current route inventory, content order, cursor/pointer responses, Index behavior, scroll milestones, page handoffs, and fallback behavior.
- Record the reference loader, sound and silent entry options, home hierarchy, Work/About controls, social/availability elements, project Index behavior, repeated case-study sequence, About modules, route transitions, pointer/scroll responses, audio controls, mobile composition, and reduced-motion observations.
- Keep all reference captures internal to parity analysis. Never copy them into shipped `public/` assets.
- Mask timestamps and unstable UI, wait for fonts and network readiness, and save a JSON manifest containing URL, viewport, preference state, artifact path, and capture timestamp.
- Ensure paths are unique and deterministic even when the same route is captured in multiple modes.
- Never click an option that enables reference audio. The capture must prove audio is not enabled automatically.
- Document observable behavior only. Do not download, inspect, reproduce, or reverse-engineer reference source code, shaders, media, 3D assets, or sound.
- If a state does not exist in the current portfolio, record it as an explicit baseline gap rather than fabricating a capture.
- Browser binaries and generated artifacts remain uncommitted. Commit source, docs, configuration, lockfile changes, and tests only.

## Required tests and validation

- Start with a failing focused test for deterministic viewport/state enumeration and unique manifest/artifact paths.
- Run the test before implementation and record that it failed for the intended missing behavior.
- Run the baseline suite against the current local site and verify all ten existing routes produce expected current-site capture records.
- Run the public reference capture and verify sound is never enabled automatically.
- Validate that every manifest record has a unique artifact path and that all approved viewport/preference combinations are represented.
- Review `docs/reference/behavioral-baseline.md` against generated evidence and record known gaps explicitly.
- Run `npm run build` after implementation. Run the new focused Playwright/list validation commands.
- Run `npm run lint` and report the known pre-existing flat-config failure separately; do not claim lint passes and do not implement Task 2's ESLint migration here.

## Demo requirement

Generate an ignored baseline index that lets a reviewer compare current/reference desktop, mobile, reduced-motion, loader, home, Index, project, About, and footer states side by side. If the public reference blocks a specific automated state, include the attempted URL/mode, evidence, and precise limitation in the manifest and documentation rather than inventing success.

## Commit and report contract

- Commit only Task 1 implementation files with a focused message.
- Write the complete implementation report to `/home/lxrdxe7o/Dev/Personal/lxrdxe7o.me-astro-redesign/.superpowers/sdd/task-1-report.md`.
- The report must include: status (`DONE`, `DONE_WITH_CONCERNS`, `NEEDS_CONTEXT`, or `BLOCKED`), commit hash(es), changed files, red-green TDD evidence, exact commands and exit codes, capture counts, known baseline limitations, self-review findings, and any concerns.
- Return only the status, commit hash(es), a one-line test summary, and concerns in your final response.