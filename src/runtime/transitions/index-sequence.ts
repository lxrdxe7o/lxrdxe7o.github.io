/**
 * Index open/close sequence timing and state transitions.
 *
 * Pure, injectable state so the Index can be tested without a browser: the
 * controller only exposes open/close/interruption transitions, while the
 * Astro component script owns the DOM.
 */

export type IndexPhase = 'closed' | 'opening' | 'open' | 'closing';

export interface IndexState {
  readonly phase: IndexPhase;
  readonly openRequested: boolean;
}

export const CLOSED_INDEX: IndexState = Object.freeze({
  phase: 'closed',
  openRequested: false,
});

export type IndexEvent =
  | { type: 'request-open' }
  | { type: 'request-close' }
  | { type: 'open-complete' }
  | { type: 'close-complete' };

export function reduceIndexState(state: IndexState, event: IndexEvent): IndexState {
  switch (event.type) {
    case 'request-open':
      if (state.phase === 'closed' || state.phase === 'closing') {
        return { phase: 'opening', openRequested: true };
      }
      return state;
    case 'request-close':
      if (state.phase === 'open' || state.phase === 'opening') {
        return { phase: 'closing', openRequested: false };
      }
      return state;
    case 'open-complete':
      return state.phase === 'opening' ? { phase: 'open', openRequested: true } : state;
    case 'close-complete':
      return state.phase === 'closing' ? { phase: 'closed', openRequested: false } : state;
  }
}
