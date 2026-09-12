import { describe, expect, it } from 'vitest';
import { canCycleAirlock, HABITAT_AIRLOCK, navigationCue, stepSecurity, stepVisorDust } from './field-systems';

describe('Field systems', () => {
  it('keeps clean security stable and escalates at 30 seconds', () => {
    expect(stepSecurity({ level: 0, elapsed: 0 }, 600)).toEqual({ level: 0, elapsed: 0 });
    expect(stepSecurity({ level: 1, elapsed: 0 }, 29.9).level).toBe(1);
    expect(stepSecurity({ level: 1, elapsed: 29 }, 1).level).toBe(2);
    expect(stepSecurity({ level: 2, elapsed: 30 }, 10).level).toBe(2);
  });
  it('accumulates bounded regolith from running and driving only outside', () => {
    const exposure = { speed: 8, driving: true, sprinting: false, outside: true, airlock: false };
    expect(stepVisorDust(0, 10, exposure)).toBeCloseTo(0.12);
    expect(stepVisorDust(0, 10, { ...exposure, driving: false, sprinting: true })).toBeCloseTo(0.2);
    expect(stepVisorDust(0.2, 10, { ...exposure, speed: 0 })).toBe(0.2);
    expect(stepVisorDust(0.2, 10, { ...exposure, driving: false })).toBe(0.2);
    expect(stepVisorDust(0.2, 10, { ...exposure, outside: false })).toBe(0.2);
    expect(stepVisorDust(0.2, 1e4, exposure)).toBe(1);
    expect(stepVisorDust(1, 1, { ...exposure, airlock: true })).toBe(0);
  });
  it('accumulates consistently across timestep sizes', () => {
    const exposure = { speed: 4, driving: false, sprinting: true, outside: true, airlock: false };
    let dust = 0;
    for (let i = 0; i < 600; i++) dust = stepVisorDust(dust, 1 / 60, exposure);
    expect(dust).toBeCloseTo(stepVisorDust(0, 10, exposure), 10);
  });
  it('shares the exact rendered airlock radius', () => {
    expect(canCycleAirlock(HABITAT_AIRLOCK)).toBe(true);
    expect(canCycleAirlock({ x: -22, z: -8 + HABITAT_AIRLOCK.radius })).toBe(true);
    expect(canCycleAirlock({ x: -22, z: -8 + HABITAT_AIRLOCK.radius + 0.01 })).toBe(false);
  });
  it('points relative to the camera with wrapped bearings and measured range', () => {
    const player = { x: 0, z: 0 };
    expect(navigationCue(player, { x: 0, z: -100 }, 0)).toEqual({ distance: 100, bearing: 0 });
    expect(navigationCue(player, { x: 100, z: 0 }, 0).bearing).toBeCloseTo(Math.PI / 2);
    expect(navigationCue(player, { x: -100, z: 0 }, Math.PI / 2).bearing).toBeCloseTo(0);
    expect(navigationCue(player, { x: 3, z: 4 }, 20 * Math.PI).distance).toBe(5);
    expect(navigationCue(player, player, 2).bearing).toBe(0);
  });
});
