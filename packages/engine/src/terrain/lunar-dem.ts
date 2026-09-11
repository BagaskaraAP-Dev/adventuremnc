import { LUNAR_RADIUS } from '@adventuremnc/shared';

export interface CraterSpec {
  x: number;
  z: number;
  radius: number;
  depth: number;
  rimHeight: number;
}

/**
 * Author-seeded primary craters in the 8x8 km Shackleton sector.
 * Center (0,0) represents the elevated rim crest.
 */
export const SHACKLETON_SECTOR_CRATERS: CraterSpec[] = [
  { x: 0, z: -1800, radius: 1400, depth: 320, rimHeight: 85 },
  { x: 2200, z: 1200, radius: 950, depth: 180, rimHeight: 48 },
  { x: -1900, z: 1600, radius: 1100, depth: 210, rimHeight: 56 },
  { x: -800, z: 2600, radius: 650, depth: 110, rimHeight: 32 },
  { x: 1500, z: -2500, radius: 800, depth: 140, rimHeight: 38 },
  { x: 400, z: 600, radius: 320, depth: 65, rimHeight: 18 },
  { x: -1200, z: -400, radius: 260, depth: 50, rimHeight: 14 },
  { x: 2800, z: -900, radius: 450, depth: 85, rimHeight: 24 },
  { x: -2600, z: -1900, radius: 500, depth: 95, rimHeight: 28 },
];

/**
 * Calculates deterministic elevation for any (x, z) point in the 8x8 km map.
 * Models regional rim ridge + crater cavity + ejecta blanket + micro-relief.
 */
export function sampleLunarElevation(x: number, z: number): number {
  // 1. Regional Shackleton ridge slope: slope rises towards south (z > 0)
  const regionalGradient = z * 0.035 - Math.abs(x) * 0.012;

  // 2. Curvature of lunar surface over 8 km relative to tangent plane
  // drop = (x^2 + z^2) / (2 * R)
  const distSq = x * x + z * z;
  const curvatureDrop = distSq / (2 * LUNAR_RADIUS);

  let elevation = 120 + regionalGradient - curvatureDrop;

  // 3. Impact crater morphology
  for (const crater of SHACKLETON_SECTOR_CRATERS) {
    const dx = x - crater.x;
    const dz = z - crater.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const r = crater.radius;

    if (dist < r) {
      // Inside crater cavity: parabolic bowl
      const normalizedR = dist / r;
      const cavity = crater.depth * (1.0 - normalizedR * normalizedR);
      elevation -= cavity;

      // Central peak for large craters (radius > 800m)
      if (r > 800 && dist < r * 0.25) {
        const peakFactor = 1.0 - dist / (r * 0.25);
        elevation += crater.depth * 0.28 * peakFactor * peakFactor;
      }
    } else if (dist < r * 2.8) {
      // Raised rim and ejecta blanket: exponential decay outward
      const rimDist = dist - r;
      const decayWidth = r * 0.45;
      const rimFactor = Math.exp(-rimDist / decayWidth);
      elevation += crater.rimHeight * rimFactor;
    }
  }

  // 4. Realistic Rolling Lunar Waves & Mare Swell Ridges ("gelombang secara rill")
  // Distance from habitat & rover bay complex (approx x: -19, z: -12)
  const distBase = Math.hypot(x + 19, z + 12);
  // Smoothly damp rolling waves right under the base pad (within 13m) so foundation stays rock solid & level
  const baseDamp = Math.min(1.0, Math.max(0.0, (distBase - 11) / 9));

  // Multi-directional rolling swells: primary rolling wave (~65m), cross swell (~40m), and rippling dunes (~18m)
  const waveAngle1 = 0.55;
  const u1 = x * Math.cos(waveAngle1) + z * Math.sin(waveAngle1);
  const v1 = -x * Math.sin(waveAngle1) + z * Math.cos(waveAngle1);

  const waveAngle2 = -0.65;
  const u2 = x * Math.cos(waveAngle2) + z * Math.sin(waveAngle2);

  const rollingWaves =
    (Math.sin(u1 * 0.095) * 3.2 + Math.cos(v1 * 0.065) * 2.4) +
    (Math.sin(u2 * 0.15) * 1.5 * Math.cos(u1 * 0.035)) +
    (Math.sin(x * 0.32 + z * 0.24) * 0.45);

  const microDetail =
    Math.sin(x * 0.024 + z * 0.018) * 1.2 +
    Math.cos(x * 0.065 - z * 0.052) * 0.6;

  return elevation + (rollingWaves * baseDamp) + microDetail;
}

/**
 * Numerical normal estimation at (x, z) via central differences.
 */
export function sampleLunarNormal(
  x: number,
  z: number,
  delta = 0.5
): [number, number, number] {
  const hL = sampleLunarElevation(x - delta, z);
  const hR = sampleLunarElevation(x + delta, z);
  const hD = sampleLunarElevation(x, z - delta);
  const hU = sampleLunarElevation(x, z + delta);

  const nx = (hL - hR) / (2 * delta);
  const nz = (hD - hU) / (2 * delta);
  const ny = 1.0;

  const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
  return [nx / len, ny / len, nz / len];
}
