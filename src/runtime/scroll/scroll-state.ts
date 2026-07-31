export type ScrollDirection = 'none' | 'up' | 'down';

export interface ScrollSection {
  readonly id: string;
  readonly start: number;
  readonly end: number;
}

export interface ScrollSnapshot {
  readonly position: number;
  /** 0..1 across the scrollable distance; 0 when the page does not scroll. */
  readonly progress: number;
  readonly velocity: number;
  readonly direction: ScrollDirection;
  readonly section: string | null;
  readonly restoring: boolean;
}

export const INITIAL_SCROLL: ScrollSnapshot = Object.freeze({
  position: 0,
  progress: 0,
  velocity: 0,
  direction: 'none',
  section: null,
  restoring: false,
});

export function computeProgress(position: number, scrollableDistance: number): number {
  if (!Number.isFinite(position) || scrollableDistance <= 0) return 0;
  return Math.max(0, Math.min(1, position / scrollableDistance));
}

export function resolveSection(
  position: number,
  sections: readonly ScrollSection[],
): string | null {
  for (const section of sections) {
    if (position >= section.start && position < section.end) return section.id;
  }
  return sections.length > 0 && position >= sections[sections.length - 1].end
    ? sections[sections.length - 1].id
    : null;
}

export interface ScrollSampleInput {
  readonly position: number;
  readonly scrollableDistance: number;
  readonly time: number;
  readonly sections: readonly ScrollSection[];
  readonly restoring: boolean;
}

/** Accumulates raw scroll positions into a normalized snapshot. */
export class ScrollState {
  private snapshot: ScrollSnapshot = INITIAL_SCROLL;
  private lastTime: number | null = null;

  sample(input: ScrollSampleInput): ScrollSnapshot {
    const position = Math.max(0, input.position);
    const previous = this.snapshot.position;
    const elapsedMs = this.lastTime === null ? 0 : Math.max(0, input.time - this.lastTime);
    const distance = position - previous;
    const velocity = elapsedMs > 0 ? distance / (elapsedMs / 1000) : 0;

    let direction: ScrollDirection = 'none';
    if (distance > 0.5) direction = 'down';
    else if (distance < -0.5) direction = 'up';

    this.lastTime = input.time;
    this.snapshot = Object.freeze({
      position,
      progress: computeProgress(position, input.scrollableDistance),
      velocity,
      direction,
      section: resolveSection(position, input.sections),
      restoring: input.restoring,
    });
    return this.snapshot;
  }

  read(): ScrollSnapshot {
    return this.snapshot;
  }

  reset(): void {
    this.snapshot = INITIAL_SCROLL;
    this.lastTime = null;
  }
}

/** Per-route scroll memory, so back/forward restores a deliberate position. */
export class ScrollPositionMemory {
  private readonly positions = new Map<string, number>();

  remember(route: string, position: number): void {
    if (!route) return;
    this.positions.set(route, Math.max(0, position));
  }

  recall(route: string): number | null {
    return this.positions.get(route) ?? null;
  }

  forget(route: string): void {
    this.positions.delete(route);
  }

  clear(): void {
    this.positions.clear();
  }
}
