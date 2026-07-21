export type CaptureTarget = 'current' | 'reference'
export type InputMode = 'keyboard' | 'pointer' | 'touch'

export interface CaptureSubject {
  id: string
  path: string
  label: string
}

export interface CaptureState {
  id: string
  label: string
  viewport: {
    width: number
    height: number
  }
  input: InputMode
  reducedMotion: 'no-preference' | 'reduce'
  touch: boolean
  soundGate: boolean
}

export type CaptureStatus = 'planned' | 'captured' | 'gap' | 'blocked' | 'failed'

export interface CapturePlanRecord {
  target: CaptureTarget
  subject: CaptureSubject
  state: CaptureState
  url: string
  artifactPath: string
  capturedAt: string
  status: CaptureStatus
  limitation?: string
}

export interface CreateCapturePlanInput {
  target: CaptureTarget
  origin: string
  subjects: readonly CaptureSubject[]
  states: readonly CaptureState[]
  capturedAt: string
}

export const CURRENT_ROUTES = [
  { id: 'home', path: '/', label: 'Home' },
  { id: 'about', path: '/about', label: 'About' },
  { id: 'projects', path: '/projects', label: 'Projects' },
  { id: 'experience', path: '/experience', label: 'Experience' },
  { id: 'skills', path: '/skills', label: 'Skills' },
  { id: 'uses', path: '/uses', label: 'Uses' },
  { id: 'notes', path: '/notes', label: 'Notes' },
  { id: 'now', path: '/now', label: 'Now' },
  { id: 'contact', path: '/contact', label: 'Contact' },
  { id: 'blog', path: '/blog', label: 'Blog' },
] as const satisfies readonly CaptureSubject[]

export const REFERENCE_SUBJECTS = [
  { id: 'loader', path: '/', label: 'Loader' },
  { id: 'entry', path: '/', label: 'Entry gate' },
  { id: 'home', path: '/', label: 'Home' },
  { id: 'index', path: '/', label: 'Index' },
  { id: 'project', path: '/', label: 'Project sequence' },
  { id: 'about', path: '/', label: 'About' },
  { id: 'footer', path: '/', label: 'Footer' },
] as const satisfies readonly CaptureSubject[]

export const APPROVED_CAPTURE_STATES = [
  {
    id: 'desktop-pointer',
    label: 'Desktop pointer',
    viewport: { width: 1440, height: 900 },
    input: 'pointer',
    reducedMotion: 'no-preference',
    touch: false,
    soundGate: false,
  },
  {
    id: 'mobile-touch',
    label: 'Mobile touch',
    viewport: { width: 390, height: 844 },
    input: 'touch',
    reducedMotion: 'no-preference',
    touch: true,
    soundGate: false,
  },
  {
    id: 'desktop-keyboard',
    label: 'Desktop keyboard-only',
    viewport: { width: 1440, height: 900 },
    input: 'keyboard',
    reducedMotion: 'no-preference',
    touch: false,
    soundGate: false,
  },
  {
    id: 'desktop-reduced-motion',
    label: 'Desktop reduced motion',
    viewport: { width: 1440, height: 900 },
    input: 'keyboard',
    reducedMotion: 'reduce',
    touch: false,
    soundGate: false,
  },
  {
    id: 'desktop-sound-gate',
    label: 'Desktop sound gate',
    viewport: { width: 1440, height: 900 },
    input: 'pointer',
    reducedMotion: 'no-preference',
    touch: false,
    soundGate: true,
  },
] as const satisfies readonly CaptureState[]

export function createCapturePlan(
  input: CreateCapturePlanInput,
): CapturePlanRecord[] {
  return input.subjects.flatMap((subject) =>
    input.states.map((state) => {
      const isCurrentSoundGateGap =
        input.target === 'current' && state.soundGate

      return {
        target: input.target,
        subject,
        state,
        url: new URL(subject.path, input.origin).href,
        artifactPath: `artifacts/baseline/${input.target}/${state.id}/${subject.id}${isCurrentSoundGateGap ? '.gap.json' : '.png'}`,
        capturedAt: input.capturedAt,
        status: isCurrentSoundGateGap ? ('gap' as const) : ('planned' as const),
        ...(isCurrentSoundGateGap
          ? {
              limitation:
                'The current portfolio has no sound-entry gate; this state is recorded as a baseline gap.',
            }
          : {}),
      }
    }),
  )
}

export function validateCaptureRecords(
  records: readonly CapturePlanRecord[],
  subjects: readonly CaptureSubject[],
  states: readonly CaptureState[],
): string[] {
  const errors: string[] = []
  const artifactPathCounts = new Map<string, number>()
  const combinations = new Set<string>()

  for (const record of records) {
    artifactPathCounts.set(
      record.artifactPath,
      (artifactPathCounts.get(record.artifactPath) ?? 0) + 1,
    )
    combinations.add(`${record.subject.id}/${record.state.id}`)
  }

  for (const [artifactPath, count] of artifactPathCounts) {
    if (count > 1) {
      errors.push(`Duplicate artifact path: ${artifactPath}`)
    }
  }

  for (const subject of subjects) {
    for (const state of states) {
      const combination = `${subject.id}/${state.id}`
      if (!combinations.has(combination)) {
        errors.push(`Missing capture combination: ${combination}`)
      }
    }
  }

  return errors
}
