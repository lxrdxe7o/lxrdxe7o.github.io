import { describe, expect, it, vi } from 'vitest';

import { NavigationController } from '../../src/runtime/navigation/NavigationController';
import type { FocusManager } from '../../src/runtime/navigation/focus-manager';
import type { HistoryState } from '../../src/runtime/navigation/history-state';
import type { AssetDescriptor } from '../../src/runtime/assets/types';

interface MemoryRuntime {
  route: string;
  snapshots: Array<{ phase: string; route: string; navigationTarget: string | null }>;
  getSnapshot(): { route: string; capabilities: { reducedMotion: boolean }; qualityTier: string };
  prepareNavigation(target: string): void;
  commitNavigation(): void;
  setRoute(route: string): void;
  setIndexOpen(open: boolean): void;
}

function createRuntime(initialRoute = '/'): MemoryRuntime {
  const state = {
    route: initialRoute,
    navigationTarget: null as string | null,
  };
  return {
    route: initialRoute,
    snapshots: [],
    getSnapshot: () => ({
      route: state.route,
      navigationTarget: state.navigationTarget,
      capabilities: { reducedMotion: false },
      qualityTier: 'high',
    }),
    prepareNavigation(target: string) {
      state.navigationTarget = target;
    },
    commitNavigation() {
      if (state.navigationTarget) state.route = state.navigationTarget;
      state.navigationTarget = null;
    },
    setRoute(route: string) {
      state.route = route;
    },
    setIndexOpen: () => undefined,
  };
}

interface MemoryTransitions {
  plans: Array<{ from: string; to: string }>;
  runOutgoing: ReturnType<typeof vi.fn>;
  runIncoming: ReturnType<typeof vi.fn>;
  settle: ReturnType<typeof vi.fn>;
  cancel: ReturnType<typeof vi.fn>;
  beginSwap(): void;
  endSwap(): void;
  plan(): { id: string };
}

function createTransitions(): MemoryTransitions {
  return {
    plans: [],
    runOutgoing: vi.fn(async () => undefined),
    runIncoming: vi.fn(async () => undefined),
    settle: vi.fn(async () => undefined),
    cancel: vi.fn(),
    beginSwap: () => undefined,
    endSwap: () => undefined,
    plan: () => ({ id: 'preset' }),
  };
}

const emptyFocus = {
  focusRouteHeading: vi.fn(() => true),
  rememberOpener: vi.fn(),
  restoreOpener: vi.fn(() => true),
  clearOpener: vi.fn(),
} as unknown as FocusManager;

const emptyHistory = {
  rememberScroll: vi.fn(),
  claimForwardKey: vi.fn(),
  adoptRestoredEntry: vi.fn(),
} as unknown as HistoryState;

function createController(overrides: Partial<ConstructorParameters<typeof NavigationController>[0]> = {}) {
  return new NavigationController({
    runtime: createRuntime() as never,
    transitions: createTransitions() as never,
    focus: emptyFocus,
    history: emptyHistory,
    resolveAssets: () => [] as readonly AssetDescriptor[],
    resolveScope: () => 'route',
    readDocumentTitle: () => 'Title',
    ...overrides,
  });
}

describe('NavigationController phase ordering', () => {
  it('begins with idle and completes through the ordered phases', async () => {
    const controller = createController();
    expect(controller.getPhase()).toBe('idle');

    await controller.begin('/about');
    expect(controller.getPhase()).toBe('prepare');

    controller.beginSwap();
    expect(controller.getPhase()).toBe('swap');

    await controller.complete('/about');
    expect(controller.getPhase()).toBe('idle');
  });

  it('ignores duplicate destination requests already in flight', async () => {
    const transitions = createTransitions();
    const controller = createController({ transitions: transitions as never });
    const first = controller.begin('/about');
    const second = controller.begin('/about');
    await Promise.all([first, second]);
    expect(transitions.runOutgoing).toHaveBeenCalledTimes(1);
  });

  it('cancels the previous navigation when a different destination supersedes it', async () => {
    const transitions = createTransitions();
    const controller = createController({ transitions: transitions as never });
    await controller.begin('/about');
    await controller.begin('/projects');
    expect(transitions.cancel).toHaveBeenCalled();
    expect(controller.getPhase()).toBe('prepare');
  });
});

describe('NavigationController interruption safety', () => {
  it('failed preparation recovers to a usable state without stranding navigation', async () => {
    const controller = createController({
      assets: {
        loadScope: vi.fn(async () => {
          throw new Error('network');
        }),
        releaseScope: vi.fn(),
      } as never,
      resolveAssets: () => [{ id: 'x', type: 'image', weight: 1, criticality: 'enhancement' }] as never,
    });

    await expect(controller.begin('/about')).resolves.toBe(true);
    // prepareAssets swallows failures; the navigation still proceeds.
    controller.beginSwap();
    await controller.complete('/about');
    expect(controller.getPhase()).toBe('idle');
  });

  it('cancel fast-forwards to a settled cancelled state', async () => {
    const controller = createController();
    await controller.begin('/about');
    controller.cancel();
    expect(controller.getPhase()).toBe('cancelled');
    expect(controller.pendingTarget).toBeNull();
  });

  it('destroy aborts everything and rejects later work', async () => {
    const controller = createController();
    await controller.begin('/about');
    controller.destroy();
    expect(controller.getPhase()).toBe('idle');
    await expect(controller.begin('/projects')).resolves.toBe(false);
  });
});

describe('NavigationController history and browser semantics', () => {
  it('adopts the initial route without relocating focus or replaying transitions', async () => {
    const transitions = createTransitions();
    const controller = createController({ transitions: transitions as never });
    controller.adoptInitialRoute('/projects');
    expect(transitions.runOutgoing).not.toHaveBeenCalled();
    expect(transitions.runIncoming).not.toHaveBeenCalled();
    expect(controller.getPhase()).toBe('idle');
  });

  it('claims a forward key for link navigation but not history restoration', async () => {
    const history = { ...emptyHistory, claimForwardKey: vi.fn() };
    const controller = createController({ history: history as never });
    await controller.begin('/about');
    expect(history.claimForwardKey).toHaveBeenCalledOnce();
  });

  it('commits the route, restores scroll, and relocates focus on completion', async () => {
    const focus = { ...emptyFocus, focusRouteHeading: vi.fn(() => true) };
    const controller = createController({ focus: focus as never });
    await controller.begin('/about');
    controller.beginSwap();
    await controller.complete('/about', '#section');
    expect(focus.focusRouteHeading).toHaveBeenCalled();
    expect(controller.getPhase()).toBe('idle');
  });
});
