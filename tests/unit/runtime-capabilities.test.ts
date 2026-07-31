import { afterEach, describe, expect, it, vi } from 'vitest';

import { BrowserCapabilityAdapter } from '../../src/runtime/core/capabilities';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('BrowserCapabilityAdapter', () => {
  it('releases a successful WebGL probe context when the extension is supported', () => {
    const loseContext = vi.fn();
    const getExtension = vi.fn((name: string) =>
      name === 'WEBGL_lose_context' ? { loseContext } : null,
    );
    const context = { getExtension };
    const getContext = vi.fn((name: string) => (name === 'webgl2' ? context : null));
    const createElement = vi.fn(() => ({ getContext }));
    vi.stubGlobal('document', { createElement });

    expect(new BrowserCapabilityAdapter().readWebGL()).toBe(true);
    expect(createElement).toHaveBeenCalledWith('canvas');
    expect(getContext).toHaveBeenCalledWith('webgl2');
    expect(getExtension).toHaveBeenCalledWith('WEBGL_lose_context');
    expect(loseContext).toHaveBeenCalledOnce();
  });
});
