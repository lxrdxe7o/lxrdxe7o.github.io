import type { CapabilityFlags } from '../core/types';
import type { PointerModality } from '../input/PointerSignal';

export interface ScrollPolicyInput {
  readonly capabilities: CapabilityFlags;
  readonly modality: PointerModality;
  /** False when the environment cannot support hijacked scrolling safely. */
  readonly smoothScrollSupported: boolean;
  /** True while the pointer is inside a nested scrollable region. */
  readonly nestedScrollRegionActive: boolean;
  /** True when the visitor is inside a modal surface such as the Index. */
  readonly scrollLocked: boolean;
}

export type ScrollMode = 'native' | 'smooth';

export interface ScrollDecision {
  readonly mode: ScrollMode;
  readonly reason: string;
}

/**
 * Native scrolling is the default and the fallback. Smooth scrolling is an
 * enhancement that must earn its place: any accessibility signal, structural
 * navigation, nested scroll region, or unsupported environment turns it off.
 */
export function decideScrollMode(input: ScrollPolicyInput): ScrollDecision {
  if (!input.smoothScrollSupported) {
    return { mode: 'native', reason: 'unsupported-environment' };
  }
  if (input.capabilities.reducedMotion) {
    return { mode: 'native', reason: 'reduced-motion' };
  }
  if (input.capabilities.reducedData) {
    return { mode: 'native', reason: 'reduced-data' };
  }
  if (input.modality === 'keyboard') {
    return { mode: 'native', reason: 'keyboard-navigation' };
  }
  if (input.nestedScrollRegionActive) {
    return { mode: 'native', reason: 'nested-scroll-region' };
  }
  if (input.scrollLocked) {
    return { mode: 'native', reason: 'scroll-locked' };
  }
  // Coarse pointers already have platform-tuned inertia; adding our own
  // fights the OS and hurts more than it helps.
  if (input.capabilities.pointer === 'coarse' || input.modality === 'touch') {
    return { mode: 'native', reason: 'coarse-pointer' };
  }
  if (input.capabilities.pointer === 'none') {
    return { mode: 'native', reason: 'no-pointer' };
  }
  return { mode: 'smooth', reason: 'eligible' };
}

export function shouldUseSmoothScroll(input: ScrollPolicyInput): boolean {
  return decideScrollMode(input).mode === 'smooth';
}
