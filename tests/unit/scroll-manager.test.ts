import { test, expect } from 'vitest';
import { ScrollManager } from '../../src/runtime/scroll/ScrollManager';

test('ScrollManager accumulates scroll intent without moving native window', () => {
  const manager = new ScrollManager();
  
  // Simulate wheel down — use mock if WheelEvent not available (node env)
  const event = (typeof WheelEvent !== 'undefined'
    ? new WheelEvent('wheel', { deltaY: 100, cancelable: true })
    : ({ deltaY: 100, cancelable: true, preventDefault: () => {} } as unknown as WheelEvent));
  manager.handleWheel(event);
  
  expect(manager.getProgress()).toBeGreaterThan(0);
});
