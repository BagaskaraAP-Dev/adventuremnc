export interface TerrainChunkKey {
  cx: number;
  cz: number;
}

export interface TerrainChunkDescriptor {
  key: string;
  cx: number;
  cz: number;
  worldX: number;
  worldZ: number;
  size: number;
  lod: number;
  resolution: number;
}

/**
 * 8x8 km world bounds centered at (0, 0): [-4000, 4000] in meters.
 */
export const WORLD_EXTENTS = 4000;
export const BASE_CHUNK_SIZE = 500; // 16x16 chunks across 8 km

/**
 * LOD distance thresholds in meters:
 * LOD 0 (High, 32x32 vertices): 0 - 600m
 * LOD 1 (Medium, 16x16 vertices): 600m - 1500m
 * LOD 2 (Low, 8x8 vertices): 1500m - 3000m
 */
export const LOD_THRESHOLD_NEAR = 600;
export const LOD_THRESHOLD_MID = 1500;
export const LOD_THRESHOLD_FAR = 3000;

export const RESOLUTION_LOD0 = 32;
export const RESOLUTION_LOD1 = 16;
export const RESOLUTION_LOD2 = 8;

export function getChunkKey(cx: number, cz: number): string {
  return `${cx}_${cz}`;
}

export function calculateChunkLod(dist: number): number {
  if (dist < LOD_THRESHOLD_NEAR) return 0;
  if (dist < LOD_THRESHOLD_MID) return 1;
  return 2;
}

export function getResolutionForLod(lod: number): number {
  if (lod === 0) return RESOLUTION_LOD0;
  if (lod === 1) return RESOLUTION_LOD1;
  return RESOLUTION_LOD2;
}

/**
 * Determines which chunks around a camera position (camX, camZ) should be active.
 * Culls chunks outside the 8x8 km world bounds or beyond visibility distance (~3.2 km).
 */
export function getActiveChunkDescriptors(
  camX: number,
  camZ: number,
  maxVisibility = 3200
): TerrainChunkDescriptor[] {
  const chunks: TerrainChunkDescriptor[] = [];
  const minCx = Math.floor((-WORLD_EXTENTS) / BASE_CHUNK_SIZE);
  const maxCx = Math.ceil(WORLD_EXTENTS / BASE_CHUNK_SIZE) - 1;

  const minCz = Math.floor((-WORLD_EXTENTS) / BASE_CHUNK_SIZE);
  const maxCz = Math.ceil(WORLD_EXTENTS / BASE_CHUNK_SIZE) - 1;

  for (let cx = minCx; cx <= maxCx; cx++) {
    for (let cz = minCz; cz <= maxCz; cz++) {
      const centerX = (cx + 0.5) * BASE_CHUNK_SIZE;
      const centerZ = (cz + 0.5) * BASE_CHUNK_SIZE;

      const dx = centerX - camX;
      const dz = centerZ - camZ;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist <= maxVisibility) {
        const lod = calculateChunkLod(dist);
        chunks.push({
          key: getChunkKey(cx, cz),
          cx,
          cz,
          worldX: cx * BASE_CHUNK_SIZE,
          worldZ: cz * BASE_CHUNK_SIZE,
          size: BASE_CHUNK_SIZE,
          lod,
          resolution: getResolutionForLod(lod),
        });
      }
    }
  }

  return chunks;
}
