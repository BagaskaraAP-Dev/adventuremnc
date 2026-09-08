export { LUNAR_ROAD_WIDTH, LUNAR_ROAD_SHOULDER_WIDTH } from '@adventuremnc/shared';
import { LUNAR_ROAD_WIDTH, LUNAR_ROAD_SHOULDER_WIDTH } from '@adventuremnc/shared';

export interface RoadWaypoint {
  x: number;
  z: number;
  name?: string;
}

export interface RoadSegmentDef {
  startX: number;
  startZ: number;
  endX: number;
  endZ: number;
  width: number;
  name: string;
}

export interface RoadDistanceResult {
  distance: number;
  lateralOffset: number;
  t: number;
  segmentIndex: number;
  roadWidth: number;
}

/**
 * Route 01: MNC Primary Haul Highway connecting Habitat Base & Rover Bay
 * through the saddle pass towards the Shackleton Mining Survey Camp.
 */
export const ROUTE_01_WAYPOINTS: RoadWaypoint[] = [
  { x: -15, z: -4.5, name: 'Rover Bay 01 Apron' },
  { x: -15, z: 28, name: 'Base Perimeter Junction' },
  { x: 35, z: 75, name: 'North Ridge Saddle' },
  { x: 110, z: 150, name: 'Crater Vista Pass' },
  { x: 210, z: 250, name: 'Mining Waypoint Alpha' },
  { x: 340, z: 390, name: 'Surveyor Ice Core Site' },
  { x: 480, z: 560, name: 'Shackleton Rim Terminal' },
];

/**
 * Route 02: West Radio Relay & Solar Array Transit Spur.
 */
export const ROUTE_02_WAYPOINTS: RoadWaypoint[] = [
  { x: -15, z: 28, name: 'Base Perimeter Junction' },
  { x: -75, z: 55, name: 'West Valley Turnout' },
  { x: -160, z: 105, name: 'Radio Relay Mast Pass' },
  { x: -270, z: 175, name: 'Deep Crater Rim Terminal' },
];

function buildSegments(waypoints: RoadWaypoint[], routePrefix: string): RoadSegmentDef[] {
  const segments: RoadSegmentDef[] = [];
  for (let i = 0; i < waypoints.length - 1; i++) {
    const p1 = waypoints[i]!;
    const p2 = waypoints[i + 1]!;
    segments.push({
      startX: p1.x,
      startZ: p1.z,
      endX: p2.x,
      endZ: p2.z,
      width: LUNAR_ROAD_WIDTH,
      name: `${routePrefix} Seg ${i + 1}`,
    });
  }
  return segments;
}

export const LUNAR_ROAD_SEGMENTS: RoadSegmentDef[] = [
  ...buildSegments(ROUTE_01_WAYPOINTS, 'MNC Route 01'),
  ...buildSegments(ROUTE_02_WAYPOINTS, 'MNC Route 02'),
];

/**
 * Calculates perpendicular distance and lateral offset from any (x, z) point
 * to the nearest lunar road segment.
 */
export function getDistanceToRoad(x: number, z: number): RoadDistanceResult {
  let minDistance = Number.POSITIVE_INFINITY;
  let bestLateral = 0;
  let bestT = 0;
  let bestSegIndex = -1;
  let bestWidth = LUNAR_ROAD_WIDTH;

  for (let i = 0; i < LUNAR_ROAD_SEGMENTS.length; i++) {
    const seg = LUNAR_ROAD_SEGMENTS[i]!;
    const dx = seg.endX - seg.startX;
    const dz = seg.endZ - seg.startZ;
    const lenSq = dx * dx + dz * dz;

    if (lenSq < 0.0001) continue;

    const px = x - seg.startX;
    const pz = z - seg.startZ;
    const t = Math.max(0, Math.min(1, (px * dx + pz * dz) / lenSq));

    const projX = seg.startX + t * dx;
    const projZ = seg.startZ + t * dz;
    const dist = Math.hypot(x - projX, z - projZ);

    if (dist < minDistance) {
      minDistance = dist;
      bestT = t;
      bestSegIndex = i;
      bestWidth = seg.width;

      const segLen = Math.sqrt(lenSq);
      const dirX = dx / segLen;
      const dirZ = dz / segLen;
      const perpX = -dirZ;
      const perpZ = dirX;
      bestLateral = px * perpX + pz * perpZ;
    }
  }

  return {
    distance: minDistance,
    lateralOffset: bestLateral,
    t: bestT,
    segmentIndex: bestSegIndex,
    roadWidth: bestWidth,
  };
}

/**
 * Returns a roadbed smoothing factor (0.0 off-road to 1.0 at road centerline)
 * used to grade rolling lunar swells along active transit corridors.
 */
export function getRoadGradeSmoothing(x: number, z: number): number {
  const { distance, roadWidth } = getDistanceToRoad(x, z);
  const halfWidth = roadWidth * 0.5;
  const shoulder = LUNAR_ROAD_SHOULDER_WIDTH;

  if (distance >= halfWidth + shoulder) {
    return 0.0;
  }
  if (distance <= halfWidth * 0.4) {
    return 1.0;
  }

  const span = halfWidth * 0.6 + shoulder;
  const t = Math.max(0, Math.min(1, (distance - halfWidth * 0.4) / span));
  return 1.0 - (t * t * (3 - 2 * t));
}
