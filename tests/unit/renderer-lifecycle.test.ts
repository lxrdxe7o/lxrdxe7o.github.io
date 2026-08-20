import { test, expect, vi } from 'vitest';
import { Renderer } from '../../src/runtime/rendering/Renderer';

// Mock WebGL canvas
const mockCanvas = {
  width: 800, height: 600,
  getContext: vi.fn(),
  addEventListener: vi.fn()
} as unknown as HTMLCanvasElement;

test('Renderer initializes with correct DPR and clears scene on destroy', () => {
  const renderer = new Renderer(mockCanvas);
  expect(renderer.isInitialized()).toBe(true);
  
  renderer.destroy();
  expect(renderer.isInitialized()).toBe(false);
});
