import { describe, expect, it } from 'vitest';

import {
  createExperimentState,
  getExperiment,
  listExperiments,
  parseExperimentParams,
  registerExperiment,
  type ExperimentDefinition,
} from '../../src/runtime/rendering/scenes/lab/ExperimentRegistry';

const FIELD_EXPERIMENT: ExperimentDefinition = {
  id: 'field',
  slug: 'field',
  title: 'Field Study',
  seed: 1234,
  capabilityRequirements: ['webgl'],
  controlSchema: {
    particles: { min: 100, max: 2000, step: 50, default: 600 },
    drift: { min: 0, max: 1, step: 0.05, default: 0.25 },
  },
};

describe('experiment registry', () => {
  it('rejects duplicate experiment ids', () => {
    registerExperiment(FIELD_EXPERIMENT);
    expect(() => registerExperiment(FIELD_EXPERIMENT)).toThrow(/duplicate experiment id/i);
    expect(getExperiment('field')?.title).toBe('Field Study');
    expect(listExperiments()).toHaveLength(1);
  });

  it('parses parameters into validated finite ranges with step alignment', () => {
    const params = parseExperimentParams(FIELD_EXPERIMENT, {
      particles: '999999',
      drift: 'not-a-number',
    });
    expect(params).toEqual({ particles: 2000, drift: 0.25 });

    const stepped = parseExperimentParams(FIELD_EXPERIMENT, { particles: '325' });
    expect(stepped.particles).toBe(350);
  });

  it('produces identical state for identical seeds and params', () => {
    const first = createExperimentState(FIELD_EXPERIMENT, { particles: '600' });
    const second = createExperimentState(FIELD_EXPERIMENT, { particles: '600' });
    expect(first.random.nextUint32()).toBe(second.random.nextUint32());
    expect(first.params).toEqual(second.params);
  });

  it('produces different state for different params even with the same seed', () => {
    const base = createExperimentState(FIELD_EXPERIMENT);
    const shifted = createExperimentState(FIELD_EXPERIMENT, { drift: '0.5' });
    expect(base.random.nextUint32()).not.toBe(shifted.random.nextUint32());
  });

  it('bounds reset works: unknown params fall back to defaults without throwing', () => {
    const state = createExperimentState(FIELD_EXPERIMENT, { unknown: 'x' });
    expect(state.params).toEqual({ particles: 600, drift: 0.25 });
  });
});
