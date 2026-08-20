# Accessibility Report

Automated and manual accessibility verification for the `lxrdxe7o` portfolio.

## Automated checks (axe-core)

- Full route audit: `npx playwright test --project=a11y tests/accessibility/full-audit.spec.ts`
- Shell audit: `npx playwright test --project=a11y tests/accessibility/static-shell.spec.ts`
- Error states: `npx playwright test --project=a11y tests/accessibility/error-states.spec.ts`

Status: **zero serious or critical violations** across all 12 route archetypes
(home, about, projects, project detail, experience, skills, uses, writing,
notes, now, archive, contact).

## Keyboard-only flows

Verified by `tests/accessibility/full-audit.spec.ts`:

- Skip link is the first tab stop and targets `#main-content`.
- Tab order follows document order: skip link → brand → Work → About.
- The entry gate receives focus when it opens and releases it on entry.
- Every interactive control exposes an accessible name.

## Zoom and reflow

200% text zoom at 1280px reflows without horizontal page overflow on project
detail pages. `320px` minimum width renders without clipped identity text.

## Forced colors, reduced motion, reduced data

- Forced-colors mode keeps every landmark visible.
- Reduced motion disables Lenis and shortens transitions to fades.
- Reduced data forces static media selection and never loads video.

## Manual checks that automation cannot judge

- Screen-reader announcement of route changes through the polite live region.
- Audio cues never carry meaning that silent mode lacks.
- The entry gate's sound choice is announced before activation.
