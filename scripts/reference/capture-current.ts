import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

import type { Browser, Page } from '@playwright/test'

import {
  APPROVED_CAPTURE_STATES,
  CURRENT_ROUTES,
  REFERENCE_SUBJECTS,
  createCapturePlan,
  validateCaptureRecords,
  type CapturePlanRecord,
  type CaptureState,
} from '../../tests/fixtures/viewports.ts'

const CURRENT_MANIFEST_PATH = 'artifacts/baseline/current/manifest.json'
const REFERENCE_MANIFEST_PATH = 'artifacts/baseline/reference/manifest.json'
const INDEX_PATH = 'artifacts/baseline/index.html'

interface PageReadiness {
  fontsReady: boolean
  networkIdle: boolean
  warnings: string[]
}

interface CurrentObservation {
  title: string
  headings: string[]
  navigationLabels: string[]
  landmarkCounts: Record<string, number>
  canvasCount: number
  audioElementCount: number
  routeTheme: string | null
  focusedElement: string | null
  pointerCursorTargets: number
  scrollHeight: number
  viewportHeight: number
  scrollMilestones: number[]
  horizontalOverflow: boolean
  reducedMotionMatches: boolean
  coarsePointerMatches: boolean
  touchPoints: number
  consoleErrors: string[]
  pageErrors: string[]
  failedRequests: string[]
  readiness: PageReadiness
}

export interface CaptureCurrentOptions {
  browser: Browser
  origin: string
  workspaceRoot: string
  capturedAt: string
}

export interface CaptureRunResult {
  records: CapturePlanRecord[]
  manifestPath: string
  indexPath: string
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function artifactHref(artifactPath: string): string {
  return artifactPath.replace(/^artifacts\/baseline\//, '')
}

interface EvidenceSlot {
  target: 'current' | 'reference'
  subjectLabel: string
  state: CaptureState
  record?: CapturePlanRecord
  limitation?: string
}

function renderEvidenceCard(slot: EvidenceSlot): string {
  const targetLabel = slot.target === 'current' ? 'Current' : 'Reference'
  const label = `${targetLabel} · ${slot.subjectLabel}`
  const status =
    slot.record?.status ?? (slot.target === 'current' ? 'gap' : 'blocked')
  const href = slot.record ? artifactHref(slot.record.artifactPath) : null
  const limitation =
    slot.record?.limitation ??
    slot.limitation ??
    'No screenshot was produced for this state.'
  const media =
    slot.record && slot.record.artifactPath.endsWith('.png')
      ? `<a href="${escapeHtml(href!)}"><img src="${escapeHtml(href!)}" alt="${escapeHtml(label)} — ${escapeHtml(slot.state.label)}" loading="lazy"></a>`
      : `<div class="evidence-gap"><strong>${escapeHtml(status)}</strong><p>${escapeHtml(limitation)}</p>${href ? `<a href="${escapeHtml(href)}">Open evidence record</a>` : ''}</div>`
  const observedUrl = slot.record
    ? `<a href="${escapeHtml(slot.record.url)}">Observed URL</a>`
    : '<span>No observed URL</span>'

  return `<article class="card" data-target="${escapeHtml(slot.target)}" data-state="${escapeHtml(slot.state.id)}">
  <header><p>${escapeHtml(slot.state.label)}</p><h3>${escapeHtml(label)}</h3></header>
  ${media}
  <footer><code>${escapeHtml(status)}</code>${observedUrl}</footer>
</article>`
}

function currentMilestoneLimitation(subjectId: string): string {
  switch (subjectId) {
    case 'loader':
      return 'No equivalent current loader milestone exists.'
    case 'entry':
      return 'No equivalent current entry or sound-choice milestone exists.'
    case 'index':
      return 'No equivalent current global Index milestone exists.'
    case 'project':
      return 'No equivalent current native project-sequence milestone exists.'
    case 'footer':
      return 'No equivalent current persistent footer milestone exists.'
    default:
      return 'No equivalent current milestone exists.'
  }
}

export function renderBaselineIndex(
  records: readonly CapturePlanRecord[],
): string {
  const currentRecords = records.filter((record) => record.target === 'current')
  const referenceRecords = records.filter(
    (record) => record.target === 'reference',
  )
  const presentStateIds = new Set(records.map((record) => record.state.id))
  const states: CaptureState[] = APPROVED_CAPTURE_STATES.filter((state) =>
    presentStateIds.has(state.id),
  )
  for (const record of records) {
    if (!states.some((state) => state.id === record.state.id)) {
      states.push(record.state)
    }
  }

  const comparisons = states
    .flatMap((state) =>
      REFERENCE_SUBJECTS.map((milestone) => {
        const currentSubjectId =
          milestone.id === 'home'
            ? 'home'
            : milestone.id === 'about'
              ? 'about'
              : null
        const currentRecord = currentSubjectId
          ? currentRecords.find(
              (record) =>
                record.subject.id === currentSubjectId &&
                record.state.id === state.id,
            )
          : undefined
        const referenceRecord = referenceRecords.find(
          (record) =>
            record.subject.id === milestone.id && record.state.id === state.id,
        )
        const currentCard = renderEvidenceCard({
          target: 'current',
          subjectLabel: milestone.label,
          state,
          record: currentRecord,
          limitation: currentMilestoneLimitation(milestone.id),
        })
        const referenceCard = renderEvidenceCard({
          target: 'reference',
          subjectLabel: milestone.label,
          state,
          record: referenceRecord,
          limitation:
            'No reference evidence record is available for this state yet.',
        })

        return `<section class="comparison" data-comparison="${escapeHtml(`${state.id}/${milestone.id}`)}">
  <div class="comparison-heading"><p>${escapeHtml(state.label)}</p><h2>${escapeHtml(milestone.label)}</h2></div>
  <div class="pair">${currentCard}${referenceCard}</div>
</section>`
      }),
    )
    .join('\n')

  const additionalCurrentCards = currentRecords
    .filter(
      (record) => record.subject.id !== 'home' && record.subject.id !== 'about',
    )
    .map((record) =>
      renderEvidenceCard({
        target: 'current',
        subjectLabel: record.subject.label,
        state: record.state,
        record,
      }),
    )
    .join('\n')
  const additionalCurrent = additionalCurrentCards
    ? `<section class="additional"><div class="section-heading"><p>Route inventory</p><h2>Additional current-site captures</h2></div><div class="route-grid">${additionalCurrentCards}</div></section>`
    : ''

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Behavioral baseline evidence</title>
  <style>
    :root { color-scheme: dark; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; background: #0d0d0f; color: #f5f4ef; }
    body { margin: 0; padding: 2rem; }
    h1 { font-family: system-ui, sans-serif; margin: 0 0 .5rem; }
    .notice { color: #bbb; max-width: 75ch; margin: 0 0 2rem; }
    .comparison, .additional { margin: 0 0 2rem; }
    .comparison-heading, .section-heading { display: flex; justify-content: space-between; gap: 1rem; align-items: baseline; margin: 0 0 .65rem; }
    .comparison-heading p, .comparison-heading h2, .section-heading p, .section-heading h2 { margin: 0; }
    .comparison-heading p, .section-heading p { color: #aaa; font-size: .75rem; text-transform: uppercase; }
    .comparison-heading h2, .section-heading h2 { font: 600 1.1rem/1.2 system-ui, sans-serif; }
    .pair, .route-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1px; background: #333; border: 1px solid #333; }
    .card { background: #151518; min-width: 0; }
    .card header, .card footer { padding: .85rem 1rem; display: flex; justify-content: space-between; gap: 1rem; align-items: baseline; }
    .card header p, .card header h3 { margin: 0; }
    .card header p { color: #aaa; font-size: .75rem; text-transform: uppercase; }
    .card header h3 { font: 600 1rem/1.2 system-ui, sans-serif; }
    .card img { display: block; width: 100%; height: auto; background: #080808; }
    .card footer { font-size: .75rem; }
    a { color: #ff5d68; }
    .evidence-gap { min-height: 14rem; display: grid; place-content: center; padding: 2rem; text-align: center; color: #bbb; }
    @media (max-width: 760px) { body { padding: 1rem; } .pair, .route-grid { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <h1>Behavioral baseline evidence</h1>
  <p class="notice">Internal parity-analysis evidence only. Each milestone pairs current and reference evidence for the same state; absent behavior remains an explicit gap. Reference captures must never be copied into shipped public assets.</p>
  <main>${comparisons}${additionalCurrent}</main>
</body>
</html>`
}

function absoluteArtifactPath(
  workspaceRoot: string,
  artifactPath: string,
): string {
  return resolve(workspaceRoot, artifactPath)
}

async function writeJson(
  workspaceRoot: string,
  artifactPath: string,
  value: unknown,
): Promise<void> {
  const absolutePath = absoluteArtifactPath(workspaceRoot, artifactPath)
  await mkdir(dirname(absolutePath), { recursive: true })
  await writeFile(absolutePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

async function waitForReadiness(page: Page): Promise<PageReadiness> {
  const readiness: PageReadiness = {
    fontsReady: false,
    networkIdle: false,
    warnings: [],
  }

  try {
    await page.waitForLoadState('networkidle', { timeout: 15_000 })
    readiness.networkIdle = true
  } catch {
    readiness.warnings.push('Network did not become idle within 15 seconds.')
  }

  try {
    await page.evaluate(async () => {
      if ('fonts' in document) {
        await document.fonts.ready
      }
    })
    readiness.fontsReady = true
  } catch {
    readiness.warnings.push('Document fonts did not report ready.')
  }

  return readiness
}

async function applyInputState(page: Page, state: CaptureState): Promise<void> {
  if (state.input === 'keyboard') {
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
  } else if (state.input === 'pointer') {
    await page.mouse.move(
      Math.round(state.viewport.width * 0.65),
      Math.round(state.viewport.height * 0.42),
    )
  }
}

const DYNAMIC_TEXT_SELECTOR = 'h1, h2, h3, p'
const DYNAMIC_HEADING_PLACEHOLDER = '[masked dynamic heading]'
const DYNAMIC_TEXT_PLACEHOLDER = '[masked dynamic text]'
// Broad, deliberately loose heuristic: real observed glitch headings vary
// their garbled suffix on every render ("ARCHIV~D <[*...", "ARCHX#25..."),
// so matching only a fixed prefix is not reliable. Any text opening with
// "ARCH" is treated as a heuristic candidate; genuine volatility is
// confirmed by the two-sample diff below regardless of this heuristic.
const GLITCH_HEADING_PREFIX_PATTERN = /^ARCH/i

async function maskTimestampText(page: Page): Promise<void> {
  await page.evaluate(() => {
    const timePattern = /\b\d{1,2}:\d{2}:\d{2}(?:\s+[A-Z]{2,5})?\b/g
    const maskTimeTextNodes = () => {
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
      )
      let textNode = walker.nextNode()
      while (textNode) {
        if (textNode.nodeValue && timePattern.test(textNode.nodeValue)) {
          textNode.nodeValue = textNode.nodeValue.replace(
            timePattern,
            '[masked current time]',
          )
        }
        timePattern.lastIndex = 0
        textNode = walker.nextNode()
      }
    }

    // Some routes render a live clock that re-renders its own text node on
    // an interval (observed on the external Blog handoff). A single pass
    // here only masks the frame visible at this instant; without ongoing
    // re-masking, a later tick before the screenshot can reintroduce an
    // unmasked timestamp. Keep re-applying the mask for the rest of this
    // page's lifetime.
    maskTimeTextNodes()

    const observer = new MutationObserver(() => maskTimeTextNodes())
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
    })
  })
}

async function sampleDynamicText(page: Page): Promise<string[]> {
  return page.evaluate(
    (selector) =>
      Array.from(document.querySelectorAll<HTMLElement>(selector)).map(
        (element) => (element.innerText || element.textContent || '').trim(),
      ),
    DYNAMIC_TEXT_SELECTOR,
  )
}

function looksLikeGlitchHeading(text: string): boolean {
  return GLITCH_HEADING_PREFIX_PATTERN.test(text)
}

// Some current-site handoffs (the external Blog archive) run their own
// script that continuously regenerates a heading and an adjacent paragraph
// with random glitch-style text. A single regex-and-replace pass captures
// only the frame visible at that instant; the element mutates again before
// the eventual screenshot. This masks any element whose text changes
// between two samples (or matches the glitch-heading heuristic on either
// sample) and keeps re-applying the mask via a MutationObserver so later
// regeneration before the screenshot is also caught.
async function maskVolatileDynamicText(
  page: Page,
  sampleDelayMs = 350,
): Promise<void> {
  const firstSample = await sampleDynamicText(page)
  await page.waitForTimeout(sampleDelayMs)
  const secondSample = await sampleDynamicText(page)

  const volatileIndexes = new Set<number>()
  firstSample.forEach((text, index) => {
    const laterText = secondSample[index]
    if (laterText !== undefined && laterText !== text) {
      volatileIndexes.add(index)
    }
    if (looksLikeGlitchHeading(text)) volatileIndexes.add(index)
  })
  secondSample.forEach((text, index) => {
    if (looksLikeGlitchHeading(text)) volatileIndexes.add(index)
  })

  if (volatileIndexes.size === 0) return

  await page.evaluate(
    ({ selector, indexes, headingPlaceholder, textPlaceholder }) => {
      const placeholderFor = (element: Element) =>
        element.matches('h1, h2, h3') ? headingPlaceholder : textPlaceholder

      const applyMask = () => {
        const elements = Array.from(
          document.querySelectorAll<HTMLElement>(selector),
        )
        for (const index of indexes) {
          const element = elements[index]
          if (!element) continue
          const placeholder = placeholderFor(element)
          if (element.textContent !== placeholder) {
            element.dataset.baselineVolatile = 'true'
            element.textContent = placeholder
          }
        }
      }

      applyMask()

      const observer = new MutationObserver(() => applyMask())
      observer.observe(document.body, {
        subtree: true,
        childList: true,
        characterData: true,
      })
    },
    {
      selector: DYNAMIC_TEXT_SELECTOR,
      indexes: [...volatileIndexes],
      headingPlaceholder: DYNAMIC_HEADING_PLACEHOLDER,
      textPlaceholder: DYNAMIC_TEXT_PLACEHOLDER,
    },
  )
}

export async function normalizeVolatileCurrentContent(
  page: Page,
  subjectId: string,
): Promise<void> {
  await maskTimestampText(page)

  if (subjectId !== 'blog') return

  await maskVolatileDynamicText(page)
}

async function collectObservation(
  page: Page,
  readiness: PageReadiness,
  diagnostics: {
    consoleErrors: string[]
    pageErrors: string[]
    failedRequests: string[]
  },
): Promise<CurrentObservation> {
  const scrollMilestones = await page.evaluate(async () => {
    const maxScroll = Math.max(
      0,
      document.documentElement.scrollHeight - window.innerHeight,
    )
    const positions = [0, Math.round(maxScroll / 2), maxScroll]
    for (const position of positions) {
      window.scrollTo(0, position)
      await new Promise<void>((resolveFrame) =>
        requestAnimationFrame(() => resolveFrame()),
      )
    }
    window.scrollTo(0, 0)
    return positions
  })

  const observation = await page.evaluate(() => {
    const labels = (selector: string) =>
      Array.from(document.querySelectorAll<HTMLElement>(selector))
        .map((element) => (element.innerText || element.textContent || '').trim())
        .filter(Boolean)
        .slice(0, 30)

    const pointerCursorTargets = Array.from(
      document.querySelectorAll<HTMLElement>('a, button, [role="button"]'),
    ).filter((element) => getComputedStyle(element).cursor === 'pointer').length

    const focusedElement = document.activeElement
    const focusedLabel =
      focusedElement instanceof HTMLElement
        ? focusedElement.getAttribute('aria-label') ||
          focusedElement.innerText.trim() ||
          focusedElement.tagName.toLowerCase()
        : null

    return {
      title: document.title,
      headings: labels('h1, h2, h3'),
      navigationLabels: labels('nav a, nav button'),
      landmarkCounts: {
        header: document.querySelectorAll('header').length,
        nav: document.querySelectorAll('nav').length,
        main: document.querySelectorAll('main').length,
        footer: document.querySelectorAll('footer').length,
      },
      canvasCount: document.querySelectorAll('canvas').length,
      audioElementCount: document.querySelectorAll('audio').length,
      routeTheme: document.documentElement.getAttribute('data-route'),
      focusedElement: focusedLabel,
      pointerCursorTargets,
      scrollHeight: document.documentElement.scrollHeight,
      viewportHeight: window.innerHeight,
      horizontalOverflow:
        document.documentElement.scrollWidth > document.documentElement.clientWidth,
      reducedMotionMatches: matchMedia('(prefers-reduced-motion: reduce)').matches,
      coarsePointerMatches: matchMedia('(pointer: coarse)').matches,
      touchPoints: navigator.maxTouchPoints,
    }
  })

  return {
    ...observation,
    scrollMilestones,
    ...diagnostics,
    readiness,
  }
}

async function stabilizeForScreenshot(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-delay: 0s !important;
        animation-duration: 0.001s !important;
        animation-iteration-count: 1 !important;
        caret-color: transparent !important;
        transition-delay: 0s !important;
        transition-duration: 0.001s !important;
      }
      time,
      [data-timestamp],
      [data-captured-at],
      [class*="timestamp" i] {
        visibility: hidden !important;
      }
    `,
  })
}

async function loadExistingRecords(
  workspaceRoot: string,
  manifestPath: string,
): Promise<CapturePlanRecord[]> {
  try {
    const contents = await readFile(
      absoluteArtifactPath(workspaceRoot, manifestPath),
      'utf8',
    )
    const manifest = JSON.parse(contents) as { records?: CapturePlanRecord[] }
    return Array.isArray(manifest.records) ? manifest.records : []
  } catch {
    return []
  }
}

export async function writeBaselineIndex(
  workspaceRoot: string,
  currentRecords: readonly CapturePlanRecord[],
  referenceRecords?: readonly CapturePlanRecord[],
): Promise<string> {
  const resolvedReferenceRecords =
    referenceRecords ??
    (await loadExistingRecords(workspaceRoot, REFERENCE_MANIFEST_PATH))
  const indexPath = absoluteArtifactPath(workspaceRoot, INDEX_PATH)
  await mkdir(dirname(indexPath), { recursive: true })
  await writeFile(
    indexPath,
    renderBaselineIndex([...currentRecords, ...resolvedReferenceRecords]),
    'utf8',
  )
  return INDEX_PATH
}

export async function captureCurrentBaseline(
  options: CaptureCurrentOptions,
): Promise<CaptureRunResult> {
  const plan = createCapturePlan({
    target: 'current',
    origin: options.origin,
    subjects: CURRENT_ROUTES,
    states: APPROVED_CAPTURE_STATES,
    capturedAt: options.capturedAt,
  })
  const records: CapturePlanRecord[] = []

  for (const state of APPROVED_CAPTURE_STATES) {
    const stateRecords = plan.filter((record) => record.state.id === state.id)

    if (state.soundGate) {
      for (const record of stateRecords) {
        await writeJson(options.workspaceRoot, record.artifactPath, {
          target: record.target,
          subject: record.subject,
          state: record.state,
          url: record.url,
          artifactPath: record.artifactPath,
          capturedAt: record.capturedAt,
          status: record.status,
          limitation: record.limitation,
        })
        records.push(record)
      }
      continue
    }

    const context = await options.browser.newContext({
      viewport: state.viewport,
      hasTouch: state.touch,
      isMobile: state.touch,
      reducedMotion: state.reducedMotion,
      locale: 'en-US',
      timezoneId: 'UTC',
      colorScheme: 'dark',
    })

    try {
      for (const plannedRecord of stateRecords) {
        const page = await context.newPage()
        const diagnostics = {
          consoleErrors: [] as string[],
          pageErrors: [] as string[],
          failedRequests: [] as string[],
        }
        page.on('console', (message) => {
          if (message.type() === 'error') {
            diagnostics.consoleErrors.push(message.text())
          }
        })
        page.on('pageerror', (error) => diagnostics.pageErrors.push(error.message))
        page.on('requestfailed', (request) => {
          diagnostics.failedRequests.push(
            `${request.method()} ${request.url()} — ${request.failure()?.errorText ?? 'unknown failure'}`,
          )
        })

        try {
          await page.goto(plannedRecord.url, {
            waitUntil: 'domcontentloaded',
            timeout: 60_000,
          })
          const readiness = await waitForReadiness(page)
          await applyInputState(page, state)
          await normalizeVolatileCurrentContent(
            page,
            plannedRecord.subject.id,
          )
          const observation = await collectObservation(
            page,
            readiness,
            diagnostics,
          )
          await stabilizeForScreenshot(page)

          const screenshotPath = absoluteArtifactPath(
            options.workspaceRoot,
            plannedRecord.artifactPath,
          )
          await mkdir(dirname(screenshotPath), { recursive: true })
          await page.screenshot({
            path: screenshotPath,
            fullPage: true,
            animations: 'disabled',
            caret: 'hide',
            mask: [
              page.locator(
                'time, [data-timestamp], [data-captured-at], [class*="timestamp" i]',
              ),
            ],
          })

          records.push({
            ...plannedRecord,
            url: page.url(),
            status: 'captured',
            observation,
          } as CapturePlanRecord)
        } catch (error) {
          const limitation =
            error instanceof Error ? error.message : 'Unknown capture failure'
          const failureRecord: CapturePlanRecord = {
            ...plannedRecord,
            artifactPath: plannedRecord.artifactPath.replace(
              /\.png$/,
              '.failed.json',
            ),
            status: 'failed',
            limitation,
          }
          await writeJson(options.workspaceRoot, failureRecord.artifactPath, {
            ...failureRecord,
            diagnostics,
          })
          records.push(failureRecord)
        } finally {
          await page.close()
        }
      }
    } finally {
      await context.close()
    }
  }

  const validationErrors = validateCaptureRecords(
    records,
    CURRENT_ROUTES,
    APPROVED_CAPTURE_STATES,
  )
  if (validationErrors.length > 0) {
    throw new Error(`Invalid current capture manifest:\n${validationErrors.join('\n')}`)
  }

  await writeJson(options.workspaceRoot, CURRENT_MANIFEST_PATH, {
    schemaVersion: 1,
    target: 'current',
    source: {
      kind: 'local-current-site',
      origin: options.origin,
    },
    generatedAt: options.capturedAt,
    approvedStates: APPROVED_CAPTURE_STATES,
    records,
  })
  const indexPath = await writeBaselineIndex(options.workspaceRoot, records)

  return {
    records,
    manifestPath: CURRENT_MANIFEST_PATH,
    indexPath,
  }
}
