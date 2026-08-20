# Cyberpunk-Reference Portfolio Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` (recommended) or `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the portfolio as an award-caliber creative developer experience that matches the exact mechanics, structure, pacing, interaction quality, WebGL presence, and audio experience of [rogierdeboeve.com](https://rogierdeboeve.com/)—but cloaked in a cohesive, premium **cyberpunk/retro-technical dossier** aesthetic. The design relies on monospaced technical typography, stark contrast, and dynamic theme shifting, avoiding generic glassmorphism.

**Architecture:** Astro supplies statically rendered, content-first routes and typed MDX. A framework-independent vanilla TypeScript runtime persists across Astro route swaps and owns one Three.js/Alien.js renderer, deterministic scene state, transitions, input, quality adaptation, assets, and audio. DOM choreography uses Motion, scrolling mechanics utilize viewport-locked hijacking for carousels (with Lenis for detail pages), and Howler controls a fully optional original sound layer.

## Global Constraints & Mechanics

- Preserve and redesign every current public route, but map them onto the reference site's mechanics.
- **Layout:** Implement a **Four-Corner UI Framework** where key interface elements are pinned to the extreme corners, framing the screen dynamically.
- **Navigation:** Implement a persistent **Vertical Sidebar Navigation** for primary links (Work, About) along the left edge.
- **Scrolling:** Use **Viewport-Locked Scroll Hijacking** for main indexes (like Work/Projects). Mouse wheel inputs trigger smooth CSS/WebGL transitions between items rather than moving a page scrollbar.
- **Cursor:** Implement a **Custom Follower Cursor** (e.g., a technical circle or reticle) that morphs when hovering over interactive elements.
- **Theme:** Maintain the overarching **Cyberpunk / Retro-Technical Dossier** aesthetic (monospaced fonts, dark void background, technical framing), but use **Dynamic Theme Shifting** where accent colors and WebGL background elements morph to match the currently viewed project.
- **WebGL:** Utilize a **Full-Viewport WebGL Particle/Data-Stream Background** that reacts to cursor parallax, transitions, and scroll velocity.
- **Audio:** Audio must be opt-in via an explicit `Enter with sound / Enter without sound` gate. Sound must feature low-fi tech hums, keystrokes, and digital interaction blips. Silent mode remains first-class.
- **Performance:** Adaptive WebGL quality, a reduced-motion mode, a static no-WebGL mode, and resilient failure states are required.
- Do not copy reference source code, shaders, copy, fonts, images, video, 3D assets, or audio. 

---

## 1. Problem Statement

The current React/Vite portfolio is organized around traditional vertical scrolling, repeated glass-card patterns, unrelated color themes, and disjointed page loading. 

The redesign must replace this with a highly immersive, cinematic, application-like experience that matches the mechanical brilliance of the reference site, but retains and elevates the user's personal "cyberpunk hacker" brand. Spectacle must never compromise legibility, factual credibility, navigation, accessibility, or loading performance.

## 2. Locked Product Requirements

### 2.1 Identity and Audience
- Primary mark: `lxrdxe7o`
- Professional title: `Full-Stack Developer`
- Human signature: `Ishraful Haque`
- Aesthetic: Cyberpunk / Retro-technical dossier (Terminal typography, deep blacks, vivid shifting accents).

### 2.2 Experience Model
1. **Asset Loader:** A real asset-loading sequence shows progress, leading to an Entry Gate.
2. **Audio Gate:** Offers `Enter with sound` and `Enter without sound` before audio playback begins.
3. **Four-Corner Layout:** Identity, availability, and audio controls are pinned to the viewport corners.
4. **Vertical Navigation:** Work and About are oriented vertically on the edge.
5. **Full-Viewport WebGL:** A persistent canvas sits behind the DOM, rendering a reactive technical particle/data stream that shifts accent colors per project.
6. **Viewport-Locked Index:** The project index is a scroll-hijacked carousel. Scrolling transitions projects smoothly while the background morphs.
7. **Custom Cursor:** A custom tech-reticle cursor replaces the default browser pointer, scaling/morphing on interactables.
8. **Cinematic Handoffs:** Page changes combine DOM choreography with render-target transitions inside the canvas.
9. **Cyberpunk Audio:** Sound enriches interaction with UI blips and ambient hums only after consent.

## 3. Proposed Architecture

- **Astro** owns HTML generation and static routes.
- **ExperienceRuntime** owns the lifecycle: `boot()`, `enter(mode)`, `prepareNavigation()`, `commitNavigation()`, `destroy()`.
- **Three.js Renderer** owns exactly one canvas. Route states supply deterministic scene parameters.
- **InputManager** normalizes pointer, touch, and scroll. It detects scroll intent to drive the viewport-locked carousels.

---

## 4. Implementation Strategy

Every task follows a TDD delivery cycle: test -> fail -> implement -> verify -> demo.

### Task 1: Baseline Capture
- **Objective:** Create a reproducible evidence set for current-route behavior and reference observable layout/mechanics.

### Task 2: Migrate to Astro Route-Parity Shell
- **Objective:** Replace React/Vite with an Astro build preserving all routes statically.

### Task 3: Typed Content Collections
- **Objective:** Establish repository-based MDX for projects and writing.

### Task 4: Audit & Curation
- **Objective:** Produce an evidence-backed shortlist of flagship projects.

### Task 5: Media Pipeline
- **Objective:** Generate screenshots, videos, and manifests for projects.

### Task 6: Establish Cyberpunk Tokens & 4-Corner Shell
- **Objective:** Establish the sparse, terminal-inspired editorial system. Pin core UI to the 4 corners, set up the vertical sidebar navigation, and prepare the custom cursor container.

### Task 7: Runtime State Machine
- **Objective:** Create the deterministic authority for boot, loading, entry choice, and navigation.

### Task 8: Persistent Deterministic WebGL Renderer
- **Objective:** Introduce the single-canvas renderer and the full-viewport "digital void/data stream" base scene.

### Task 9: Adaptive Quality & Frame-Budget
- **Objective:** Maintain stable visual tiers (DPR capping, particle count scaling).

### Task 10: Normalize Input & Viewport-Locked Scrolling
- **Objective:** Replace passive scrolling with a unified signal layer. Implement scroll hijacking for the main carousel interfaces, while preserving native smooth scrolling (Lenis) for detail pages where applicable.

### Task 11: Asset Manager & Real Progress Loader
- **Objective:** Build manifest-driven critical asset acquisition.

### Task 12: Cyberpunk Audio & Entry Gate
- **Objective:** Deliver the "with/without sound" gate and the opt-in audio manager featuring low-fi hums and terminal UI blips.

### Task 13: Astro Navigation & Render-Target Transitions
- **Objective:** Turn static Astro routes into one continuous experience.

### Task 14: Home Identity Experience
- **Objective:** Build the final home composition inside the 4-corner framework, featuring oversized terminal typography.

### Task 15: Scroll-Hijacked Work Carousel
- **Objective:** Build the high-impact project listing using viewport-locked scrolling. Scrolling changes the active project, morphs the WebGL background colors to match the project, and updates the dossier metadata.

### Task 16: Expanded Full-Screen Index
- **Objective:** Provide a global animated Index exposing all routes via a modal overlay.

### Task 17: Flagship Case Studies & Fading Wall
- **Objective:** Ship complete case studies. Implement the "fading showcase wall" where scrolling dissolves the terminal text and reveals project media layouts.

### Task 18: Archive & Secondary Projects
- **Objective:** Finish remaining projects in a lightweight, searchable archive.

### Task 19: About, Experience, Skills
- **Objective:** Present verified facts using the consistent cyberpunk visual language.

### Task 20: Utilities (Uses, Now, Contact)
- **Objective:** Complete supporting routes.

### Task 21: Native Writing & Notes
- **Objective:** Replace external blog with native MDX rendering.

### Task 22 & 23: Lab & Experiments
- **Objective:** Add safe interactive experiments (seeded data visualization, audio-reactive inputs).

### Task 24: SEO, Feeds, Social
- **Objective:** Ensure discoverability and canonical URLs.

### Task 25: Fallbacks & Security
- **Objective:** Ensure resilient degradation for unsupported devices/networks.

### Task 26: Calibrate Visual, Motion, and Audio Parity
- **Objective:** Compare the implemented experience against the reference's pacing, tuning the cyberpunk adaptation to feel just as premium.

### Task 27: Accessibility & Performance Hardening
- **Objective:** Meet WCAG 2.2 AA, Core Web Vitals, and 60 FPS budgets.

### Task 28: Final Integration & Release
- **Objective:** Freeze content, wire CI, produce a reproducible static release artifact.

---

## 5. Required Human Review Points
1. **After Task 4:** Approve project shortlist and copy.
2. **During Tasks 12 & 26:** Review sound direction and mechanic parity.
3. **Before Task 28:** Approve all public copy and final experience.
4. **After Task 28:** Decide deployment action.
