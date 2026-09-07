import { describe, it, expect, vi } from 'vitest';
import { FixedTimestepLoop } from './game-loop';
import { FIXED_DT } from '@adventuremnc/shared';

describe('FixedTimestepLoop', () => {
  it('executes a single step when deltaTime equals FIXED_DT', () => {
    const stepSimulation = vi.fn();
    const render = vi.fn();
    const loop = new FixedTimestepLoop({ stepSimulation, render });

    loop.update(FIXED_DT);

    expect(stepSimulation).toHaveBeenCalledTimes(1);
    expect(stepSimulation).toHaveBeenCalledWith(FIXED_DT);
    expect(render).toHaveBeenCalledTimes(1);
    expect(render).toHaveBeenCalledWith(0);
  });

  it('clamps accumulator when deltaTime exceeds 0.25 seconds', () => {
    const stepSimulation = vi.fn();
    const render = vi.fn();
    const loop = new FixedTimestepLoop({ stepSimulation, render });

    // Send 1.0 second hitch
    loop.update(1.0);

    // Clamped to 0.25s: 0.25 / (1/60) = 15 steps
    expect(stepSimulation).toHaveBeenCalledTimes(15);
    expect(render).toHaveBeenCalledTimes(1);
  });

  it('calculates alpha interpolation correctly for remainder timestep', () => {
    const stepSimulation = vi.fn();
    const render = vi.fn();
    const loop = new FixedTimestepLoop({ stepSimulation, render });

    // 1.5 * FIXED_DT
    loop.update(FIXED_DT * 1.5);

    expect(stepSimulation).toHaveBeenCalledTimes(1);
    expect(render).toHaveBeenCalledTimes(1);
    const alpha = render.mock.calls[0]?.[0];
    expect(alpha).toBeCloseTo(0.5, 5);
  });
});
