import { describe, it, expect } from 'vitest';
import { horizonDistance } from '@adventuremnc/shared';
import {
  sampleLunarElevation,
  sampleLunarNormal,
  getActiveChunkDescriptors,
  calculateChunkLod,
  BASE_CHUNK_SIZE,
} from '../index';

describe('Lunar DEM and Morphology', () => {
  it('numerically verifies lunar horizon distance at eye height 1.7m', () => {
    const horizon = horizonDistance(1.7);
    // Analytic: sqrt(2 * 1,737,400 * 1.7) = sqrt(5,907,160) = 2430.465 m
    expect(horizon).toBeGreaterThan(2429);
    expect(horizon).toBeLessThan(2432);
  });

  it('samples deterministic elevation across multiple calls', () => {
    const elev1 = sampleLunarElevation(150, -320);
    const elev2 = sampleLunarElevation(150, -320);
    expect(elev1).toBe(elev2);
    expect(typeof elev1).toBe('number');
    expect(Number.isFinite(elev1)).toBe(true);
  });

  it('produces valid unit normals on lunar slope', () => {
    const [nx, ny, nz] = sampleLunarNormal(200, 300);
    const mag = Math.sqrt(nx * nx + ny * ny + nz * nz);
    expect(mag).toBeCloseTo(1.0, 5);
    expect(ny).toBeGreaterThan(0.5); // predominantly upward facing
  });

  it('selects LOD based on distance thresholds', () => {
    expect(calculateChunkLod(200)).toBe(0);
    expect(calculateChunkLod(800)).toBe(1);
    expect(calculateChunkLod(2000)).toBe(2);
  });

  it('retrieves active chunk descriptors around camera', () => {
    const chunks = getActiveChunkDescriptors(0, 0, 1200);
    expect(chunks.length).toBeGreaterThan(0);
    for (const chunk of chunks) {
      expect(chunk.size).toBe(BASE_CHUNK_SIZE);
      expect(chunk.resolution).toBeGreaterThanOrEqual(8);
      expect([0, 1, 2]).toContain(chunk.lod);
    }
  });
});
