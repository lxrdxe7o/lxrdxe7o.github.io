import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from 'node:fs'
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import { expect, test } from '@playwright/test'

import playwrightConfig from '../../playwright.config.ts'
import {
  captureCurrentBaseline,
  normalizeVolatileCurrentContent,
  renderBaselineIndex,
} from '../../scripts/reference/capture-current.ts'
import {
  captureReferenceBaseline,
  chooseSilentEntryLabel,
  evaluateAudioSafety,
} from '../../scripts/reference/capture-reference.ts'
import {
  APPROVED_CAPTURE_STATES,
  CURRENT_ROUTES,
  REFERENCE_SUBJECTS,
  createCapturePlan,
  validateCaptureRecords,
} from '../fixtures/viewports'

const capturedAt = '2026-01-15T12:00:00.000Z'

test('starts a dedicated local evidence server instead of reusing port 4173', () => {
  expect(playwrightConfig.webServer).toEqual(
    expect.objectContaining({ reuseExistingServer: false }),
  )
})

test('enumerates viewport and preference states deterministically with unique artifact paths', () => {
  const input = {
    target: 'current' as const,
    origin: 'http://127.0.0.1:4173',
    subjects: CURRENT_ROUTES,
    states: APPROVED_CAPTURE_STATES,
    capturedAt,
  }

  const firstPlan = createCapturePlan(input)
  const secondPlan = createCapturePlan(input)

  expect(firstPlan).toEqual(secondPlan)
  expect(firstPlan).toHaveLength(
    CURRENT_ROUTES.length * APPROVED_CAPTURE_STATES.length,
  )

  const artifactPaths = firstPlan.map((record) => record.artifactPath)
  expect(new Set(artifactPaths).size).toBe(artifactPaths.length)

  expect(new Set(firstPlan.map((record) => record.state.id))).toEqual(
    new Set(APPROVED_CAPTURE_STATES.map((state) => state.id)),
  )
  expect(firstPlan.every((record) => record.capturedAt === capturedAt)).toBe(true)
  expect(
    firstPlan.every((record) =>
      record.artifactPath.startsWith('artifacts/baseline/current/'),
    ),
  ).toBe(true)
})

test('represents unavailable current sound-gate states as explicit gap evidence', () => {
  const plan = createCapturePlan({
    target: 'current',
    origin: 'http://127.0.0.1:4173',
    subjects: CURRENT_ROUTES,
    states: APPROVED_CAPTURE_STATES,
    capturedAt,
  })

  const gapRecords = plan.filter((record) => record.state.soundGate)
  const captureRecords = plan.filter((record) => !record.state.soundGate)

  expect(gapRecords).toHaveLength(CURRENT_ROUTES.length)
  expect(gapRecords.every((record) => record.status === 'gap')).toBe(true)
  expect(
    gapRecords.every((record) => record.artifactPath.endsWith('.gap.json')),
  ).toBe(true)
  expect(
    gapRecords.every((record) =>
      record.limitation?.includes('no sound-entry gate'),
    ),
  ).toBe(true)
  expect(captureRecords.every((record) => record.status === 'planned')).toBe(
    true,
  )
  expect(
    captureRecords.every((record) => record.artifactPath.endsWith('.png')),
  ).toBe(true)
})


test('rejects duplicate artifact paths and incomplete subject-state coverage', () => {
  const plan = createCapturePlan({
    target: 'current',
    origin: 'http://127.0.0.1:4173',
    subjects: CURRENT_ROUTES,
    states: APPROVED_CAPTURE_STATES,
    capturedAt,
  })

  expect(
    validateCaptureRecords(plan, CURRENT_ROUTES, APPROVED_CAPTURE_STATES),
  ).toEqual([])

  const invalidPlan = plan.slice(1).map((record, index) =>
    index === 0
      ? { ...record, artifactPath: plan[1]?.artifactPath ?? record.artifactPath }
      : record,
  )
  invalidPlan[1] = {
    ...invalidPlan[1]!,
    artifactPath: invalidPlan[0]!.artifactPath,
  }

  expect(
    validateCaptureRecords(invalidPlan, CURRENT_ROUTES, APPROVED_CAPTURE_STATES),
  ).toEqual(
    expect.arrayContaining([
      expect.stringContaining('Duplicate artifact path'),
      expect.stringContaining('Missing capture combination: home/desktop-pointer'),
    ]),
  )
})


test('selects only an unambiguous explicit silent entry option', () => {
  expect(
    chooseSilentEntryLabel([
      'Enter with sound',
      'Enter without sound',
      'Privacy',
    ]),
  ).toBe('Enter without sound')
  expect(
    chooseSilentEntryLabel(['Enter with sound / Enter without sound']),
  ).toBeNull()
  expect(chooseSilentEntryLabel(['Enter with sound', 'Continue'])).toBeNull()
  expect(chooseSilentEntryLabel(['Enable audio', 'Sound on'])).toBeNull()
})


test('never activates a silent text child inside an ambiguous sound action', async ({
  browser,
}) => {
  test.setTimeout(60_000)
  const workspaceRoot = mkdtempSync(
    join(tmpdir(), 'portfolio-reference-ambiguous-entry-test-'),
  )
  let soundOptionRequests = 0
  const fixture = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Ambiguous entry fixture</title></head>
<body>
  <div id="gate">
    <div onclick="fetch('/sound-click'); document.querySelector('#gate').hidden = true; document.querySelector('#app').hidden = false">
      <span>Enter with sound / </span><span>Enter without sound</span>
    </div>
  </div>
  <main id="app" hidden>
    <h1>Reference Home</h1>
    <nav><button>Work</button><button>About</button></nav>
  </main>
</body></html>`
  const server = createServer((request, response) => {
    if (request.url === '/sound-click') {
      soundOptionRequests += 1
      response.writeHead(204).end()
      return
    }
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
    response.end(fixture)
  })
  await new Promise<void>((resolveListen) =>
    server.listen(0, '127.0.0.1', resolveListen),
  )
  const address = server.address() as AddressInfo

  try {
    const pointerState = APPROVED_CAPTURE_STATES.find(
      (state) => state.id === 'desktop-pointer',
    )!
    const result = await captureReferenceBaseline({
      browser,
      origin: `http://127.0.0.1:${address.port}`,
      workspaceRoot,
      capturedAt,
      states: [pointerState],
      subjects: REFERENCE_SUBJECTS.slice(0, 3),
    })

    expect(soundOptionRequests).toBe(0)
    expect(result.records.find((record) => record.subject.id === 'home')).toEqual(
      expect.objectContaining({ status: 'blocked' }),
    )
  } finally {
    try {
      await new Promise<void>((resolveClose, rejectClose) =>
        server.close((error) =>
          error ? rejectClose(error) : resolveClose(),
        ),
      )
    } finally {
      rmSync(workspaceRoot, { recursive: true, force: true })
    }
  }
})


test('never activates a semantic silent child inside an ambiguous action chain', async ({
  browser,
}) => {
  test.setTimeout(60_000)
  const workspaceRoot = mkdtempSync(
    join(tmpdir(), 'portfolio-reference-nested-ambiguous-entry-test-'),
  )
  let soundOptionRequests = 0
  const fixture = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Nested ambiguous entry fixture</title></head>
<body>
  <div id="gate">
    <div onclick="fetch('/sound-click'); document.querySelector('#gate').hidden = true; document.querySelector('#app').hidden = false">
      <span>Enter with sound / </span><button>Enter without sound</button>
    </div>
  </div>
  <main id="app" hidden>
    <h1>Reference Home</h1>
    <nav><button>Work</button><button>About</button></nav>
  </main>
</body></html>`
  const server = createServer((request, response) => {
    if (request.url === '/sound-click') {
      soundOptionRequests += 1
      response.writeHead(204).end()
      return
    }
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
    response.end(fixture)
  })
  await new Promise<void>((resolveListen) =>
    server.listen(0, '127.0.0.1', resolveListen),
  )
  const address = server.address() as AddressInfo

  try {
    const pointerState = APPROVED_CAPTURE_STATES.find(
      (state) => state.id === 'desktop-pointer',
    )!
    const result = await captureReferenceBaseline({
      browser,
      origin: `http://127.0.0.1:${address.port}`,
      workspaceRoot,
      capturedAt,
      states: [pointerState],
      subjects: REFERENCE_SUBJECTS.slice(0, 3),
    })

    expect(soundOptionRequests).toBe(0)
    expect(result.records.find((record) => record.subject.id === 'home')).toEqual(
      expect.objectContaining({ status: 'blocked' }),
    )
  } finally {
    try {
      await new Promise<void>((resolveClose, rejectClose) =>
        server.close((error) =>
          error ? rejectClose(error) : resolveClose(),
        ),
      )
    } finally {
      rmSync(workspaceRoot, { recursive: true, force: true })
    }
  }
})


test('renders a side-by-side baseline index with explicit limitations', () => {
  const currentRecord = createCapturePlan({
    target: 'current',
    origin: 'http://127.0.0.1:4173',
    subjects: CURRENT_ROUTES.slice(0, 1),
    states: APPROVED_CAPTURE_STATES.slice(0, 1),
    capturedAt,
  })[0]!
  const referenceRecord = {
    ...currentRecord,
    target: 'reference' as const,
    artifactPath:
      'artifacts/baseline/reference/desktop-pointer/home.blocked.json',
    status: 'blocked' as const,
    limitation: 'Public automation was blocked.',
  }

  const html = renderBaselineIndex([currentRecord, referenceRecord])

  expect(html).toContain('Behavioral baseline evidence')
  expect(html).toContain('Current · Home')
  expect(html).toContain('Reference · Home')
  expect(html).toContain('Desktop pointer')
  expect(html).toContain('Public automation was blocked.')
  expect(html).toContain('current/desktop-pointer/home.png')
  expect(html).toContain('data-comparison="desktop-pointer/home"')
  expect(html.indexOf('Current · Home')).toBeLessThan(
    html.indexOf('Reference · Home'),
  )
  expect(html).toContain('Current · Loader')
  expect(html).toContain('Current · Index')
  expect(html).toContain('Current · Project sequence')
  expect(html).toContain('Current · Footer')
  expect(html).toContain('No equivalent current loader milestone exists.')
})


test('normalizes volatile current handoff text before observation and capture', async ({
  page,
}) => {
  await page.setContent(`<!doctype html>
    <main>
      <p>CURRENT TIME: <span>02:58:39 BST</span></p>
      <h1>ARCHIVAL X$7 RANDOMIZED</h1>
      <h2>Stable heading</h2>
    </main>`)

  await normalizeVolatileCurrentContent(page, 'blog')

  const bodyText = await page.locator('body').innerText()
  expect(bodyText).not.toMatch(/\b\d{2}:\d{2}:\d{2}\s+BST\b/)
  expect(bodyText).toContain('[masked current time]')
  expect(await page.locator('h1').innerText()).toBe(
    '[masked dynamic heading]',
  )
  expect(await page.locator('h2').innerText()).toBe('Stable heading')
})


test('keeps masking a continuously regenerating heading and paragraph through capture time', async ({
  page,
}) => {
  await page.setContent(`<!doctype html>
    <main>
      <p id="ref">REF: XERO-DEV-07</p>
      <p id="class-line">Class: ARCHIVAL</p>
      <h1 id="glitch">placeholder</h1>
      <p id="random">placeholder</p>
      <h2>Stable heading</h2>
      <p id="stable-copy">System configuration files for Neovim, Tmux, Zsh.</p>
    </main>
    <script>
      function randomGlitch(length) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()[]{}<>~:;'
        let out = ''
        for (let i = 0; i < length; i += 1) {
          out += chars[Math.floor(Math.random() * chars.length)]
        }
        return out
      }
      function regenerate() {
        document.getElementById('glitch').textContent =
          'ARCH' + randomGlitch(20)
        document.getElementById('random').textContent = randomGlitch(9)
      }
      regenerate()
      setInterval(regenerate, 80)
    </script>`)

  await normalizeVolatileCurrentContent(page, 'blog')
  // Simulate the delay between normalization and the eventual screenshot,
  // during which the fixture's interval keeps regenerating both elements.
  await page.waitForTimeout(500)

  expect(await page.locator('#glitch').innerText()).toBe(
    '[masked dynamic heading]',
  )
  expect(await page.locator('#random').innerText()).toBe(
    '[masked dynamic text]',
  )
  expect(await page.locator('#ref').innerText()).toBe('REF: XERO-DEV-07')
  expect(await page.locator('#class-line').innerText()).toBe('Class: ARCHIVAL')
  expect(await page.locator('h2').innerText()).toBe('Stable heading')
  expect(await page.locator('#stable-copy').innerText()).toBe(
    'System configuration files for Neovim, Tmux, Zsh.',
  )
})


test('keeps masking a continuously re-rendering clock through capture time', async ({
  page,
}) => {
  await page.setContent(`<!doctype html>
    <main>
      <p>CURRENT TIME: <span id="clock">00:00:00 BST</span></p>
      <h2>Stable heading</h2>
    </main>
    <script>
      function pad(value) {
        return String(value).padStart(2, '0')
      }
      function tick() {
        const now = new Date()
        document.getElementById('clock').textContent =
          pad(now.getUTCHours()) +
          ':' +
          pad(now.getUTCMinutes()) +
          ':' +
          pad(now.getUTCSeconds()) +
          ' BST'
      }
      tick()
      setInterval(tick, 90)
    </script>`)

  // 'home' exercises only the general timestamp mask, not the blog-specific
  // dynamic-text pass, isolating this regression from that other fix.
  await normalizeVolatileCurrentContent(page, 'home')
  // Simulate the delay between normalization and the eventual screenshot,
  // during which the fixture's clock keeps re-rendering its text node.
  await page.waitForTimeout(700)

  const bodyText = await page.locator('body').innerText()
  expect(bodyText).not.toMatch(/\b\d{2}:\d{2}:\d{2}\s+BST\b/)
  expect(bodyText).toContain('[masked current time]')
  expect(await page.locator('h2').innerText()).toBe('Stable heading')
})


test('@capture-current captures every current route with complete manifest coverage', async ({
  browser,
  baseURL,
}) => {
  test.setTimeout(10 * 60_000)
  expect(baseURL).toBeTruthy()

  const result = await captureCurrentBaseline({
    browser,
    origin: baseURL!,
    workspaceRoot: process.cwd(),
    capturedAt: process.env.CAPTURE_TIMESTAMP ?? new Date().toISOString(),
  })

  expect(result.records).toHaveLength(
    CURRENT_ROUTES.length * APPROVED_CAPTURE_STATES.length,
  )
  expect(
    validateCaptureRecords(
      result.records,
      CURRENT_ROUTES,
      APPROVED_CAPTURE_STATES,
    ),
  ).toEqual([])

  for (const route of CURRENT_ROUTES) {
    const capturedRouteRecords = result.records.filter(
      (record) => record.subject.id === route.id && record.status === 'captured',
    )
    expect(capturedRouteRecords.length).toBeGreaterThan(0)
    expect(
      capturedRouteRecords.every((record) =>
        existsSync(resolve(process.cwd(), record.artifactPath)),
      ),
    ).toBe(true)
  }

  const gapRecords = result.records.filter((record) => record.status === 'gap')
  expect(gapRecords).toHaveLength(CURRENT_ROUTES.length)
  expect(
    gapRecords.every((record) =>
      existsSync(resolve(process.cwd(), record.artifactPath)),
    ),
  ).toBe(true)
  expect(existsSync(resolve(process.cwd(), result.manifestPath))).toBe(true)
  expect(existsSync(resolve(process.cwd(), result.indexPath))).toBe(true)

  const manifest = JSON.parse(
    readFileSync(resolve(process.cwd(), result.manifestPath), 'utf8'),
  ) as { records: typeof result.records }
  expect(manifest.records).toHaveLength(result.records.length)
  expect(
    manifest.records.every(
      (record) =>
        Boolean(record.url) &&
        Boolean(record.artifactPath) &&
        Boolean(record.capturedAt) &&
        record.state.viewport.width > 0 &&
        record.state.viewport.height > 0,
    ),
  ).toBe(true)
})


test('enumerates every required reference comparison state', () => {
  expect(REFERENCE_SUBJECTS.map((subject) => subject.id)).toEqual([
    'loader',
    'entry',
    'home',
    'index',
    'project',
    'about',
    'footer',
  ])

  const plan = createCapturePlan({
    target: 'reference',
    origin: 'https://rogierdeboeve.com/',
    subjects: REFERENCE_SUBJECTS,
    states: APPROVED_CAPTURE_STATES,
    capturedAt,
  })

  expect(plan).toHaveLength(
    REFERENCE_SUBJECTS.length * APPROVED_CAPTURE_STATES.length,
  )
  expect(
    validateCaptureRecords(
      plan,
      REFERENCE_SUBJECTS,
      APPROVED_CAPTURE_STATES,
    ),
  ).toEqual([])
  expect(plan.every((record) => record.artifactPath.endsWith('.png'))).toBe(
    true,
  )
})


test('classifies audio by whether the silent path was exercised', () => {
  const silentSnapshot = {
    mediaPlayAttempts: 0,
    audioContextResumeAttempts: 0,
    playingMediaElements: 0,
    runningAudioContexts: 0,
  }

  expect(evaluateAudioSafety(silentSnapshot, silentSnapshot, true)).toEqual({
    safe: true,
    automaticAudioDetected: false,
    silentPathAudioDetected: false,
    silentPathExercised: true,
    reasons: [],
  })

  expect(
    evaluateAudioSafety(
      { ...silentSnapshot, mediaPlayAttempts: 1 },
      { ...silentSnapshot, mediaPlayAttempts: 1 },
      true,
    ),
  ).toEqual(
    expect.objectContaining({
      safe: false,
      automaticAudioDetected: true,
      silentPathAudioDetected: false,
      silentPathExercised: true,
      reasons: expect.arrayContaining([
        expect.stringContaining('before entry consent'),
      ]),
    }),
  )

  expect(
    evaluateAudioSafety(
      silentSnapshot,
      { ...silentSnapshot, audioContextResumeAttempts: 1 },
      true,
    ),
  ).toEqual(
    expect.objectContaining({
      safe: false,
      silentPathAudioDetected: true,
      silentPathExercised: true,
      reasons: expect.arrayContaining([
        expect.stringContaining('silent entry'),
      ]),
    }),
  )

  expect(
    evaluateAudioSafety(
      silentSnapshot,
      { ...silentSnapshot, mediaPlayAttempts: 1 },
      false,
    ),
  ).toEqual(
    expect.objectContaining({
      safe: false,
      automaticAudioDetected: true,
      silentPathAudioDetected: false,
      silentPathExercised: false,
      reasons: expect.arrayContaining([
        expect.stringContaining('before entry consent'),
      ]),
    }),
  )
})


test('classifies delayed activity during silent discovery as automatic audio', async ({
  browser,
}) => {
  test.setTimeout(60_000)
  const workspaceRoot = mkdtempSync(
    join(tmpdir(), 'portfolio-reference-delayed-audio-test-'),
  )
  const fixture = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Delayed audio fixture</title></head>
<body>
  <audio></audio>
  <script>
    setTimeout(() => {
      const attempt = document.querySelector('audio').play()
      if (attempt) attempt.catch(() => undefined)
    }, 2000)
  </script>
  <button>Enter with sound</button>
  <div>Enter without sound</div>
  <main><h1>Reference Home</h1></main>
</body></html>`
  const server = createServer((_request, response) => {
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
    response.end(fixture)
  })
  await new Promise<void>((resolveListen) =>
    server.listen(0, '127.0.0.1', resolveListen),
  )
  const address = server.address() as AddressInfo

  try {
    const keyboardState = APPROVED_CAPTURE_STATES.find(
      (state) => state.id === 'desktop-keyboard',
    )!
    const result = await captureReferenceBaseline({
      browser,
      origin: `http://127.0.0.1:${address.port}`,
      workspaceRoot,
      capturedAt,
      states: [keyboardState],
      subjects: REFERENCE_SUBJECTS.slice(0, 3),
    })

    expect(result.records.find((record) => record.subject.id === 'home')).toEqual(
      expect.objectContaining({ status: 'blocked' }),
    )
    expect(result.audioSafety).toEqual([
      expect.objectContaining({
        stateId: 'desktop-keyboard',
        status: 'unsafe',
        safe: false,
        automaticAudioDetected: true,
        silentPathAudioDetected: false,
        silentPathExercised: false,
        reasons: expect.arrayContaining([
          expect.stringContaining('before entry consent'),
          expect.stringContaining('could not be verified'),
        ]),
      }),
    ])
  } finally {
    try {
      await new Promise<void>((resolveClose, rejectClose) =>
        server.close((error) =>
          error ? rejectClose(error) : resolveClose(),
        ),
      )
    } finally {
      rmSync(workspaceRoot, { recursive: true, force: true })
    }
  }
})


test('audits audio through later post-entry milestones', async ({ browser }) => {
  test.setTimeout(60_000)
  const workspaceRoot = mkdtempSync(
    join(tmpdir(), 'portfolio-reference-late-audio-test-'),
  )
  const fixture = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Late audio fixture</title>
<script>
  function showAboutWithLateAudio() {
    document.querySelector('#about').hidden = false
    setTimeout(() => {
      const attempt = document.querySelector('audio').play()
      if (attempt) attempt.catch(() => undefined)
    }, 100)
  }
</script></head>
<body>
  <audio></audio>
  <div id="gate">
    <button>Enter with sound</button>
    <button onclick="document.querySelector('#gate').hidden = true; document.querySelector('#app').hidden = false">Enter without sound</button>
  </div>
  <main id="app" hidden>
    <h1>Reference Home</h1>
    <nav>
      <button onclick="document.querySelector('#index').hidden = false">Index</button>
      <button onclick="showAboutWithLateAudio()">About</button>
    </nav>
    <section id="index" hidden><h2>Project Index</h2></section>
    <section id="about" hidden style="min-height:1200px"><h2>About profile</h2></section>
    <footer>Contact footer</footer>
  </main>
</body></html>`
  const server = createServer((_request, response) => {
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
    response.end(fixture)
  })
  await new Promise<void>((resolveListen) =>
    server.listen(0, '127.0.0.1', resolveListen),
  )
  const address = server.address() as AddressInfo

  try {
    const pointerState = APPROVED_CAPTURE_STATES.find(
      (state) => state.id === 'desktop-pointer',
    )!
    const subjects = REFERENCE_SUBJECTS.filter((subject) =>
      ['loader', 'entry', 'home', 'index', 'about', 'footer'].includes(
        subject.id,
      ),
    )
    const result = await captureReferenceBaseline({
      browser,
      origin: `http://127.0.0.1:${address.port}`,
      workspaceRoot,
      capturedAt,
      states: [pointerState],
      subjects,
    })

    expect(result.audioSafety).toEqual([
      expect.objectContaining({
        stateId: 'desktop-pointer',
        status: 'unsafe',
        safe: false,
        automaticAudioDetected: false,
        silentPathAudioDetected: true,
        silentPathExercised: true,
        reasons: expect.arrayContaining([
          expect.stringContaining('silent entry'),
        ]),
      }),
    ])
  } finally {
    try {
      await new Promise<void>((resolveClose, rejectClose) =>
        server.close((error) =>
          error ? rejectClose(error) : resolveClose(),
        ),
      )
    } finally {
      rmSync(workspaceRoot, { recursive: true, force: true })
    }
  }
})


test('preserves frame audio history across later document navigation', async ({
  browser,
}) => {
  test.setTimeout(60_000)
  const workspaceRoot = mkdtempSync(
    join(tmpdir(), 'portfolio-reference-navigation-audio-test-'),
  )
  const entryFixture = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Entry document</title></head>
<body>
  <div id="gate">
    <button>Enter with sound</button>
    <button onclick="location.href = '/home'">Enter without sound</button>
  </div>
</body></html>`
  const homeFixture = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Home document</title>
<script>
  function visitAbout() {
    const audio = document.querySelector('iframe').contentDocument.querySelector('audio')
    const attempt = audio.play()
    if (attempt) attempt.catch(() => undefined)
    setTimeout(() => { location.href = '/about' }, 100)
  }
</script></head>
<body>
  <main>
    <h1>Reference Home</h1>
    <iframe title="Audio frame" src="/audio-frame"></iframe>
    <button onclick="visitAbout()">About</button>
  </main>
</body></html>`
  const aboutFixture = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>About document</title></head>
<body>
  <main><h1>About profile</h1><section style="min-height:1200px">Profile</section></main>
  <footer>Contact footer</footer>
</body></html>`
  const frameFixture = `<!doctype html><html lang="en"><body><audio></audio></body></html>`
  const server = createServer((request, response) => {
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
    if (request.url === '/home') response.end(homeFixture)
    else if (request.url === '/about') response.end(aboutFixture)
    else if (request.url === '/audio-frame') response.end(frameFixture)
    else response.end(entryFixture)
  })
  await new Promise<void>((resolveListen) =>
    server.listen(0, '127.0.0.1', resolveListen),
  )
  const address = server.address() as AddressInfo

  try {
    const pointerState = APPROVED_CAPTURE_STATES.find(
      (state) => state.id === 'desktop-pointer',
    )!
    const subjects = REFERENCE_SUBJECTS.filter((subject) =>
      ['loader', 'entry', 'home', 'about', 'footer'].includes(subject.id),
    )
    const result = await captureReferenceBaseline({
      browser,
      origin: `http://127.0.0.1:${address.port}`,
      workspaceRoot,
      capturedAt,
      states: [pointerState],
      subjects,
    })

    expect(result.audioSafety).toEqual([
      expect.objectContaining({
        stateId: 'desktop-pointer',
        status: 'unsafe',
        safe: false,
        automaticAudioDetected: false,
        silentPathAudioDetected: true,
      }),
    ])
  } finally {
    try {
      await new Promise<void>((resolveClose, rejectClose) =>
        server.close((error) =>
          error ? rejectClose(error) : resolveClose(),
        ),
      )
    } finally {
      rmSync(workspaceRoot, { recursive: true, force: true })
    }
  }
})


test('blocks post-entry evidence when the silent gate remains active', async ({
  browser,
}) => {
  test.setTimeout(60_000)
  const workspaceRoot = mkdtempSync(
    join(tmpdir(), 'portfolio-reference-persistent-gate-test-'),
  )
  const fixture = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Persistent gate fixture</title></head>
<body>
  <div id="gate" style="position:fixed;inset:0;z-index:10;background:#000">
    <button>Enter with sound</button>
    <div id="silent" onclick="this.hidden = true; document.querySelector('#app').hidden = false"><span>Enter without sound</span></div>
  </div>
  <main id="app" hidden>
    <h1>Reference Home</h1>
    <nav><button>Work</button><button>About</button></nav>
  </main>
</body></html>`
  const server = createServer((_request, response) => {
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
    response.end(fixture)
  })
  await new Promise<void>((resolveListen) =>
    server.listen(0, '127.0.0.1', resolveListen),
  )
  const address = server.address() as AddressInfo

  try {
    const pointerState = APPROVED_CAPTURE_STATES.find(
      (state) => state.id === 'desktop-pointer',
    )!
    const result = await captureReferenceBaseline({
      browser,
      origin: `http://127.0.0.1:${address.port}`,
      workspaceRoot,
      capturedAt,
      states: [pointerState],
      subjects: REFERENCE_SUBJECTS.slice(0, 3),
    })

    expect(result.records.find((record) => record.subject.id === 'home')).toEqual(
      expect.objectContaining({
        status: 'blocked',
        limitation: expect.stringContaining('entry completion'),
      }),
    )
    expect(result.audioSafety).toEqual([
      expect.objectContaining({
        stateId: 'desktop-pointer',
        status: 'blocked',
        safe: false,
        reasons: expect.arrayContaining([
          expect.stringContaining('entry completion'),
        ]),
      }),
    ])
  } finally {
    try {
      await new Promise<void>((resolveClose, rejectClose) =>
        server.close((error) =>
          error ? rejectClose(error) : resolveClose(),
        ),
      )
    } finally {
      rmSync(workspaceRoot, { recursive: true, force: true })
    }
  }
})


test('blocks milestone and footer evidence when destination controls are no-ops', async ({
  browser,
}) => {
  test.setTimeout(60_000)
  const workspaceRoot = mkdtempSync(
    join(tmpdir(), 'portfolio-reference-no-op-controls-test-'),
  )
  const fixture = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>No-op controls fixture</title>
<script>
  let mutationCount = 0
  function addUnrelatedMutation() {
    setTimeout(() => {
      const update = document.createElement('section')
      update.textContent = 'Deferred background update ' + ++mutationCount
      document.querySelector('#app').append(update)
    }, 150)
  }
</script></head>
<body>
  <div id="gate">
    <button>Enter with sound</button>
    <button onclick="document.querySelector('#gate').hidden = true; document.querySelector('#app').hidden = false">Enter without sound</button>
  </div>
  <main id="app" hidden>
    <h1>Reference Home</h1>
    <nav>
      <button onclick="addUnrelatedMutation()">Index</button>
      <button onclick="document.querySelector('#work').hidden = false">Work</button>
      <button onclick="addUnrelatedMutation()">About</button>
    </nav>
    <section id="work" hidden>
      <h2>Work list</h2>
      <button onclick="addUnrelatedMutation()">View project</button>
    </section>
    <footer>Contact footer</footer>
  </main>
</body></html>`
  const server = createServer((_request, response) => {
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
    response.end(fixture)
  })
  await new Promise<void>((resolveListen) =>
    server.listen(0, '127.0.0.1', resolveListen),
  )
  const address = server.address() as AddressInfo

  try {
    const pointerState = APPROVED_CAPTURE_STATES.find(
      (state) => state.id === 'desktop-pointer',
    )!
    const result = await captureReferenceBaseline({
      browser,
      origin: `http://127.0.0.1:${address.port}`,
      workspaceRoot,
      capturedAt,
      states: [pointerState],
    })

    for (const subjectId of ['index', 'project', 'about', 'footer']) {
      expect(
        result.records.find((record) => record.subject.id === subjectId),
      ).toEqual(
        expect.objectContaining({
          status: 'blocked',
          limitation: expect.stringContaining('not observable'),
        }),
      )
    }
    expect(result.audioSafety).toEqual([
      expect.objectContaining({
        stateId: 'desktop-pointer',
        status: 'blocked',
        safe: false,
      }),
    ])
  } finally {
    try {
      await new Promise<void>((resolveClose, rejectClose) =>
        server.close((error) =>
          error ? rejectClose(error) : resolveClose(),
        ),
      )
    } finally {
      rmSync(workspaceRoot, { recursive: true, force: true })
    }
  }
})


test('reference capture takes only the explicit silent entry path', async ({
  browser,
}) => {
  test.setTimeout(120_000)
  const workspaceRoot = mkdtempSync(
    join(tmpdir(), 'portfolio-reference-capture-test-'),
  )
  let soundOptionRequests = 0
  const fixture = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Reference fixture</title></head>
<body>
  <div id="gate">
    <p>Loading 100%</p>
    <button onclick="fetch('/sound-click')">Enter with sound</button>
    <div onclick="document.querySelector('#gate').hidden = true; document.querySelector('#app').hidden = false"><span>Enter without sound</span></div>
  </div>
  <main id="app" hidden>
    <h1>Reference Home</h1>
    <nav>
      <div onclick="document.querySelector('#index').hidden = false"><span>Index</span></div>
      <div onclick="document.querySelector('#work').hidden = false"><span>Work</span></div>
      <button onclick="document.querySelector('#about').hidden = false">About</button>
    </nav>
    <section id="index" hidden><h2>Index</h2></section>
    <section id="work" hidden><h2>Work</h2><div onclick="document.querySelector('#project').hidden = false"><span>View project</span></div></section>
    <section id="project" hidden><h2>Project title</h2><p>Synopsis</p><p>Process</p><p>Next project</p></section>
    <section id="about" hidden><h2>About</h2><p>Profile module</p></section>
    <footer>Contact footer</footer>
  </main>
</body></html>`
  const server = createServer((request, response) => {
    if (request.url === '/sound-click') {
      soundOptionRequests += 1
      response.writeHead(204).end()
      return
    }
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
    response.end(fixture)
  })
  await new Promise<void>((resolveListen) =>
    server.listen(0, '127.0.0.1', resolveListen),
  )
  const address = server.address() as AddressInfo

  try {
    const result = await captureReferenceBaseline({
      browser,
      origin: `http://127.0.0.1:${address.port}`,
      workspaceRoot,
      capturedAt,
      states: APPROVED_CAPTURE_STATES.slice(0, 1),
    })

    expect(soundOptionRequests).toBe(0)
    expect(result.records).toHaveLength(REFERENCE_SUBJECTS.length)
    expect(result.records.every((record) => record.status === 'captured')).toBe(
      true,
    )
    const projectRecord = result.records.find(
      (record) => record.subject.id === 'project',
    ) as
      | (typeof result.records)[number] & {
          observation?: { headings?: string[] }
        }
      | undefined
    const entryRecord = result.records.find(
      (record) => record.subject.id === 'entry',
    ) as
      | (typeof result.records)[number] & {
          observation?: { focusedElement?: string | null }
        }
      | undefined
    expect(projectRecord?.observation?.headings).toContain('Project title')
    expect(entryRecord?.observation?.focusedElement).toBe('body')
    expect(result.audioSafety.every((audit) => audit.safe)).toBe(true)
    expect(
      validateCaptureRecords(
        result.records,
        REFERENCE_SUBJECTS,
        APPROVED_CAPTURE_STATES.slice(0, 1),
      ),
    ).toEqual([])
  } finally {
    try {
      await new Promise<void>((resolveClose, rejectClose) =>
        server.close((error) =>
          error ? rejectClose(error) : resolveClose(),
        ),
      )
    } finally {
      rmSync(workspaceRoot, { recursive: true, force: true })
    }
  }
})