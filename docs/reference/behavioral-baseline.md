# Behavioral Baseline

## Scope and evidence policy

This baseline records the portfolio as it existed before the Astro redesign and publicly observable behavior from the approved reference site. It is evidence for parity planning, not permission to reproduce the reference. No reference source, shaders, fonts, copy, branding, images, video, 3D assets, or sound were downloaded, inspected, or copied.

Generated evidence is local working data and is intentionally ignored by Git:

- `artifacts/baseline/current/manifest.json`
- `artifacts/baseline/reference/manifest.json`
- `artifacts/baseline/index.html`
- `artifacts/baseline/current/<state>/<route>.png`
- `artifacts/baseline/reference/<state>/<subject>.png`
- `*.gap.json` and `*.blocked.json` records for states that do not exist or could not be reached safely

Reference screenshots are internal parity-analysis evidence only. They must never be moved into `public/`, committed, or shipped.

## Capture method

Playwright uses a deterministic subject-by-state plan. Each record contains the observed URL, viewport and preference state, unique artifact path, capture timestamp, status, and structured observations. Captures use an `en-US` locale, UTC timezone, dark color scheme, disabled screenshot animation, hidden carets, and masked timestamp-like elements. The scripts wait for document fonts and attempt network-idle readiness before capture; timeouts are preserved as warnings rather than concealed.

| State | Viewport | Input | Motion | Purpose |
| --- | ---: | --- | --- | --- |
| `desktop-pointer` | 1440 × 900 | mouse | no preference | Pointer composition and primary controls |
| `mobile-touch` | 390 × 844 | touch/coarse pointer | no preference | Mobile composition and touch path |
| `desktop-keyboard` | 1440 × 900 | keyboard only | no preference | Focus and keyboard-observable controls |
| `desktop-reduced-motion` | 1440 × 900 | keyboard only | reduce | Preference propagation and reduced-motion reachability |
| `desktop-sound-gate` | 1440 × 900 | mouse | no preference | Entry/audio-gate evidence; never authorizes sound |

The current site was captured from the local Vite server. The reference run observed only public pages in a Chromium process launched with `--mute-audio`. Automation could activate only an option whose visible label explicitly indicated silent/no-audio entry. It never selected the sound-enabled option.

For the current site, `desktop-sound-gate` is a distinct state because the portfolio has no entry gate at all: it is recorded as an explicit `.gap.json` limitation rather than a screenshot. For the public reference, there is only one entry gate and automation is restricted to the silent choice in every state, so `desktop-sound-gate` performs the identical silent-path traversal as `desktop-pointer` with the same viewport and input. The preserved reference manifest confirms this: every `desktop-sound-gate` record has byte-identical destination URLs, `scrollHeight`, and audio-audit values to its `desktop-pointer` counterpart. The state name identifies which audit run is being inspected, not a behaviorally distinct reference capture; do not treat its evidence as independent confirmation beyond what `desktop-pointer` already shows.

## Coverage summary

| Target | Planned combinations | Captured | Gap/blocked | Failed |
| --- | ---: | ---: | ---: | ---: |
| Current portfolio | 10 routes × 5 states = 50 | 40 | 10 explicit sound-gate gaps | 0 |
| Public reference | 7 subjects × 5 states = 35 | 20 | 15 blocked | 0 |

Every manifest artifact path is unique and every approved subject/state combination is represented. The ignored comparison index includes current/reference desktop, mobile, reduced-motion, loader, home, Index, project, About, and footer evidence or the corresponding limitation record.

The public reference manifest and its factual **20 captured / 15 blocked** count are preserved historical evidence from the earlier capture protocol. They have not been regenerated with complete actionable-ancestor validation, post-dispatch destination predicates, or the widened terminal audio snapshot. A preserved `captured` status therefore identifies an artifact produced by that run, not proof that the newer verification checks passed.

## Current portfolio route inventory

The persistent portfolio navigation exposes Home, About, Projects, Experience, Skills, Uses, Notes, Now, Contact, and Blog. The observed content order is:

| Route | Observed content order and handoff |
| --- | --- |
| `/` | Availability marker → developer hero → introduction → Projects and Contact calls to action. A WebGL canvas sits behind the single-viewport composition. |
| `/about` | Protocol/status labels → repeated editorial display title → introductory paragraph → waiting-list status and submit control → ticker-like closing line. The form prevents default submission and does not demonstrate a completed service handoff. |
| `/projects` | Section label/title → six project cards in this order: KrakenVim, dotfiles, xero-shell, DeadDrop, hachi, mikeneko. Each card hands off to an external GitHub destination; there are no native case-study routes. This route is the only local content route observed without a canvas. |
| `/experience` | Timeline heading → three chronological entries: current full-stack work, prior frontend work, and introduction to programming. A WebGL scene remains present. |
| `/skills` | Heading → Languages → Frontend → Backend → DevOps → Tools → 3D & Graphics. A WebGL scene remains present. |
| `/uses` | Heading → Hardware → Software → Services → Workflow. This is a vertically scrolling page with a WebGL scene. |
| `/notes` | Heading → four display-only note cards. No card demonstrated an internal article-detail handoff. A WebGL scene remains present. |
| `/now` | Heading → Building → Learning → Reading. A WebGL scene remains present. |
| `/contact` | Heading/introduction → Email → GitHub → LinkedIn → Twitter/X. Contact methods are direct external or protocol handoffs; a WebGL scene remains present. |
| `/blog` | Immediately redirects away from the portfolio to `https://lxrdxe7o.vercel.app/`. The external destination, rather than a native portfolio route, appears in captured records. |

## Current interaction behavior

### Navigation and transitions

- Desktop captures expose the same ten-link navigation on every local route. SPA handoffs use the existing Framer Motion page-transition layer.
- Mobile captures expose a compact header and drawer navigation. Source and behavioral review found no demonstrated focus trap, Escape dismissal, or background scroll lock for the drawer.
- The current site has no global project Index, no persistent footer, and no native case-study progression.
- The Blog item is a cross-site handoff. Its redirect produced an aborted-request diagnostic in each captured state even though the destination rendered.

### Pointer, keyboard, and touch

- Desktop pages expose 12–18 pointer-cursor targets depending on route; Projects and Contact have the largest counts because of their outbound links.
- The keyboard state applies two `Tab` presses. On the nine local routes, focus settles on the Home navigation control. The external Blog destination has its own focus order. This proves a basic tab stop exists but does not prove complete keyboard traversal or visible-focus quality.
- Mobile emulation reports a coarse pointer and one touch point, with no horizontal overflow in the captured routes.
- Captures do not establish custom cursor physics, drag behavior, or pointer-reactive project previews on the current site.

### Scroll milestones

The scripts observe top, midpoint, and maximum scroll positions before returning to the top for screenshots. At 1440 × 900, About, Projects, Uses, and Now exceed one viewport; the remaining local routes are at or near one viewport. At 390 × 844, About, Projects, Skills, Uses, Notes, and Now require vertical scrolling. The longest observed mobile local pages are Projects and Uses. No current route demonstrates a repeated long-form case-study sequence.

### Loading, sound, Index, footer, and fallback gaps

- There is no observable portfolio loader or entry gate.
- There is no current audio element, opt-in sound path, preference persistence, or always-available mute control. All ten `desktop-sound-gate` combinations are therefore explicit `.gap.json` records, not fabricated screenshots.
- There is no global Index interaction and no site footer.
- There is no custom not-found baseline, no demonstrated no-JavaScript content fallback, and no complete static/no-WebGL fallback.
- The browser correctly reports `prefers-reduced-motion: reduce` in reduced-motion captures, but canvases remain mounted on all scene-bearing routes. The evidence does not establish that WebGL animation or every transition is suppressed.

### Current-site diagnostics

- Mobile Experience and Now captures recorded repeated Three.js buffer-resize errors.
- Uses and Notes intermittently failed the 15-second network-idle check and logged a remote font-loading error; fonts subsequently reported ready.
- Blog captures recorded the external redirect request as aborted.
- These diagnostics are baseline defects, not failures introduced by the capture tooling.

## Public reference observations

### Observable sequence

The preserved desktop-pointer run recorded artifacts for all seven requested milestones under the earlier dispatch-based capture criteria. These artifacts document what was visible at each screenshot, but they have not been rerun against the current observable-destination predicates or full terminal audio audit:

1. Initial loader milestone.
2. Entry-gate milestone with distinct sound and silent choices visible to a human observer.
3. Home after activation of only the explicitly silent choice.
4. A global Index opened from the home experience.
5. A project case-study page reached through Work and an explicit project control.
6. An About page reached through the global About control.
7. A footer/end state reached by scrolling the About page to its end.

The automation records public UI and geometry only. It does not infer implementation details or reproduce the reference's text or visual assets.

### Home, navigation, and availability

- The home experience exposes persistent identity/version framing, Work and About controls, social/contact links, availability information, project entry controls, and one canvas.
- Desktop content behaves as a viewport-sized experience at the home milestone. The project and About destinations become long vertical documents.
- The captured DOM exposes repeated project-entry controls; the Index provides a separate project-selection state.
- Route changes preserve the global identity/navigation/social frame. Exact transition timing and easing were not measured by this run and must not be claimed from still images alone.

### Project sequence

The reached public case study had one canvas, two media elements, and an observed document height of 4,469 px at a 900 px viewport. Its controls included return-to-Index, external/live destination, and next-project progression. This establishes the observable repeated case-study shape: project entry → long-form project document → Index/live/next-project handoffs. The baseline does not copy project names, copy, imagery, media, or implementation.

### About and footer

The reached About page had an observed height of 2,846 px at a 900 px viewport. Its visible module headings indicate a sequence covering profile, prior collaborators/recognition, services, contact, tools, and resources. The footer/end capture preserves social, contact, Work, and About handoffs. These are structural observations only; names, claims, copy, and assets are excluded from redesign inputs.

### Pointer, scroll, mobile, and reduced-motion limits

- The preserved desktop-pointer run recorded every requested subject after dispatching the expected controls through the silent path. Because that run predates post-dispatch state predicates, those records do not independently prove that every control changed destination state.
- Mobile produced loader and entry artifacts, but the silent activation did not expose a hit-test-reachable Work, About, Index, Projects, or Project control. Home, Index, project, About, and footer are recorded as blocked because entry completion was not safely observable.
- Keyboard-only produced loader and entry artifacts. No keyboard-observable control explicitly labeled as silent became available, so home and all later subjects are blocked rather than activated through an unsafe fallback.
- Reduced-motion produced loader and entry artifacts and confirmed the media query matched. Because the silent control was not keyboard-observable, post-entry reduced-motion behavior, transition suppression, and later layouts remain unverified.
- Still screenshots and scripted control activation do not establish exact cursor interpolation, scroll inertia, hover physics, or transition easing. Those properties remain observation gaps for later manual review.

### Audio safety

- The preserved manifest recorded no audio activity in its sampled pre-discovery snapshots. It predates the terminal pre-consent snapshot now taken after unsuccessful silent-control discovery, so blocked states do **not** prove absence of delayed automatic activity throughout that interval.
- No unmuted media element was observed playing in the preserved snapshots, and the browser process was forcibly muted. This is sampled evidence, not a continuous end-to-end assertion.
- In desktop-pointer and desktop-sound-gate modes, a Web Audio context was running in the sampled post-entry snapshot after the explicitly silent choice. The manifest marks both states unsafe for strict silent-path parity even though no audible output or media-element playback was observed.
- The current capture code audits from a true snapshot immediately before silent activation through a terminal snapshot after all requested traversal. The preserved **20 captured / 15 blocked** public manifest has not been rerun under that widened interval, so its historical state audits cannot establish absence of audio that began later in the workflow.
- The `desktop-sound-gate` state is an audit of the gate while still choosing silent entry; it is not a capture of the sound-enabled path.
- The sound-enabled reference choice was never intentionally clicked, its audio was never inspected, and no claims are made about its behavior.

## Baseline conclusions and known gaps

The evidence is sufficient to preserve the current ten-route inventory and to plan an original implementation of the reference's observable sequence: loader, explicit opt-in gate, home, Index, native case study, About, and footer. It is not sufficient to claim exact reference motion physics, mobile post-entry behavior, keyboard parity, reduced-motion parity, or a truly inactive Web Audio graph after silent entry. Those gaps must remain explicit acceptance targets rather than being filled by assumption.
