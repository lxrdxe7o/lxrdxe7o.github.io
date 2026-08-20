# Phase 1: Core Shell & Astro Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the foundational Astro static shell, preserving all existing routes while integrating the new cyberpunk tokens and the four-corner navigation framework.

**Architecture:** We are moving from a Vite/React SPA to an Astro multi-page application. We will scaffold the static HTML shells for all pages, configure Playwright for E2E testing, and establish the base CSS architecture (tokens, typography, 4-corner layout) that subsequent JavaScript and WebGL layers will hook into.

**Tech Stack:** Node.js 22.22.3, Astro 7.1.2, TypeScript 6.0.3, Playwright 1.61.1

## Global Constraints

- Preserve and redesign every current public route.
- Implement a Four-Corner UI Framework and Vertical Sidebar Navigation.
- Maintain the Cyberpunk / Retro-Technical Dossier aesthetic.
- Do not copy reference source code, shaders, copy, fonts, images, video, 3D assets, or audio.
- Use only free and open-source runtime dependencies. Pin versions exactly in `package.json`.

---

### Task 1: Initialize Playwright and Route Parity Tests

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/e2e/route-parity.spec.ts`

**Interfaces:**
- Consumes: Existing local dev server on `http://localhost:4321`
- Produces: Playwright test suite ensuring all foundational routes return HTTP 200 and contain a `<main>` tag.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/e2e/route-parity.spec.ts
import { test, expect } from '@playwright/test';

const routes = [
  '/', '/about', '/projects', '/experience', 
  '/skills', '/uses', '/notes', '/now', '/contact'
];

for (const route of routes) {
  test(`Route ${route} should load and contain a main landmark`, async ({ page }) => {
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx playwright test tests/e2e/route-parity.spec.ts`
Expected: FAIL (Playwright is not configured yet, and the Astro routes might not have the correct `<main>` tag structure if the React migration isn't done).

- [ ] **Step 3: Write minimal implementation (Playwright Config)**

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:4321',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    }
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env.CI,
  },
});
```

- [ ] **Step 4: Run test to verify it passes (Assuming existing React routes have a main tag; if they fail, it's expected until Task 2)**

Run: `npx playwright test tests/e2e/route-parity.spec.ts`
Expected: We have our baseline test suite running.

- [ ] **Step 5: Commit**

```bash
git add playwright.config.ts tests/e2e/route-parity.spec.ts
git commit -m "test: add playwright configuration and route parity baseline"
```

---

### Task 2: Create the Astro BaseLayout & Shell

**Files:**
- Create: `src/layouts/BaseLayout.astro`
- Create: `src/pages/index.astro`

**Interfaces:**
- Consumes: Astro components.
- Produces: `BaseLayout.astro` containing the HTML shell, `<head>`, and `<main>` tag.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/e2e/shell-structure.spec.ts
import { test, expect } from '@playwright/test';

test('BaseLayout contains proper semantic HTML shell', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('meta[name="viewport"]')).toHaveCount(1);
  await expect(page.locator('main#main-content')).toBeVisible();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx playwright test tests/e2e/shell-structure.spec.ts`
Expected: FAIL (BaseLayout doesn't exist or misses the `main-content` ID).

- [ ] **Step 3: Write minimal implementation**

```astro
---
// src/layouts/BaseLayout.astro
export interface Props {
	title: string;
	description?: string;
}

const { title, description = 'lxrdxe7o - Full-Stack Developer' } = Astro.props;
---

<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<meta name="description" content={description} />
		<title>{title}</title>
	</head>
	<body>
		<main id="main-content">
			<slot />
		</main>
	</body>
</html>
```

```astro
---
// src/pages/index.astro
import BaseLayout from '../layouts/BaseLayout.astro';
---

<BaseLayout title="lxrdxe7o | Full-Stack Developer">
	<h1>lxrdxe7o</h1>
</BaseLayout>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx playwright test tests/e2e/shell-structure.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/layouts/BaseLayout.astro src/pages/index.astro tests/e2e/shell-structure.spec.ts
git commit -m "feat: implement semantic Astro BaseLayout and index page"
```

---

### Task 3: Establish Cyberpunk Tokens & 4-Corner UI Frame

**Files:**
- Create: `src/styles/tokens.css`
- Create: `src/components/shell/CornerFrame.astro`
- Modify: `src/layouts/BaseLayout.astro`

**Interfaces:**
- Consumes: BaseLayout HTML structure.
- Produces: A globally available four-corner pinning system utilizing CSS grid/fixed positioning, with cyberpunk color tokens (black background, red accents, monospace font).

- [ ] **Step 1: Write the failing test**

```typescript
// tests/e2e/four-corner.spec.ts
import { test, expect } from '@playwright/test';

test('Four-corner UI frame is visible on the page', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.corner-frame-top-left')).toBeVisible();
  await expect(page.locator('.corner-frame-top-right')).toBeVisible();
  await expect(page.locator('.corner-frame-bottom-left')).toBeVisible();
  await expect(page.locator('.corner-frame-bottom-right')).toBeVisible();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx playwright test tests/e2e/four-corner.spec.ts`
Expected: FAIL (Elements do not exist).

- [ ] **Step 3: Write minimal implementation**

```css
/* src/styles/tokens.css */
:root {
  --color-bg: #050505;
  --color-text: #ffffff;
  --color-accent: #ff2a2a;
  --font-mono: 'JetBrains Mono', monospace;
  --spacing-edge: 2rem;
}

body {
  background-color: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-mono);
  margin: 0;
  overflow: hidden; /* Prepares for viewport-locked scrolling */
}
```

```astro
---
// src/components/shell/CornerFrame.astro
---
<div class="corner-frame">
  <div class="corner-frame-top-left">lxrdxe7o</div>
  <div class="corner-frame-top-right">Audio: Off</div>
  <div class="corner-frame-bottom-left">Full-Stack Dev</div>
  <div class="corner-frame-bottom-right">Available</div>
</div>

<style>
  .corner-frame {
    position: fixed;
    top: var(--spacing-edge);
    left: var(--spacing-edge);
    right: var(--spacing-edge);
    bottom: var(--spacing-edge);
    pointer-events: none;
    z-index: 100;
  }
  .corner-frame > div {
    position: absolute;
    pointer-events: auto;
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .corner-frame-top-left { top: 0; left: 0; color: var(--color-accent); }
  .corner-frame-top-right { top: 0; right: 0; }
  .corner-frame-bottom-left { bottom: 0; left: 0; }
  .corner-frame-bottom-right { bottom: 0; right: 0; }
</style>
```

```astro
---
// Modify src/layouts/BaseLayout.astro (Replace file content)
export interface Props {
	title: string;
	description?: string;
}

import '../styles/tokens.css';
import CornerFrame from '../components/shell/CornerFrame.astro';

const { title, description = 'lxrdxe7o - Full-Stack Developer' } = Astro.props;
---

<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<meta name="description" content={description} />
		<title>{title}</title>
	</head>
	<body>
		<CornerFrame />
		<main id="main-content">
			<slot />
		</main>
	</body>
</html>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx playwright test tests/e2e/four-corner.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/styles/tokens.css src/components/shell/CornerFrame.astro src/layouts/BaseLayout.astro tests/e2e/four-corner.spec.ts
git commit -m "feat: implement cyberpunk tokens and 4-corner UI frame"
```
