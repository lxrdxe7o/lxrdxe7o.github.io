import { test, expect } from 'vitest';
import { AssetManager } from '../../src/runtime/assets/AssetManager';

test('AssetManager reports 100% progress when items finish', async () => {
  const manager = new AssetManager();
  manager.queue('font1.woff2');
  
  // Mock load
  await manager.loadAll();
  expect(manager.getProgress()).toBe(100);
});
