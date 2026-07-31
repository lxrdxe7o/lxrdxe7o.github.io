import type { NavigationController } from './NavigationController';
import type { HistoryState } from './history-state';

export interface AstroEventTarget {
  addEventListener(type: string, listener: (event: Event) => void): void;
  removeEventListener(type: string, listener: (event: Event) => void): void;
}

export interface LocationLike {
  readonly pathname: string;
  readonly hash: string;
}

export interface AstroBridgeOptions {
  readonly target: AstroEventTarget;
  readonly navigation: NavigationController;
  readonly history: HistoryState;
  readonly readLocation: () => LocationLike;
  readonly onError?: (reason: string) => void;
}

interface PreparationEvent extends Event {
  readonly to?: URL | string;
}

function readTargetPath(event: Event): string | null {
  const candidate = (event as PreparationEvent).to;
  if (!candidate) return null;
  if (typeof candidate === 'string') {
    try {
      return new URL(candidate, 'https://placeholder.invalid').pathname;
    } catch {
      return candidate;
    }
  }
  return candidate.pathname;
}

/**
 * Bridges Astro's ClientRouter lifecycle to runtime navigation phases.
 *
 * The runtime never runs its own page timers: each phase is driven by the
 * corresponding Astro event, so DOM swapping and the persistent canvas can
 * never drift out of sync.
 */
export function connectAstroNavigation(options: AstroBridgeOptions): () => void {
  const { target, navigation, history, readLocation } = options;
  let popstatePending = false;
  let isFirstLoad = true;

  const onBeforePreparation = (event: Event) => {
    const to = readTargetPath(event) ?? readLocation().pathname;
    const cause = popstatePending ? 'history' : 'link';
    popstatePending = false;
    void navigation.begin(to, cause).catch((error: unknown) => {
      options.onError?.(error instanceof Error ? error.message : String(error));
      navigation.fail(readLocation().pathname);
    });
  };

  const onBeforeSwap = () => navigation.beginSwap();

  const onPageLoad = () => {
    const location = readLocation();
    if (isFirstLoad) {
      isFirstLoad = false;
      navigation.adoptInitialRoute(location.pathname);
      return;
    }
    void navigation.complete(location.pathname, location.hash).catch((error: unknown) => {
      options.onError?.(error instanceof Error ? error.message : String(error));
      navigation.fail(location.pathname);
    });
  };

  const onPopState = () => {
    popstatePending = true;
    history.adoptRestoredEntry();
  };

  target.addEventListener('astro:before-preparation', onBeforePreparation);
  target.addEventListener('astro:before-swap', onBeforeSwap);
  target.addEventListener('astro:page-load', onPageLoad);
  target.addEventListener('popstate', onPopState);

  return () => {
    target.removeEventListener('astro:before-preparation', onBeforePreparation);
    target.removeEventListener('astro:before-swap', onBeforeSwap);
    target.removeEventListener('astro:page-load', onPageLoad);
    target.removeEventListener('popstate', onPopState);
  };
}
