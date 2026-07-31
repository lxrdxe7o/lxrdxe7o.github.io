export interface KeyboardSample {
  readonly key: string;
  readonly time: number;
}

export interface KeyboardSignalState {
  readonly focusVisible: boolean;
  readonly lastKey: string | null;
  readonly usingKeyboard: boolean;
}

/**
 * Keys that indicate a visitor is navigating structurally rather than
 * pointing. Any of them makes focus visible and hands scroll control back
 * to the browser's native, predictable behaviour.
 */
const NAVIGATION_KEYS = new Set<string>([
  'Tab',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'PageUp',
  'PageDown',
  'Home',
  'End',
  'Enter',
  ' ',
  'Spacebar',
  'Escape',
]);

export function isNavigationKey(key: string): boolean {
  return NAVIGATION_KEYS.has(key);
}

export class KeyboardSignal {
  private focusVisible = false;
  private lastKey: string | null = null;
  private lastKeyTime: number | null = null;

  /** Returns true when this key should switch modality to keyboard. */
  sample(sample: KeyboardSample): boolean {
    this.lastKey = sample.key;
    this.lastKeyTime = sample.time;
    if (!isNavigationKey(sample.key)) return false;
    this.focusVisible = true;
    return true;
  }

  /** Pointer activity hides the focus ring again. */
  clearFocusVisible(): void {
    this.focusVisible = false;
  }

  read(): KeyboardSignalState {
    return Object.freeze({
      focusVisible: this.focusVisible,
      lastKey: this.lastKey,
      usingKeyboard: this.focusVisible,
    });
  }

  get lastInteractionTime(): number | null {
    return this.lastKeyTime;
  }

  reset(): void {
    this.focusVisible = false;
    this.lastKey = null;
    this.lastKeyTime = null;
  }
}
