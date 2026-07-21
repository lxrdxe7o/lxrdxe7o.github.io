# Interaction Inventory

## Purpose

This inventory translates the captured behavioral baseline into observable interaction states and handoffs. It distinguishes confirmed behavior from capture limitations so later implementation tasks do not mistake a screenshot, hidden DOM, or blocked automation path for verified parity.

Evidence lives in the ignored `artifacts/baseline/` tree. The authoritative machine-readable records are `current/manifest.json` and `reference/manifest.json`; `index.html` is the side-by-side reviewer view.

The preserved public reference manifest retains its factual **20 captured / 15 blocked** count and predates the tightened capture checks. Its records were produced before complete actionable-ancestor validation, observable post-dispatch destination predicates, and the terminal audio snapshot after all traversal. Treat those statuses as historical artifact inventory, not as proof that the newer checks passed.

## State sequence

### Current portfolio

1. A public route loads directly; there is no loader or entry decision.
2. The route-specific DOM and scene enter through the existing SPA transition layer.
3. Global navigation changes local routes, except Blog, which redirects to a separate site.
4. Projects and contact methods hand off to external destinations; no project-detail route or next-project sequence exists.

### Public reference, safe observation path

1. Navigate to the public home URL in a browser with output muted.
2. Record the initial loader and entry-gate milestones without interaction.
3. Locate a silent/no-audio label, validate its complete actionable ancestor, and reject any action whose full label also offers sound-enabled entry.
4. If no safe action is found, stop after a terminal pre-consent audio snapshot and write blocked or unsafe evidence. Otherwise, take the true pre-click snapshot immediately before activating only that silent action.
5. Verify observable destination changes for Index, Work/project, and About; require a verified About path and observable page-end contact/footer evidence before footer capture.
6. Take the state-bound terminal audio snapshot after all requested traversal. Never activate the sound-enabled choice, inspect media, or infer inaccessible behavior.

The preserved public manifest predates steps 3–6 in their tightened form; it has not been regenerated.

## Interaction matrix

| Area | Current portfolio | Public reference observation | Evidence status / redesign implication |
| --- | --- | --- | --- |
| Initial load | Route renders directly behind the global navigation; no explicit loader. | A distinct initial loader milestone precedes entry. | Current loader is a gap. Reference loader captured in all five states, but timing/progress semantics were not measured. |
| Entry gate | No entry gate or audio decision. | Distinct sound and silent choices are publicly visible. Automation uses only the explicit silent choice. | Ten current sound-gate gap records. Never model the reference sound path from this evidence. |
| Automatic audio | No audio elements observed. | Preserved sampled pre-discovery snapshots recorded no activity; blocked discovery intervals were not continuously covered by that run. | New implementation must retain zero automatic audio. The historical manifest does not prove absence of delayed pre-consent activity throughout blocked control discovery. |
| Silent entry | Not applicable. | Pointer activation reached post-entry states, but a Web Audio context became active in two desktop modes. | Silent path must be stricter than the observed concern: no audible output and no unnecessary active audio graph. |
| Primary navigation | Ten route links: Home, About, Projects, Experience, Skills, Uses, Notes, Now, Contact, Blog. | Persistent identity frame with Work and About plus social/contact controls. | Preserve all current routes while creating an original global navigation model. |
| Route handoff | Local SPA transitions for nine routes; Blog leaves the site. | Work, About, Index, project, and next-project controls provide in-experience handoffs. | Replace external Blog handoff later, but Task 1 records it unchanged. Exact reference easing remains unknown. |
| Pointer | Standard link/button pointer targets; 12–18 per desktop route. | Desktop pointer path reaches all requested subjects. | Still captures do not prove custom cursor or hover physics. Treat those as manual-observation gaps. |
| Touch | Mobile drawer and route layouts; coarse pointer detected with no horizontal overflow. | Loader and entry artifacts produced; entry completion could not be verified because no post-entry control became hit-test reachable. | Do not claim mobile home/Index/project/About/footer parity from this run. |
| Keyboard | Two tabs place focus on Home navigation for local routes. Drawer focus containment was not demonstrated. | Loader and entry artifacts produced, but no keyboard-observable explicitly silent control was found. | Post-entry reference keyboard behavior is blocked. New gate must be fully keyboard operable. |
| Reduced motion | Preference is detected, but scene canvases remain mounted and full suppression is not established. | Preference detected at loader/entry; post-entry path blocked. | Reduced-motion parity is an acceptance target, not a confirmed reference behavior. |
| Home hierarchy | Availability → developer hero → introduction → Projects/Contact calls to action. | Identity/version framing, Work/About, availability, social/contact links, project entries, and canvas share a viewport-sized home state. | Preserve current identity/content while using only the reference's observable sequencing as inspiration. |
| Index | No global Index. Projects is a conventional card route. | Separate global Index state is reachable on desktop pointer. | Build an original Index later; current absence is explicit. |
| Project entry | Project cards open external repositories. | Work exposes project entries; a project control opens a long-form case study. | Native case studies and safe return/next handoffs are missing from current. |
| Case-study scroll | None. | Reached case study spans 4,469 px at 1440 × 900 and exposes Index/live/next controls. | Sequence is established; exact content, media, and motion are excluded. |
| About | Single editorial signup concept with one short scroll and non-service form behavior. | Long page (2,846 px at 1440 × 900) with profile, collaborator/recognition, services, contact, tools, and resources modules. | Module categories are structural evidence only; do not copy claims or names. |
| Social / availability | Availability on Home; contact channels on Contact. | Availability and social/contact controls persist in desktop observations. | Consolidation into persistent UI is a later design decision. |
| Footer | No footer landmark on captured current routes. | End state retains contact/social and primary navigation handoffs. | Current footer is a gap; reference footer captured only in desktop pointer-derived modes. |
| Scroll | Route-dependent document scroll with top/mid/end milestones; several desktop routes are single viewport. | Home is viewport-sized; project and About are long documents. | Exact smooth-scroll physics and inertia were not measured. |
| WebGL | One canvas on every local route except Projects and external Blog. | One canvas observed on captured reference pages. | Capture counts do not reveal renderer implementation. Future work must remain original and use one resilient context. |
| Failure fallback | No demonstrated custom 404, no-JS mode, static no-WebGL mode, or complete scene failure UI. | Public capture records blocked states instead of bypassing controls. | Add explicit fallbacks later; never infer inaccessible reference behavior. |

## Current route handoffs and scroll checkpoints

| Route | Primary interactions | Scroll observation |
| --- | --- | --- |
| `/` | Projects CTA, Contact CTA, global navigation | Single viewport at both captured sizes |
| `/about` | Waiting-list input/submit, global navigation | Scrolls on desktop and mobile; form has no demonstrated network completion |
| `/projects` | Six external repository links, global navigation | Slight desktop overflow; long mobile list |
| `/experience` | Global navigation | Single viewport in captures; mobile scene logs buffer-resize errors |
| `/skills` | Global navigation | Single desktop viewport; scrolls on mobile |
| `/uses` | Global navigation | Long desktop/mobile document; readiness warnings recorded |
| `/notes` | Display-only cards, global navigation | Near one viewport; readiness warnings recorded |
| `/now` | Global navigation | Slight desktop overflow; scrolls on mobile; mobile scene logs buffer-resize errors |
| `/contact` | Email and social/profile handoffs, global navigation | Single viewport at both captured sizes |
| `/blog` | Cross-site redirect | Local route does not retain control of the resulting document |

The capture script visits top, midpoint, and end for each route and then returns to the top before taking the screenshot. These checkpoints verify reachability and document height, not animation timing or scroll-linked choreography.

## Reference subject inventory

| Subject | What was safely observed | State coverage |
| --- | --- | --- |
| Loader | Distinct initial visual milestone before interaction; the preserved sampled audit showed no activity at that point but did not cover every later blocked discovery interval. | Captured in all 5 states |
| Entry | Gate with separate sound and silent choices; capture precedes activation. | Captured in all 5 states |
| Home | Global controls, project entries, availability/social information, and a canvas after verified entry completion. | Captured in desktop pointer and desktop sound-gate; mobile, keyboard, and reduced-motion blocked |
| Index | Separate project-selection state opened from home. | Captured in desktop pointer and desktop sound-gate; 3 states blocked |
| Project | Work → explicit project control → long case study with return/live/next handoffs. | Captured in desktop pointer and desktop sound-gate; 3 states blocked |
| About | Global About control → long modular page. | Captured in desktop pointer and desktop sound-gate; 3 states blocked |
| Footer | Scroll About to its end; retain contact/social and primary handoffs. | Captured in desktop pointer and desktop sound-gate; 3 states blocked |

`desktop-sound-gate` names the audit state, not the selected choice: the script still chooses only silent entry. For the reference target this makes it a byte-identical rerun of `desktop-pointer` (same destinations, `scrollHeight`, and audio-audit values in the preserved manifest); treat it as a second sample of the same silent-path audit, not as independent evidence of a distinct sound-choice condition.

## Input-specific findings

### Pointer

The preserved desktop pointer run recorded the full loader → entry → home → Index → project → About → footer chain after dispatching the expected controls. Because it predates the current post-dispatch predicates, its artifacts document the resulting snapshots but do not independently establish that every control changed state. It also does not measure cursor lag, magnetic attraction, hover interpolation, scroll inertia, transition duration, or easing.

### Touch

Touch emulation correctly reports a coarse pointer. After the explicit silent activation, no Work, About, Index, Projects, or Project control became hit-test reachable, so automation could not prove the entry layer had stopped intercepting input. Home, Index, project, About, and footer were emitted as blocked records. Force-clicking through the overlay or selecting the visible sound-enabled control would have invalidated the safety constraints and was not attempted.

### Keyboard

Current local pages expose keyboard focus in the global nav. The reference gate did not expose an explicitly silent keyboard target during the run. Automation therefore did not press a generic Continue control, click a non-semantic element, or select the sound-enabled option. All post-entry keyboard subjects are blocked.

### Reduced motion

Both targets report the requested media query correctly. Current canvases remain mounted, and the reference could not safely proceed past entry with keyboard input. No claim is made that scene motion, smooth scroll, transitions, or decorative effects are fully reduced on either site.

## Audio interaction contract derived from evidence

The observed gate makes consent sequencing important, but the redesign contract is stricter and original:

- Default to silent and never start audio automatically.
- Offer equally capable explicit sound and silent entry paths.
- Make both choices semantic and keyboard/touch/pointer operable.
- Persist the preference without blocking content.
- Keep a mute control available after entry.
- Honor reduced-motion and reduced-data preferences independently of audio.
- Treat any media play, AudioContext resume, or running context after silent entry as an audit concern.

The reference sound-enabled path is intentionally absent from the evidence set.

## Explicit baseline gaps

1. Current: loader, entry gate, audio preference, global Index, native case study, next-project sequence, persistent footer, internal Blog/Writing, custom not-found page, no-JS fallback, and static no-WebGL fallback.
2. Current: full keyboard traversal, mobile drawer containment, exact reduced-motion suppression, and scene-failure recovery are not demonstrated.
3. Reference: keyboard and reduced-motion behavior after entry are unverified.
4. Reference: mobile home/Index/project/About/footer are blocked because entry completion was not safely observable.
5. Reference: exact transition timing, pointer physics, hover behavior, and scroll physics are not measured.
6. Reference: two desktop silent-path audits report a running Web Audio context; no audible playback was observed because media remained unplayed and browser output was muted.
7. Reference evidence freshness: the preserved **20 captured / 15 blocked** manifest predates complete-ancestor activation checks, observable milestone predicates, and the widened pre-click-to-terminal audio interval. In particular, blocked silent-control discovery intervals do not prove absence of delayed pre-consent activity.

Any later parity claim must resolve these gaps with original implementation and direct accessibility/performance testing rather than assumption.
