import { describe, expect, it } from 'vitest';
import { CONTRACTS, createMission, interactMission, stepMission } from './index';
import { FIXED_DT } from '@adventuremnc/shared';

describe('Mission runner', () => {
  it.each(CONTRACTS)('completes ordered objectives for $title', definition => {
    let state = createMission(definition.id);
    expect(interactMission(state, { x: 3999, y: 0, z: 3999 })).toEqual(state);
    for (const target of definition.objectives) state = interactMission(state, { ...target, y: 0 });
    expect(state.status).toBe('completed');
    expect(state.objective).toBe(definition.objectives.length);
    expect(interactMission(state, { x: -22, y: 0, z: -10 })).toEqual(state);
    expect(stepMission(state, 0, true)).toEqual(state);
  });
  it('advances exactly one fixed timestep', () => {
    expect(stepMission(createMission('cold-courier'), 100, false).elapsed).toBe(FIXED_DT);
  });
  it('cannot deliver ice before collection', () => {
    const state = createMission('cold-courier');
    expect(interactMission(state, { x: -22, y: 0, z: -10 })).toEqual(state);
  });
  it('fails at the deadline and rejects subsequent collection', () => {
    const initial = { ...createMission('ridge-surveyor'), elapsed: 600 - FIXED_DT };
    const failed = stepMission(initial, 100, false);
    expect(failed.status).toBe('failed');
    expect(interactMission(failed, { x: 0, y: 0, z: -400 })).toEqual(failed);
  });
  it('fails for depleted O2 or death', () => {
    expect(stepMission(createMission('cold-courier'), 0, false).status).toBe('failed');
    expect(stepMission(createMission('illegal-salvage'), 100, true).status).toBe('failed');
  });
});
