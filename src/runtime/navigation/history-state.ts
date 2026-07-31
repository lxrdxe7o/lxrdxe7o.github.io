export interface RuntimeHistoryState {
  readonly runtimeKey: number;
  readonly scrollPosition: number;
}

export interface HistoryAdapter {
  readState(): unknown;
  replaceState(state: unknown): void;
}

function isRuntimeHistoryState(value: unknown): value is RuntimeHistoryState {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<RuntimeHistoryState>;
  return (
    typeof candidate.runtimeKey === 'number' && typeof candidate.scrollPosition === 'number'
  );
}

/**
 * Tracks a monotonic key in `history.state` so backward and forward navigation
 * can be distinguished from a fresh link click, and records the scroll offset
 * that belongs to each entry.
 *
 * Astro owns the history entries themselves; this only augments their state.
 */
export class HistoryState {
  private nextKey = 1;
  private currentKey = 0;

  constructor(private readonly adapter: HistoryAdapter) {
    const existing = this.adapter.readState();
    if (isRuntimeHistoryState(existing)) {
      this.currentKey = existing.runtimeKey;
      this.nextKey = existing.runtimeKey + 1;
    } else {
      this.stamp(0);
    }
  }

  get key(): number {
    return this.currentKey;
  }

  /** Assigns the next key to the entry being navigated to. */
  claimForwardKey(): number {
    this.currentKey = this.nextKey;
    this.nextKey += 1;
    return this.currentKey;
  }

  /**
   * Compares the restored entry's key against the current one to classify a
   * popstate as backward or forward travel.
   */
  adoptRestoredEntry(): 'backward' | 'forward' | 'unknown' {
    const state = this.adapter.readState();
    if (!isRuntimeHistoryState(state)) {
      this.stamp(this.currentKey);
      return 'unknown';
    }

    const direction = state.runtimeKey < this.currentKey ? 'backward' : 'forward';
    this.currentKey = state.runtimeKey;
    this.nextKey = Math.max(this.nextKey, state.runtimeKey + 1);
    return direction;
  }

  rememberScroll(position: number): void {
    this.stamp(this.currentKey, position);
  }

  readRememberedScroll(): number | null {
    const state = this.adapter.readState();
    return isRuntimeHistoryState(state) ? state.scrollPosition : null;
  }

  private stamp(key: number, scrollPosition = 0): void {
    const existing = this.adapter.readState();
    const base = typeof existing === 'object' && existing !== null ? existing : {};
    this.adapter.replaceState({
      ...base,
      runtimeKey: key,
      scrollPosition,
    } satisfies RuntimeHistoryState & Record<string, unknown>);
  }
}

export function createBrowserHistoryAdapter(): HistoryAdapter {
  return {
    readState: () => history.state,
    replaceState: (state) => history.replaceState(state, '', location.href),
  };
}
