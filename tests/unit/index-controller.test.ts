import { describe, expect, it } from 'vitest';

import {
  CLOSED_INDEX,
  reduceIndexState,
  type IndexEvent,
  type IndexState,
} from '../../src/runtime/transitions/index-sequence';

function apply(events: readonly IndexEvent[], from: IndexState = CLOSED_INDEX): IndexState {
  return events.reduce(reduceIndexState, from);
}

describe('index open/close sequence', () => {
  it('opens through the ordered phases', () => {
    const state = apply([
      { type: 'request-open' },
      { type: 'open-complete' },
    ]);
    expect(state).toEqual({ phase: 'open', openRequested: true });
  });

  it('closes through the ordered phases and returns to closed', () => {
    const open = apply([{ type: 'request-open' }, { type: 'open-complete' }]);
    const closed = apply([{ type: 'request-close' }, { type: 'close-complete' }], open);
    expect(closed).toEqual(CLOSED_INDEX);
  });

  it('interruption during opening resolves to a clean closed state', () => {
    const state = apply([
      { type: 'request-open' },
      { type: 'request-close' },
      { type: 'close-complete' },
    ]);
    expect(state).toEqual(CLOSED_INDEX);
  });

  it('ignores duplicate requests and out-of-order completions', () => {
    expect(apply([{ type: 'open-complete' }])).toEqual(CLOSED_INDEX);
    const singleOpen = apply([{ type: 'request-open' }, { type: 'request-open' }]);
    expect(singleOpen.phase).toBe('opening');

    const state = apply([
      { type: 'request-open' },
      { type: 'open-complete' },
      { type: 'open-complete' },
    ]);
    expect(state.phase).toBe('open');
  });

  it('supports legal re-open while closing', () => {
    const open = apply([{ type: 'request-open' }, { type: 'open-complete' }]);
    const closing = apply([{ type: 'request-close' }], open);
    expect(closing.phase).toBe('closing');

    const reopened = apply([{ type: 'request-open' }], closing);
    expect(reopened.phase).toBe('opening');
  });
});
