import { describe, expect, it } from 'vitest';

import { decideScrollMode, shouldUseSmoothScroll, type ScrollPolicyInput } from '../../src/runtime/scroll/scroll-policy';

const capableInput: ScrollPolicyInput = {
  capabilities: {
    reducedMotion: false,
    reducedData: false,
    pointer: 'fine',
    webgl: true,
    visibility: 'visible',
  },
  modality: 'mouse',
  smoothScrollSupported: true,
  nestedScrollRegionActive: false,
  scrollLocked: false,
};

describe('scroll policy', () => {
  it('enables smooth scrolling only when every enhancement signal aligns', () => {
    expect(decideScrollMode(capableInput)).toEqual({ mode: 'smooth', reason: 'eligible' });
    expect(shouldUseSmoothScroll(capableInput)).toBe(true);
  });

  it('reduced motion always preserves native scroll', () => {
    const decision = decideScrollMode({
      ...capableInput,
      capabilities: { ...capableInput.capabilities, reducedMotion: true },
    });
    expect(decision).toEqual({ mode: 'native', reason: 'reduced-motion' });
  });

  it('reduced data disables smooth scrolling', () => {
    const decision = decideScrollMode({
      ...capableInput,
      capabilities: { ...capableInput.capabilities, reducedData: true },
    });
    expect(decision).toEqual({ mode: 'native', reason: 'reduced-data' });
  });

  it('keyboard modality and coarse pointers keep native scrolling', () => {
    expect(decideScrollMode({ ...capableInput, modality: 'keyboard' }).mode).toBe('native');
    expect(
      decideScrollMode({
        ...capableInput,
        capabilities: { ...capableInput.capabilities, pointer: 'coarse' },
      }).mode,
    ).toBe('native');
    expect(decideScrollMode({ ...capableInput, modality: 'touch' }).mode).toBe('native');
  });

  it('nested scroll regions and modal surfaces fall back to native', () => {
    expect(decideScrollMode({ ...capableInput, nestedScrollRegionActive: true }).reason).toBe(
      'nested-scroll-region',
    );
    expect(decideScrollMode({ ...capableInput, scrollLocked: true }).reason).toBe(
      'scroll-locked',
    );
  });

  it('unsupported environments never attempt smooth scrolling', () => {
    expect(
      decideScrollMode({ ...capableInput, smoothScrollSupported: false }).reason,
    ).toBe('unsupported-environment');
  });

  it('missing pointer capability falls back to native', () => {
    expect(
      decideScrollMode({
        ...capableInput,
        capabilities: { ...capableInput.capabilities, pointer: 'none' },
      }).mode,
    ).toBe('native');
  });
});
