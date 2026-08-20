import { test, expect } from 'vitest';
import { ExperienceRuntime } from '../../src/runtime/core/ExperienceRuntime';

test('Runtime starts in Booting state and transitions to Loading', () => {
  const runtime = new ExperienceRuntime();
  expect(runtime.getState().phase).toBe('Booting');
  
  runtime.boot();
  expect(runtime.getState().phase).toBe('Loading');
});

test('Runtime handles sound entry consent', () => {
  const runtime = new ExperienceRuntime();
  runtime.boot();
  runtime.assetsLoaded();
  expect(runtime.getState().phase).toBe('EntryGate');
  
  runtime.enter('sound');
  expect(runtime.getState().phase).toBe('ActiveSound');
});
