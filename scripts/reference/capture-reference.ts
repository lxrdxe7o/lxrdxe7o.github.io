import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  chromium,
  type Browser,
  type BrowserContext,
  type Locator,
  type Page,
} from '@playwright/test'

import { writeBaselineIndex } from './capture-current.ts'
import {
  APPROVED_CAPTURE_STATES,
  REFERENCE_SUBJECTS,
  createCapturePlan,
  validateCaptureRecords,
  type CapturePlanRecord,
  type CaptureState,
  type CaptureSubject,
} from '../../tests/fixtures/viewports.ts'

const DEFAULT_REFERENCE_ORIGIN = 'https://rogierdeboeve.com/'
const REFERENCE_MANIFEST_PATH = 'artifacts/baseline/reference/manifest.json'
const CURRENT_MANIFEST_PATH = 'artifacts/baseline/current/manifest.json'
const SILENT_ENTRY_PATTERN =
  /\b(?:without\s+(?:sound|audio)|no\s+(?:sound|audio)|silent|muted|mute|sound\s+off|audio\s+off)\b/i
const SOUND_ENABLED_ENTRY_PATTERN =
  /\b(?:with\s+(?:sound|audio)|enable(?:d)?\s+(?:sound|audio)|sound\s+on|audio\s+on|unmuted)\b/i

function normalizeLabel(label: string): string {
  return label.replace(/\s+/g, ' ').trim()
}

export function chooseSilentEntryLabel(
  labels: readonly string[],
): string | null {
  for (const label of labels) {
    const normalizedLabel = normalizeLabel(label)
    if (
      SILENT_ENTRY_PATTERN.test(normalizedLabel) &&
      !SOUND_ENABLED_ENTRY_PATTERN.test(normalizedLabel)
    ) {
      return normalizedLabel
    }
  }

  return null
}

export interface AudioAuditSnapshot {
  mediaPlayAttempts: number
  audioContextResumeAttempts: number
  playingMediaElements: number
  runningAudioContexts: number
}

export interface AudioSafetyResult {
  safe: boolean
  automaticAudioDetected: boolean
  silentPathAudioDetected: boolean
  silentPathExercised: boolean
  reasons: string[]
}

function snapshotHasAudioActivity(snapshot: AudioAuditSnapshot): boolean {
  return (
    snapshot.mediaPlayAttempts > 0 ||
    snapshot.audioContextResumeAttempts > 0 ||
    snapshot.playingMediaElements > 0 ||
    snapshot.runningAudioContexts > 0
  )
}

export function evaluateAudioSafety(
  preConsent: AudioAuditSnapshot,
  terminal: AudioAuditSnapshot,
  silentPathExercised = true,
): AudioSafetyResult {
  const automaticAudioDetected = snapshotHasAudioActivity(
    silentPathExercised ? preConsent : terminal,
  )
  const silentPathAudioDetected =
    silentPathExercised &&
    (terminal.mediaPlayAttempts > preConsent.mediaPlayAttempts ||
      terminal.audioContextResumeAttempts >
        preConsent.audioContextResumeAttempts ||
      terminal.playingMediaElements > preConsent.playingMediaElements ||
      terminal.runningAudioContexts > preConsent.runningAudioContexts)
  const reasons: string[] = []

  if (automaticAudioDetected) {
    reasons.push('Audio activity was detected before entry consent.')
  }
  if (silentPathAudioDetected) {
    reasons.push('Audio activity was detected after choosing silent entry.')
  }

  return {
    safe: !automaticAudioDetected && !silentPathAudioDetected,
    automaticAudioDetected,
    silentPathAudioDetected,
    silentPathExercised,
    reasons,
  }
}

export interface CaptureReferenceOptions {
  browser: Browser
  origin: string
  workspaceRoot: string
  capturedAt: string
  states?: readonly CaptureState[]
  subjects?: readonly CaptureSubject[]
}

export type AudioAuditStatus = 'verified' | 'blocked' | 'unsafe'

export interface ReferenceAudioAudit extends AudioSafetyResult {
  stateId: string
  status: AudioAuditStatus
}

export interface CaptureReferenceResult {
  records: CapturePlanRecord[]
  manifestPath: string
  indexPath: string
  audioSafety: ReferenceAudioAudit[]
}

interface ReferenceObservation {
  title: string
  headings: string[]
  controls: string[]
  socialLinks: string[]
  availabilityText: string[]
  canvasCount: number
  mediaElementCount: number
  scrollHeight: number
  viewportHeight: number
  reducedMotionMatches: boolean
  coarsePointerMatches: boolean
  focusedElement: string | null
  audio: AudioAuditSnapshot
}

type AudioAuditEvent = 'media-play-attempt' | 'audio-context-resume'

interface ContextAudioAudit {
  mediaPlayAttempts: number
  audioContextResumeAttempts: number
}

const contextAudioAudits = new WeakMap<BrowserContext, ContextAudioAudit>()

interface AudioAuditWindow extends Window {
  __baselineAudioAudit?: {
    mediaPlayAttempts: number
    audioContextResumeAttempts: number
    contexts: AudioContext[]
  }
  __baselineRecordAudioEvent?: (event: AudioAuditEvent) => Promise<void>
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

async function installAudioAudit(context: BrowserContext): Promise<void> {
  const contextAudit: ContextAudioAudit = {
    mediaPlayAttempts: 0,
    audioContextResumeAttempts: 0,
  }
  contextAudioAudits.set(context, contextAudit)
  await context.exposeBinding(
    '__baselineRecordAudioEvent',
    (_source, event: unknown) => {
      if (event === 'media-play-attempt') {
        contextAudit.mediaPlayAttempts += 1
      } else if (event === 'audio-context-resume') {
        contextAudit.audioContextResumeAttempts += 1
      }
    },
  )

  await context.addInitScript(() => {
    const audit = {
      mediaPlayAttempts: 0,
      audioContextResumeAttempts: 0,
      contexts: [] as AudioContext[],
    }
    Object.defineProperty(window, '__baselineAudioAudit', {
      configurable: false,
      value: audit,
      writable: false,
    })

    const report = (event: AudioAuditEvent) => {
      const reportPromise = (window as AudioAuditWindow)
        .__baselineRecordAudioEvent?.(event)
      reportPromise?.catch(() => undefined)
    }

    const originalPlay = HTMLMediaElement.prototype.play
    HTMLMediaElement.prototype.play = function auditedPlay(...args) {
      if (!this.muted && this.volume > 0) {
        audit.mediaPlayAttempts += 1
        report('media-play-attempt')
      }
      return originalPlay.apply(this, args)
    }

    const instrumentContext = (constructorName: 'AudioContext' | 'webkitAudioContext') => {
      const browserWindow = window as typeof window & {
        AudioContext?: typeof AudioContext
        webkitAudioContext?: typeof AudioContext
      }
      const OriginalContext = browserWindow[constructorName]
      if (!OriginalContext) return

      const originalResume = OriginalContext.prototype.resume
      OriginalContext.prototype.resume = function auditedResume(...args) {
        audit.audioContextResumeAttempts += 1
        report('audio-context-resume')
        return originalResume.apply(this, args)
      }

      try {
        class AuditedAudioContext extends OriginalContext {
          constructor(options?: AudioContextOptions) {
            super(options)
            audit.contexts.push(this)
          }
        }
        browserWindow[constructorName] = AuditedAudioContext
      } catch {
        // Constructor wrapping is best-effort; resume instrumentation remains active.
      }
    }

    instrumentContext('AudioContext')
    instrumentContext('webkitAudioContext')
  })
}

async function readAudioSnapshot(page: Page): Promise<AudioAuditSnapshot> {
  await page.waitForTimeout(0).catch(() => undefined)
  const frameSnapshots = await Promise.all(
    page.frames().map((frame) =>
      frame
        .evaluate(() => {
          const audit = (window as AudioAuditWindow).__baselineAudioAudit
          const playingMediaElements = Array.from(
            document.querySelectorAll<HTMLMediaElement>('audio, video'),
          ).filter(
            (element) =>
              !element.paused && !element.muted && element.volume > 0,
          ).length

          return {
            mediaPlayAttempts: audit?.mediaPlayAttempts ?? 0,
            audioContextResumeAttempts:
              audit?.audioContextResumeAttempts ?? 0,
            playingMediaElements,
            runningAudioContexts:
              audit?.contexts.filter((context) => context.state === 'running')
                .length ?? 0,
          }
        })
        .catch(() => null),
    ),
  )
  const currentFrameTotals = frameSnapshots.reduce<AudioAuditSnapshot>(
    (total, snapshot) => ({
      mediaPlayAttempts:
        total.mediaPlayAttempts + (snapshot?.mediaPlayAttempts ?? 0),
      audioContextResumeAttempts:
        total.audioContextResumeAttempts +
        (snapshot?.audioContextResumeAttempts ?? 0),
      playingMediaElements:
        total.playingMediaElements + (snapshot?.playingMediaElements ?? 0),
      runningAudioContexts:
        total.runningAudioContexts + (snapshot?.runningAudioContexts ?? 0),
    }),
    {
      mediaPlayAttempts: 0,
      audioContextResumeAttempts: 0,
      playingMediaElements: 0,
      runningAudioContexts: 0,
    },
  )
  const contextAudit = contextAudioAudits.get(page.context())

  return {
    ...currentFrameTotals,
    mediaPlayAttempts: Math.max(
      contextAudit?.mediaPlayAttempts ?? 0,
      currentFrameTotals.mediaPlayAttempts,
    ),
    audioContextResumeAttempts: Math.max(
      contextAudit?.audioContextResumeAttempts ?? 0,
      currentFrameTotals.audioContextResumeAttempts,
    ),
  }
}

async function completeAudioAudit(
  page: Page,
  stateId: string,
  preConsent: AudioAuditSnapshot | null,
  silentPathExercised: boolean,
  verified: boolean,
  limitations: readonly string[] = [],
): Promise<ReferenceAudioAudit> {
  let terminal: AudioAuditSnapshot
  try {
    terminal = await readAudioSnapshot(page)
  } catch {
    return {
      stateId,
      status: 'blocked',
      safe: false,
      automaticAudioDetected: false,
      silentPathAudioDetected: false,
      silentPathExercised,
      reasons: [
        ...limitations,
        'Audio safety could not be verified because the terminal snapshot was unavailable.',
      ],
    }
  }

  if (silentPathExercised && !preConsent) {
    return {
      stateId,
      status: 'blocked',
      safe: false,
      automaticAudioDetected: false,
      silentPathAudioDetected: false,
      silentPathExercised,
      reasons: [
        ...limitations,
        'Audio safety could not be verified because the true pre-click snapshot was unavailable.',
      ],
    }
  }

  const safety = evaluateAudioSafety(
    preConsent ?? terminal,
    terminal,
    silentPathExercised,
  )
  const status: AudioAuditStatus = safety.safe
    ? verified
      ? 'verified'
      : 'blocked'
    : 'unsafe'
  const verificationReasons =
    status === 'blocked' && limitations.length === 0
      ? ['The full state-bound audio interval could not be verified.']
      : limitations

  return {
    ...safety,
    stateId,
    status,
    safe: status === 'verified',
    reasons: [...safety.reasons, ...verificationReasons],
  }
}

async function waitForReady(page: Page): Promise<string[]> {
  const warnings: string[] = []
  try {
    await page.waitForLoadState('networkidle', { timeout: 15_000 })
  } catch {
    warnings.push('Network did not become idle within 15 seconds.')
  }
  try {
    await page.evaluate(async () => {
      if ('fonts' in document) await document.fonts.ready
    })
  } catch {
    warnings.push('Document fonts did not report ready.')
  }
  return warnings
}

async function settleAfterInteraction(
  page: Page,
  delay = 1_000,
): Promise<void> {
  await page.waitForTimeout(delay)
  await page
    .evaluate(async () => {
      if ('fonts' in document) await document.fonts.ready
    })
    .catch(() => undefined)
}

interface ObservablePageState {
  url: string
  title: string
  headings: string[]
  dialogs: string[]
  regions: string[]
  controls: string[]
  selectedControls: string[]
  scrollHeight: number
}

async function readObservablePageState(
  page: Page,
): Promise<ObservablePageState> {
  return page.evaluate(() => {
    const visibleText = (selector: string, limit = 40) =>
      Array.from(document.querySelectorAll<HTMLElement>(selector))
        .filter((element) => {
          const style = getComputedStyle(element)
          return (
            element.getClientRects().length > 0 &&
            style.display !== 'none' &&
            style.visibility !== 'hidden'
          )
        })
        .map((element) =>
          (
            element.getAttribute('aria-label') ||
            element.innerText ||
            element.textContent ||
            ''
          )
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 240),
        )
        .filter(Boolean)
        .slice(0, limit)

    return {
      url: location.href,
      title: document.title,
      headings: visibleText('h1, h2, h3, [role="heading"]'),
      dialogs: visibleText('dialog, [role="dialog"], [aria-modal="true"]'),
      regions: visibleText('main > section, article, [role="region"]'),
      controls: visibleText('button, a, [role="button"]'),
      selectedControls: visibleText(
        '[aria-expanded="true"], [aria-current], [aria-selected="true"]',
      ),
      scrollHeight: document.documentElement.scrollHeight,
    }
  })
}

type ObservableMilestone = 'index' | 'work' | 'project' | 'about'

function newObservableValues(
  before: readonly string[],
  after: readonly string[],
): string[] {
  const priorValues = new Set(before)
  return after.filter((value) => !priorValues.has(value))
}

function milestoneDestinationObserved(
  milestone: ObservableMilestone,
  before: ObservablePageState,
  after: ObservablePageState,
): boolean {
  const newHeadings = newObservableValues(before.headings, after.headings)
  const newDialogs = newObservableValues(before.dialogs, after.dialogs)
  const newRegions = newObservableValues(before.regions, after.regions)
  const newControls = newObservableValues(before.controls, after.controls)
  const newSelectedControls = newObservableValues(
    before.selectedControls,
    after.selectedControls,
  )
  const destinationText = [
    ...newHeadings,
    ...newDialogs,
    ...newRegions,
    ...newControls,
    ...newSelectedControls,
  ].join(' ')
  const urlChanged = before.url !== after.url
  const titleChanged = before.title !== after.title

  if (milestone === 'index') {
    return (
      /\b(?:index|project\s+(?:index|selection|list))\b/i.test(
        destinationText,
      ) ||
      (urlChanged && /\bindex\b/i.test(after.url)) ||
      (titleChanged && /\bindex\b/i.test(after.title))
    )
  }

  if (milestone === 'work') {
    return (
      /\b(?:work|projects?|view\s+(?:project|case\s+study))\b/i.test(
        destinationText,
      ) ||
      (urlChanged && /\b(?:work|projects?)\b/i.test(after.url)) ||
      (titleChanged && /\b(?:work|projects?)\b/i.test(after.title))
    )
  }

  if (milestone === 'project') {
    return (
      /\b(?:project|case\s+study|synopsis|process|next\s+project)\b/i.test(
        destinationText,
      ) ||
      (urlChanged &&
        newHeadings.length > 0 &&
        (newRegions.length > 0 || after.scrollHeight > before.scrollHeight))
    )
  }

  return (
    /\b(?:about|profile|biography|services|tools|resources)\b/i.test(
      destinationText,
    ) ||
    (urlChanged && /\babout\b/i.test(after.url)) ||
    (titleChanged && /\babout\b/i.test(after.title))
  )
}

async function waitForObservablePageStateChange(
  page: Page,
  before: ObservablePageState,
  milestone: ObservableMilestone,
  timeout = 2_000,
): Promise<boolean> {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    await page.waitForTimeout(100).catch(() => undefined)
    const after = await readObservablePageState(page).catch(() => null)
    if (!after || !milestoneDestinationObserved(milestone, before, after)) {
      continue
    }

    await page.waitForTimeout(250).catch(() => undefined)
    const confirmed = await readObservablePageState(page).catch(() => null)
    if (
      confirmed &&
      milestoneDestinationObserved(milestone, before, confirmed)
    ) {
      return true
    }
  }
  return false
}

async function verifyObservablePageEnd(
  page: Page,
): Promise<boolean> {
  await page.evaluate(() =>
    window.scrollTo(0, document.documentElement.scrollHeight),
  )
  await page.waitForTimeout(200)

  return page.evaluate(() => {
    const documentHeight = document.documentElement.scrollHeight
    const atEnd =
      documentHeight <= window.innerHeight + 2 ||
      window.scrollY + window.innerHeight >= documentHeight - 2
    const evidenceCandidates = Array.from(
      document.querySelectorAll<HTMLElement>(
        'footer, [role="contentinfo"], a[href^="mailto:"], a[href^="tel:"], [aria-label*="contact" i], [data-contact]',
      ),
    )
    const visibleEvidence = evidenceCandidates.some((element) => {
      const style = getComputedStyle(element)
      const bounds = element.getBoundingClientRect()
      return (
        element.getClientRects().length > 0 &&
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        bounds.bottom > 0 &&
        bounds.top < window.innerHeight
      )
    })

    return atEnd && visibleEvidence
  })
}

async function controlCandidates(
  page: Page,
): Promise<Array<{ index: number; label: string }>> {
  const controls = page.locator('button, a, [role="button"]')
  const count = await controls.count()
  const candidates: Array<{ index: number; label: string }> = []

  for (let index = 0; index < count; index += 1) {
    const control = controls.nth(index)
    if (!(await control.isVisible().catch(() => false))) continue
    const label = await control
      .evaluate((element) =>
        (
          element.getAttribute('aria-label') ||
          element.textContent ||
          ''
        )
          .replace(/\s+/g, ' ')
          .trim(),
      )
      .catch(() => '')
    if (label) candidates.push({ index, label })
  }

  return candidates
}

function exactLabelPattern(label: string): RegExp {
  return new RegExp(
    `^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
    'i',
  )
}

interface ActionableTextMatch {
  control: Locator
  label: string
  keyboardOperable: boolean
}

async function findActionableTextMatch(
  textMatch: Locator,
): Promise<ActionableTextMatch | null> {
  const control = textMatch.locator(
    'xpath=ancestor-or-self::*[self::button or self::a or @role="button" or @tabindex or @onclick][1]',
  )
  if ((await control.count()) === 0) return null

  const details = await control
    .evaluate((element) => ({
      label: (
        element.getAttribute('aria-label') ||
        element.textContent ||
        ''
      )
        .replace(/\s+/g, ' ')
        .trim(),
      keyboardOperable: element.matches(
        'button, a[href], [role="button"], [tabindex]:not([tabindex="-1"])',
      ),
    }))
    .catch(() => null)

  if (!details?.label) return null
  return { control, ...details }
}

async function validateSilentActionChain(
  control: Locator,
): Promise<string | null> {
  const labelsByAction = await control.evaluate((element) => {
    const actionSelector =
      'button, a, [role="button"], [tabindex], [onclick]'
    const actionLabels: string[][] = []
    let current: Element | null = element

    while (current) {
      if (current.matches(actionSelector)) {
        const labels = [
          current.getAttribute('aria-label') || '',
          current.textContent || '',
        ]
          .map((label) => label.replace(/\s+/g, ' ').trim())
          .filter((label, index, values) =>
            Boolean(label) && values.indexOf(label) === index,
          )
        actionLabels.push(labels)
      }
      current = current.parentElement
    }

    return actionLabels
  })

  const selectedLabel = chooseSilentEntryLabel(labelsByAction[0] ?? [])
  if (!selectedLabel) return null
  if (
    labelsByAction.some((labels) =>
      labels.some((label) => SOUND_ENABLED_ENTRY_PATTERN.test(label)),
    )
  ) {
    return null
  }

  return selectedLabel
}

async function activateActionableTextMatch(
  action: ActionableTextMatch,
  page: Page,
  state: CaptureState,
): Promise<boolean> {
  if (state.input === 'keyboard') {
    if (!action.keyboardOperable) return false
    await action.control.focus()
    await page.keyboard.press('Enter')
  } else if (state.input === 'touch') {
    await action.control.tap({ force: true, noWaitAfter: true })
  } else {
    await action.control.click({ force: true, noWaitAfter: true })
  }
  return true
}

async function activateControl(
  page: Page,
  state: CaptureState,
  labels: readonly string[],
): Promise<string | null> {
  const candidates = await controlCandidates(page)
  const candidate = candidates.find(({ label }) =>
    labels.some((expected) => label.toLowerCase() === expected.toLowerCase()),
  )

  if (candidate) {
    const control = page.locator('button, a, [role="button"]').nth(candidate.index)
    if (state.input === 'keyboard') {
      await control.focus()
      await page.keyboard.press('Enter')
    } else if (state.input === 'touch') {
      await control.tap({ noWaitAfter: true })
    } else {
      await control.click({ noWaitAfter: true })
    }
    return candidate.label
  }

  for (const expectedLabel of labels) {
    const textMatches = page.getByText(exactLabelPattern(expectedLabel), {
      exact: true,
    })
    const count = await textMatches.count()
    for (let index = 0; index < count; index += 1) {
      const textMatch = textMatches.nth(index)
      if (!(await textMatch.isVisible().catch(() => false))) continue
      const action = await findActionableTextMatch(textMatch)
      if (
        !action ||
        action.label.toLowerCase() !== expectedLabel.toLowerCase()
      ) {
        continue
      }
      if (!(await activateActionableTextMatch(action, page, state))) continue
      return action.label
    }
  }

  return null
}

interface VerifiedControlActivation {
  label: string | null
  destinationObserved: boolean
}

async function activateControlAndVerify(
  page: Page,
  state: CaptureState,
  labels: readonly string[],
  milestone: ObservableMilestone,
): Promise<VerifiedControlActivation> {
  const before = await readObservablePageState(page)
  const label = await activateControl(page, state, labels)
  if (!label) return { label: null, destinationObserved: false }

  return {
    label,
    destinationObserved: await waitForObservablePageStateChange(
      page,
      before,
      milestone,
    ),
  }
}

interface SilentEntryActivation {
  label: string
  preConsentAudio: AudioAuditSnapshot
}

async function activateSilentEntry(
  page: Page,
  state: CaptureState,
): Promise<SilentEntryActivation | null> {
  const deadline = Date.now() + 15_000

  while (Date.now() < deadline) {
    const candidates = await controlCandidates(page)
    const semanticLabel = chooseSilentEntryLabel(
      candidates.map((candidate) => candidate.label),
    )

    if (semanticLabel) {
      const candidate = candidates.find((item) => item.label === semanticLabel)
      if (candidate) {
        const control = page
          .locator('button, a, [role="button"]')
          .nth(candidate.index)
        const validatedLabel = await validateSilentActionChain(control)
        if (validatedLabel) {
          const preConsentAudio = await readAudioSnapshot(page)
          if (state.input === 'keyboard') {
            await control.focus()
            await page.keyboard.press('Enter')
          } else if (state.input === 'touch') {
            await control.tap({ noWaitAfter: true })
          } else {
            await control.click({ noWaitAfter: true })
          }
          return { label: validatedLabel, preConsentAudio }
        }
      }
    }

    const textMatches = page.getByText(SILENT_ENTRY_PATTERN, { exact: true })
    const textMatchCount = await textMatches.count()
    for (let index = 0; index < textMatchCount; index += 1) {
      const textMatch = textMatches.nth(index)
      if (!(await textMatch.isVisible().catch(() => false))) continue
      const action = await findActionableTextMatch(textMatch)
      if (!action) continue
      const validatedLabel = await validateSilentActionChain(action.control)
      if (!validatedLabel) continue
      const preConsentAudio = await readAudioSnapshot(page)
      if (!(await activateActionableTextMatch(action, page, state))) continue
      return { label: validatedLabel, preConsentAudio }
    }

    await page.waitForTimeout(250)
  }

  return null
}

async function waitForEntryCompletion(
  page: Page,
  silentEntryLabel: string,
  timeout = 8_000,
): Promise<boolean> {
  const deadline = Date.now() + timeout
  const entryLabelPattern = exactLabelPattern(silentEntryLabel)

  while (Date.now() < deadline) {
    const entryLabels = page.getByText(entryLabelPattern, { exact: true })
    const entryLabelCount = await entryLabels.count()
    let entryStillInterceptsInput = false

    for (let index = 0; index < entryLabelCount; index += 1) {
      const entryLabel = entryLabels.nth(index)
      if (!(await entryLabel.isVisible().catch(() => false))) continue
      entryStillInterceptsInput = await entryLabel
        .evaluate((element) => {
          const style = getComputedStyle(element)
          if (style.pointerEvents === 'none' || style.visibility === 'hidden') {
            return false
          }
          const bounds = element.getBoundingClientRect()
          if (bounds.width === 0 || bounds.height === 0) return false
          const hitTarget = document.elementFromPoint(
            bounds.left + bounds.width / 2,
            bounds.top + bounds.height / 2,
          )
          return Boolean(
            hitTarget &&
              (hitTarget === element ||
                element.contains(hitTarget) ||
                hitTarget.contains(element)),
          )
        })
        .catch(() => true)
      if (entryStillInterceptsInput) break
    }

    const postEntryCandidates = await controlCandidates(page)
    let postEntryControlReachable = false
    for (const candidate of postEntryCandidates) {
      if (
        !['work', 'about', 'index', 'projects', 'project'].includes(
          candidate.label.toLowerCase(),
        )
      ) {
        continue
      }
      const control = page
        .locator('button, a, [role="button"]')
        .nth(candidate.index)
      postEntryControlReachable = await control
        .evaluate((element) => {
          const bounds = element.getBoundingClientRect()
          if (bounds.width === 0 || bounds.height === 0) return false
          const hitTarget = document.elementFromPoint(
            bounds.left + bounds.width / 2,
            bounds.top + bounds.height / 2,
          )
          return Boolean(
            hitTarget &&
              (hitTarget === element ||
                element.contains(hitTarget) ||
                hitTarget.contains(element)),
          )
        })
        .catch(() => false)
      if (postEntryControlReachable) break
    }

    if (!entryStillInterceptsInput && postEntryControlReachable) return true
    await page.waitForTimeout(250)
  }

  return false
}

async function collectObservation(page: Page): Promise<ReferenceObservation> {
  const audio = await readAudioSnapshot(page)
  const observation = await page.evaluate(() => {
    const visibleText = (selector: string) =>
      Array.from(document.querySelectorAll<HTMLElement>(selector))
        .filter((element) => {
          const style = getComputedStyle(element)
          return (
            element.getClientRects().length > 0 &&
            style.display !== 'none' &&
            style.visibility !== 'hidden'
          )
        })
        .map((element) =>
          (
            element.getAttribute('aria-label') ||
            element.innerText ||
            element.textContent ||
            ''
          )
            .replace(/\s+/g, ' ')
            .trim(),
        )
        .filter(Boolean)
        .slice(0, 40)

    const focusedElement = document.activeElement
    return {
      title: document.title,
      headings: visibleText('h1, h2, h3'),
      controls: visibleText('button, a, [role="button"]'),
      socialLinks: visibleText(
        'a[href*="instagram"], a[href*="linkedin"], a[href*="github"], a[href*="x.com"], a[href*="twitter"]',
      ),
      availabilityText: visibleText(
        '[class*="availability" i], [data-availability], [aria-label*="available" i]',
      ),
      canvasCount: document.querySelectorAll('canvas').length,
      mediaElementCount: document.querySelectorAll('audio, video').length,
      scrollHeight: document.documentElement.scrollHeight,
      viewportHeight: window.innerHeight,
      reducedMotionMatches: matchMedia('(prefers-reduced-motion: reduce)').matches,
      coarsePointerMatches: matchMedia('(pointer: coarse)').matches,
      focusedElement:
        focusedElement instanceof HTMLElement
          ? focusedElement === document.body
            ? 'body'
            : focusedElement === document.documentElement
              ? 'html'
              : focusedElement.getAttribute('aria-label') ||
                focusedElement.innerText.trim().slice(0, 120) ||
                focusedElement.tagName.toLowerCase()
          : null,
    }
  })

  return { ...observation, audio }
}

async function captureRecord(
  page: Page,
  workspaceRoot: string,
  plannedRecord: CapturePlanRecord,
  warnings: readonly string[] = [],
): Promise<CapturePlanRecord> {
  const screenshotPath = absoluteArtifactPath(
    workspaceRoot,
    plannedRecord.artifactPath,
  )
  await mkdir(dirname(screenshotPath), { recursive: true })
  await page.screenshot({
    path: screenshotPath,
    animations: 'disabled',
    caret: 'hide',
    mask: [
      page.locator(
        'time, [data-timestamp], [data-captured-at], [class*="timestamp" i]',
      ),
    ],
  })
  const observation = await collectObservation(page)

  return {
    ...plannedRecord,
    url: page.url(),
    status: 'captured',
    observation: {
      ...observation,
      readinessWarnings: [...warnings],
    },
  } as CapturePlanRecord
}

async function blockedRecord(
  workspaceRoot: string,
  plannedRecord: CapturePlanRecord,
  limitation: string,
): Promise<CapturePlanRecord> {
  const record: CapturePlanRecord = {
    ...plannedRecord,
    artifactPath: plannedRecord.artifactPath.replace(/\.png$/, '.blocked.json'),
    status: 'blocked',
    limitation,
  }
  await writeJson(workspaceRoot, record.artifactPath, record)
  return record
}

async function loadCurrentRecords(
  workspaceRoot: string,
): Promise<CapturePlanRecord[]> {
  try {
    const contents = await readFile(
      absoluteArtifactPath(workspaceRoot, CURRENT_MANIFEST_PATH),
      'utf8',
    )
    const manifest = JSON.parse(contents) as { records?: CapturePlanRecord[] }
    return Array.isArray(manifest.records) ? manifest.records : []
  } catch {
    return []
  }
}

function recordFor(
  plan: readonly CapturePlanRecord[],
  state: CaptureState,
  subjectId: string,
): CapturePlanRecord {
  const record = plan.find(
    (candidate) =>
      candidate.state.id === state.id && candidate.subject.id === subjectId,
  )
  if (!record) {
    throw new Error(`Missing reference plan record: ${subjectId}/${state.id}`)
  }
  return record
}

export async function captureReferenceBaseline(
  options: CaptureReferenceOptions,
): Promise<CaptureReferenceResult> {
  const states = options.states ?? APPROVED_CAPTURE_STATES
  const subjects = options.subjects ?? REFERENCE_SUBJECTS
  const plan = createCapturePlan({
    target: 'reference',
    origin: options.origin,
    subjects,
    states,
    capturedAt: options.capturedAt,
  })
  const records: CapturePlanRecord[] = []
  const audioSafety: ReferenceAudioAudit[] = []

  for (const state of states) {
    const context = await options.browser.newContext({
      viewport: state.viewport,
      hasTouch: state.touch,
      isMobile: state.touch,
      reducedMotion: state.reducedMotion,
      locale: 'en-US',
      timezoneId: 'UTC',
      colorScheme: 'dark',
    })
    await installAudioAudit(context)
    const page = await context.newPage()
    let preConsentAudio: AudioAuditSnapshot | null = null
    let silentPathExercised = false
    let audioAuditRecorded = false
    const workflowLimitations: string[] = []
    let aboutDestinationObserved = false

    try {
      await page.goto(options.origin, {
        waitUntil: 'domcontentloaded',
        timeout: 60_000,
      })

      if (subjects.some((subject) => subject.id === 'loader')) {
        records.push(
          await captureRecord(
            page,
            options.workspaceRoot,
            recordFor(plan, state, 'loader'),
          ),
        )
      }

      const readinessWarnings = await waitForReady(page)
      if (state.input === 'pointer') {
        await page.mouse.move(
          Math.round(state.viewport.width * 0.62),
          Math.round(state.viewport.height * 0.4),
        )
      }

      if (subjects.some((subject) => subject.id === 'entry')) {
        records.push(
          await captureRecord(
            page,
            options.workspaceRoot,
            recordFor(plan, state, 'entry'),
            readinessWarnings,
          ),
        )
      }

      const silentEntry = await activateSilentEntry(page, state)
      if (!silentEntry) {
        const limitation =
          'No explicit silent-entry control became observable; no entry option was activated.'
        for (const subject of subjects) {
          if (subject.id === 'loader' || subject.id === 'entry') continue
          records.push(
            await blockedRecord(
              options.workspaceRoot,
              recordFor(plan, state, subject.id),
              limitation,
            ),
          )
        }
        audioSafety.push(
          await completeAudioAudit(page, state.id, null, false, false, [
            'Silent-path audio safety could not be verified because silent entry was not exercised.',
          ]),
        )
        audioAuditRecorded = true
        continue
      }

      preConsentAudio = silentEntry.preConsentAudio
      silentPathExercised = true
      await waitForReady(page)
      const entryCompleted = await waitForEntryCompletion(
        page,
        silentEntry.label,
      )

      if (!entryCompleted) {
        const limitation =
          'Silent entry was activated, but entry completion was not observable because the gate remained input-active.'
        for (const subject of subjects) {
          if (subject.id === 'loader' || subject.id === 'entry') continue
          records.push(
            await blockedRecord(
              options.workspaceRoot,
              recordFor(plan, state, subject.id),
              limitation,
            ),
          )
        }
        audioSafety.push(
          await completeAudioAudit(
            page,
            state.id,
            preConsentAudio,
            true,
            false,
            [
              'Silent-path audio safety through entry completion could not be verified.',
            ],
          ),
        )
        audioAuditRecorded = true
        continue
      }

      if (subjects.some((subject) => subject.id === 'home')) {
        records.push(
          await captureRecord(
            page,
            options.workspaceRoot,
            recordFor(plan, state, 'home'),
          ),
        )
      }

      if (subjects.some((subject) => subject.id === 'index')) {
        const indexActivation = await activateControlAndVerify(
          page,
          state,
          ['Index'],
          'index',
        )
        if (indexActivation.label && indexActivation.destinationObserved) {
          records.push(
            await captureRecord(
              page,
              options.workspaceRoot,
              recordFor(plan, state, 'index'),
            ),
          )
          await page.keyboard.press('Escape').catch(() => undefined)
        } else {
          const limitation = indexActivation.label
            ? 'Index destination was not observable after activating its control.'
            : 'No observable Index control was available after silent entry.'
          workflowLimitations.push(limitation)
          records.push(
            await blockedRecord(
              options.workspaceRoot,
              recordFor(plan, state, 'index'),
              limitation,
            ),
          )
        }
      }

      if (subjects.some((subject) => subject.id === 'project')) {
        const workActivation = await activateControlAndVerify(
          page,
          state,
          ['Work', 'Projects', 'Project'],
          'work',
        )
        if (workActivation.label && workActivation.destinationObserved) {
          await settleAfterInteraction(page)
          const projectActivation = await activateControlAndVerify(
            page,
            state,
            ['View project', 'View case study'],
            'project',
          )
          if (
            projectActivation.label &&
            projectActivation.destinationObserved
          ) {
            await settleAfterInteraction(page, 1_500)
            records.push(
              await captureRecord(
                page,
                options.workspaceRoot,
                recordFor(plan, state, 'project'),
              ),
            )
          } else {
            const limitation = projectActivation.label
              ? 'Project destination was not observable after activating its control.'
              : 'Work opened, but no explicit project or case-study control was observable.'
            workflowLimitations.push(limitation)
            records.push(
              await blockedRecord(
                options.workspaceRoot,
                recordFor(plan, state, 'project'),
                limitation,
              ),
            )
          }
        } else {
          const limitation = workActivation.label
            ? 'Project destination was not observable because Work activation produced no observable state change.'
            : 'No observable Work or project control was available after silent entry.'
          workflowLimitations.push(limitation)
          records.push(
            await blockedRecord(
              options.workspaceRoot,
              recordFor(plan, state, 'project'),
              limitation,
            ),
          )
        }
      }

      const needsAboutPath = subjects.some(
        (subject) => subject.id === 'about' || subject.id === 'footer',
      )
      if (needsAboutPath) {
        const aboutActivation = await activateControlAndVerify(
          page,
          state,
          ['About'],
          'about',
        )
        aboutDestinationObserved = Boolean(
          aboutActivation.label && aboutActivation.destinationObserved,
        )

        if (subjects.some((subject) => subject.id === 'about')) {
          if (aboutDestinationObserved) {
            await settleAfterInteraction(page, 1_500)
            records.push(
              await captureRecord(
                page,
                options.workspaceRoot,
                recordFor(plan, state, 'about'),
              ),
            )
          } else {
            const limitation = aboutActivation.label
              ? 'About destination was not observable after activating its control.'
              : 'No observable About control was available after silent entry.'
            workflowLimitations.push(limitation)
            records.push(
              await blockedRecord(
                options.workspaceRoot,
                recordFor(plan, state, 'about'),
                limitation,
              ),
            )
          }
        }
      }

      if (subjects.some((subject) => subject.id === 'footer')) {
        if (!aboutDestinationObserved) {
          const limitation =
            'Footer/end state was not observable because a verified About path was not reached.'
          workflowLimitations.push(limitation)
          records.push(
            await blockedRecord(
              options.workspaceRoot,
              recordFor(plan, state, 'footer'),
              limitation,
            ),
          )
        } else if (await verifyObservablePageEnd(page)) {
          records.push(
            await captureRecord(
              page,
              options.workspaceRoot,
              recordFor(plan, state, 'footer'),
            ),
          )
        } else {
          const limitation =
            'Footer/end state was not observable at the reached page end with contact or footer evidence.'
          workflowLimitations.push(limitation)
          records.push(
            await blockedRecord(
              options.workspaceRoot,
              recordFor(plan, state, 'footer'),
              limitation,
            ),
          )
        }
      }

      audioSafety.push(
        await completeAudioAudit(
          page,
          state.id,
          preConsentAudio,
          silentPathExercised,
          workflowLimitations.length === 0,
          workflowLimitations.map(
            (limitation) =>
              `Full post-entry audio traversal was not verified: ${limitation}`,
          ),
        ),
      )
      audioAuditRecorded = true
    } catch (error) {
      const limitation =
        error instanceof Error ? error.message : 'Unknown reference capture failure'
      const existingCombinations = new Set(
        records.map((record) => `${record.subject.id}/${record.state.id}`),
      )
      for (const subject of subjects) {
        const plannedRecord = recordFor(plan, state, subject.id)
        const combination = `${subject.id}/${state.id}`
        if (!existingCombinations.has(combination)) {
          records.push(
            await blockedRecord(
              options.workspaceRoot,
              plannedRecord,
              limitation,
            ),
          )
        }
      }
      if (!audioAuditRecorded) {
        audioSafety.push(
          await completeAudioAudit(
            page,
            state.id,
            preConsentAudio,
            silentPathExercised,
            false,
            [`Audio safety could not be fully verified: ${limitation}`],
          ),
        )
        audioAuditRecorded = true
      }
    } finally {
      await context.close()
    }
  }

  const validationErrors = validateCaptureRecords(records, subjects, states)
  if (validationErrors.length > 0) {
    throw new Error(
      `Invalid reference capture manifest:\n${validationErrors.join('\n')}`,
    )
  }

  await writeJson(options.workspaceRoot, REFERENCE_MANIFEST_PATH, {
    schemaVersion: 1,
    target: 'reference',
    source: {
      kind: 'public-observation-only',
      origin: options.origin,
      constraints: [
        'No reference source code, shaders, protected assets, or media were inspected or copied.',
        'Only explicit silent-entry controls may be activated.',
        'Reference screenshots are internal ignored parity evidence and must never ship.',
      ],
    },
    generatedAt: options.capturedAt,
    approvedStates: states,
    audioSafety,
    records,
  })
  const currentRecords = await loadCurrentRecords(options.workspaceRoot)
  const indexPath = await writeBaselineIndex(
    options.workspaceRoot,
    currentRecords,
    records,
  )

  return {
    records,
    manifestPath: REFERENCE_MANIFEST_PATH,
    indexPath,
    audioSafety,
  }
}

async function runFromCommandLine(): Promise<void> {
  const browser = await chromium.launch({
    headless: true,
    args: ['--mute-audio'],
  })
  try {
    const result = await captureReferenceBaseline({
      browser,
      origin: process.env.REFERENCE_BASE_URL ?? DEFAULT_REFERENCE_ORIGIN,
      workspaceRoot: process.cwd(),
      capturedAt: process.env.CAPTURE_TIMESTAMP ?? new Date().toISOString(),
    })
    const captured = result.records.filter(
      (record) => record.status === 'captured',
    ).length
    const limited = result.records.length - captured
    const automaticAudioViolations = result.audioSafety.filter(
      (audit) => audit.automaticAudioDetected,
    )
    const silentPathConcerns = result.audioSafety.filter(
      (audit) => audit.silentPathAudioDetected || !audit.safe,
    )
    console.log(
      `Reference baseline: ${captured} captured, ${limited} limited, ${result.records.length} total.`,
    )
    console.log(
      `Automatic audio before consent: ${automaticAudioViolations.length} state(s); silent-path audit concerns: ${silentPathConcerns.length} state(s).`,
    )
    if (automaticAudioViolations.length > 0) {
      throw new Error(
        `Reference attempted audio before consent in ${automaticAudioViolations.length} state(s). See ${result.manifestPath}.`,
      )
    }
  } finally {
    await browser.close()
  }
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : ''
if (invokedPath && fileURLToPath(import.meta.url) === invokedPath) {
  runFromCommandLine().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
}
