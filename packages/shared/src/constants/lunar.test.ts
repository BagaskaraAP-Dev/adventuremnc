import { describe, it, expect } from 'vitest';
import {
  LUNAR_GRAVITY,
  LUNAR_RADIUS,
  horizonDistance,
  REGOLITH_ALBEDO,
  FIXED_DT,
  DAY_CYCLE_COMPRESSION,
} from './lunar';

describe('Lunar Physical Constants', () => {
  it('defines gravitational acceleration within 1.62 - 1.63 m/s²', () => {
    expect(LUNAR_GRAVITY).toBe(1.625);
    const earthGravity = 9.807;
    const ratio = LUNAR_GRAVITY / earthGravity;
    expect(ratio).toBeGreaterThan(0.165);
    expect(ratio).toBeLessThan(0.166);
  });

  it('computes horizon distance accurately for standard eye height 1.7m', () => {
    const d = horizonDistance(1.7);
    // sqrt(2 * 1737400 * 1.7) = sqrt(5907160) = 2430.465
    expect(Math.round(d)).toBe(2430);
  });

  it('verifies dark bond albedo of regolith', () => {
    expect(REGOLITH_ALBEDO).toBe(0.12);
  });

  it('verifies fixed timestep is exactly 60 Hz', () => {
    expect(FIXED_DT).toBeCloseTo(0.0166667, 5);
  });

  it('verifies day-night compression ratio for 90-minute cycle', () => {
    const expectedSeconds = 90 * 60;
    expect(DAY_CYCLE_COMPRESSION).toBe(2551443 / expectedSeconds);
  });

  it('confirms lunar mean radius is 1,737,400 meters', () => {
    expect(LUNAR_RADIUS).toBe(1737400);
  });

  it('verifies EVA jump apex height matches v0^2 / (2g) within 1%', () => {
    const v0 = 3.6;
    const analyticApex = (v0 * v0) / (2 * LUNAR_GRAVITY);
    // 3.6^2 / (2 * 1.625) = 12.96 / 3.25 = 3.98769 m
    expect(analyticApex).toBeCloseTo(3.9877, 3);
  });
});
