import { test, expect } from 'vitest';
import { AudioManager } from '../../src/runtime/audio/AudioManager';

test('AudioManager starts muted and requires consent to play sound', () => {
  const audio = new AudioManager();
  expect(audio.isAllowed()).toBe(false);
  
  audio.unlock();
  expect(audio.isAllowed()).toBe(true);
});

test('Mute toggle overrides consent temporarily', () => {
  const audio = new AudioManager();
  audio.unlock();
  audio.setMuted(true);
  
  expect(audio.isAllowed()).toBe(true);
  expect(audio.isMuted()).toBe(true);
});
