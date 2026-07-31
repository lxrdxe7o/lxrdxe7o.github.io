export interface FocusableElement {
  focus(options?: { preventScroll?: boolean }): void;
  setAttribute(name: string, value: string): void;
  removeAttribute(name: string): void;
  hasAttribute(name: string): boolean;
}

export interface FocusDocument {
  querySelector(selectors: string): FocusableElement | null;
  readonly activeElement: FocusableElement | null;
}

export interface FocusAnnouncer {
  announce(message: string): void;
}

/**
 * Focus behaviour across route changes and modal surfaces.
 *
 * After navigation, focus moves to the new page heading so screen-reader and
 * keyboard users are told where they landed instead of being left at the top
 * of a replaced document.
 */
export class FocusManager {
  private opener: FocusableElement | null = null;

  constructor(
    private readonly document: FocusDocument,
    private readonly announcer?: FocusAnnouncer,
  ) {}

  /** Remembers the control that opened a modal surface such as the Index. */
  rememberOpener(element: FocusableElement | null = this.document.activeElement): void {
    this.opener = element;
  }

  restoreOpener(): boolean {
    const opener = this.opener;
    this.opener = null;
    if (!opener) return false;
    try {
      opener.focus({ preventScroll: true });
      return true;
    } catch {
      return false;
    }
  }

  clearOpener(): void {
    this.opener = null;
  }

  /**
   * Moves focus to the route's main heading, falling back to the main landmark.
   * `tabindex="-1"` is applied temporarily so a heading can receive focus
   * without ever becoming a tab stop.
   */
  focusRouteHeading(announcement?: string): boolean {
    const heading =
      this.document.querySelector('main h1') ?? this.document.querySelector('#main-content');
    if (!heading) return false;

    const hadTabIndex = heading.hasAttribute('tabindex');
    if (!hadTabIndex) heading.setAttribute('tabindex', '-1');

    try {
      heading.focus({ preventScroll: true });
    } catch {
      return false;
    } finally {
      if (!hadTabIndex) heading.removeAttribute('tabindex');
    }

    if (announcement) this.announcer?.announce(announcement);
    return true;
  }
}

/** Live-region announcer backed by a polite status element. */
export function createLiveRegionAnnouncer(element: {
  textContent: string | null;
}): FocusAnnouncer {
  return {
    announce(message: string) {
      // Clearing first guarantees repeat messages are re-announced.
      element.textContent = '';
      element.textContent = message;
    },
  };
}
