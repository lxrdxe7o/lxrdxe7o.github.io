import { describe, expect, it } from 'vitest';

import {
  IDLE_INPUT,
  InputManager,
  type InputEnvironment,
  type InputSnapshot,
} from '../../src/runtime/input/InputManager';
import { PointerSignal } from '../../src/runtime/input/PointerSignal';
import { KeyboardSignal } from '../../src/runtime/input/KeyboardSignal';

describe('PointerSignal normalization and decay', () => {
  it('normalizes coordinates to -1..1 around the viewport centre', () => {
    const signal = new PointerSignal(800, 600);
    signal.sample({ clientX: 0, clientY: 0, pointerType: 'mouse', pressed: false, time: 100 });
    expect(signal.read(100)).toMatchObject({ x: -1, y: -1, modality: 'mouse' });

    signal.sample({ clientX: 800, clientY: 600, pointerType: 'mouse', pressed: false, time: 116 });
    expect(signal.read(116)).toMatchObject({ x: 1, y: 1 });
  });

  it('computes frame-rate independent velocity in units per second', () => {
    const signal = new PointerSignal(800, 600);
    signal.sample({ clientX: 0, clientY: 0, pointerType: 'mouse', pressed: false, time: 0 });
    signal.sample({ clientX: 800, clientY: 0, pointerType: 'mouse', pressed: false, time: 500 });
    const state = signal.read(500);
    // Full width (2 units) over 0.5s = 4 units/s.
    expect(state.velocity).toBeCloseTo(4, 1);
  });

  it('decays velocity and delta toward rest between samples', () => {
    const signal = new PointerSignal(800, 600);
    signal.sample({ clientX: 0, clientY: 0, pointerType: 'mouse', pressed: false, time: 0 });
    signal.sample({ clientX: 800, clientY: 0, pointerType: 'mouse', pressed: false, time: 100 });
    const hot = signal.read(100);
    expect(hot.velocity).toBeGreaterThan(1);

    signal.decay(1000, 90);
    const settled = signal.read(1000);
    expect(settled.velocity).toBeLessThan(hot.velocity);
    expect(settled.deltaX).toBeLessThan(hot.deltaX);
  });

  it('switches modality for touch and keyboard without leaking state', () => {
    const signal = new PointerSignal(800, 600);
    signal.sample({ clientX: 400, clientY: 300, pointerType: 'touch', pressed: true, time: 10 });
    expect(signal.read(10)).toMatchObject({ modality: 'touch', pressed: true });

    signal.markKeyboard(20);
    const state = signal.read(20);
    expect(state).toMatchObject({ modality: 'keyboard', pressed: false, velocity: 0 });
  });

  it('clamps non-finite coordinates to zero', () => {
    const signal = new PointerSignal(800, 600);
    signal.sample({
      clientX: Number.NaN,
      clientY: Number.POSITIVE_INFINITY,
      pointerType: 'mouse',
      pressed: false,
      time: 0,
    });
    expect(signal.read(0)).toMatchObject({ x: 0, y: 0 });
  });
});

describe('KeyboardSignal focus visibility', () => {
  it('tracks Tab-driven focus visibility and clears on pointer', () => {
    const signal = new KeyboardSignal();
    expect(signal.read().focusVisible).toBe(false);

    expect(signal.sample({ key: 'Tab', time: 0 })).toBe(true);
    expect(signal.read().focusVisible).toBe(true);

    signal.clearFocusVisible();
    expect(signal.read().focusVisible).toBe(false);
  });
});

interface MemoryInput {
  environment: InputEnvironment;
  frames: Map<number, (time: number) => void>;
  pointerListeners: Array<(sample: Parameters<Parameters<InputEnvironment['onPointer']>[0]>[0]) => void>;
  keyboardListeners: Array<(sample: Parameters<Parameters<InputEnvironment['onKeyboard']>[0]>[0]) => void>;
  viewportListeners: Array<() => void>;
  releases: number[];
  viewport: { width: number; height: number; dpr: number };
  emitPointer(sample: Parameters<Parameters<InputEnvironment['onPointer']>[0]>[0]): void;
  emitKeyboard(sample: Parameters<Parameters<InputEnvironment['onKeyboard']>[0]>[0]): void;
  emitViewport(): void;
  flushFrame(time: number): void;
}

function createMemoryInput(): MemoryInput {
  let frameId = 0;
  const frames = new Map<number, (time: number) => void>();
  const pointerListeners: MemoryInput['pointerListeners'] = [];
  const keyboardListeners: MemoryInput['keyboardListeners'] = [];
  const viewportListeners: MemoryInput['viewportListeners'] = [];
  const releases: number[] = [];
  const input: MemoryInput = {
    environment: {
      now: () => 0,
      requestFrame: (callback) => {
        frameId += 1;
        frames.set(frameId, callback);
        return frameId;
      },
      cancelFrame: (handle) => {
        frames.delete(handle);
        releases.push(handle);
      },
      measureViewport: () => input.viewport,
      onPointer: (listener) => {
        pointerListeners.push(listener);
        return () => {
          releases.push(-1);
        };
      },
      onKeyboard: (listener) => {
        keyboardListeners.push(listener);
        return () => {
          releases.push(-2);
        };
      },
      onViewportChange: (listener) => {
        viewportListeners.push(listener);
        return () => {
          releases.push(-3);
        };
      },
    },
    frames,
    pointerListeners,
    keyboardListeners,
    viewportListeners,
    releases,
    viewport: { width: 1440, height: 900, dpr: 1 },
    emitPointer(sample) {
      for (const listener of pointerListeners) listener(sample);
    },
    emitKeyboard(sample) {
      for (const listener of keyboardListeners) listener(sample);
    },
    emitViewport() {
      for (const listener of viewportListeners) listener();
    },
    flushFrame(time) {
      const next = frames.entries().next().value;
      if (!next) return;
      frames.delete(next[0]);
      next[1](time);
    },
  };
  return input;
}

describe('InputManager frame coalescing', () => {
  it('publishes at most one snapshot per animation frame', () => {
    const memory = createMemoryInput();
    const manager = new InputManager(memory.environment);
    const snapshots: InputSnapshot[] = [];
    manager.subscribe((snapshot) => snapshots.push(snapshot));
    manager.start();

    memory.emitPointer({ clientX: 10, clientY: 10, pointerType: 'mouse', pressed: false, time: 1 });
    memory.emitPointer({ clientX: 20, clientY: 20, pointerType: 'mouse', pressed: false, time: 2 });
    memory.emitPointer({ clientX: 30, clientY: 30, pointerType: 'mouse', pressed: false, time: 3 });

    expect(snapshots).toHaveLength(0);
    memory.flushFrame(16);
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0]?.modality).toBe('mouse');

    memory.flushFrame(32);
    expect(snapshots).toHaveLength(1);
    manager.destroy();
  });

  it('keyboard interaction switches modality and clears focus-visible on pointer', () => {
    const memory = createMemoryInput();
    const manager = new InputManager(memory.environment);
    manager.start();

    memory.emitKeyboard({ key: 'Tab', time: 10 });
    memory.flushFrame(16);
    expect(manager.getSnapshot().focusVisible).toBe(true);
    expect(manager.getSnapshot().modality).toBe('keyboard');

    memory.emitPointer({ clientX: 0, clientY: 0, pointerType: 'mouse', pressed: false, time: 20 });
    memory.flushFrame(32);
    expect(manager.getSnapshot().focusVisible).toBe(false);
    expect(manager.getSnapshot().modality).toBe('mouse');
    manager.destroy();
  });

  it('viewport changes republish and destroy releases every listener once', () => {
    const memory = createMemoryInput();
    const manager = new InputManager(memory.environment);
    manager.start();

    memory.viewport = { width: 800, height: 600, dpr: 2 };
    memory.emitViewport();
    memory.flushFrame(16);
    expect(manager.getSnapshot().viewport).toMatchObject({ width: 800, height: 600, dpr: 2 });

    manager.destroy();
    manager.destroy();
    expect(memory.pointerListeners).toHaveLength(1);
    expect(memory.releases.filter((value) => value < 0)).toHaveLength(3);
    expect(manager.getSnapshot()).toBe(IDLE_INPUT);
  });

  it('tick advances decay and republishes with an idle pointer', () => {
    const memory = createMemoryInput();
    const manager = new InputManager(memory.environment);
    manager.start();

    memory.emitPointer({ clientX: 0, clientY: 0, pointerType: 'mouse', pressed: false, time: 0 });
    memory.emitPointer({ clientX: 800, clientY: 450, pointerType: 'mouse', pressed: false, time: 100 });
    memory.flushFrame(116);
    const hot = manager.getSnapshot();
    expect(hot.pointer.velocity).toBeGreaterThan(0);

    manager.tick(1000);
    const settled = manager.getSnapshot();
    expect(settled.pointer.velocity).toBeLessThan(hot.pointer.velocity);
    expect(settled.pointer.inactiveMs).toBe(900);
    manager.destroy();
  });
});
