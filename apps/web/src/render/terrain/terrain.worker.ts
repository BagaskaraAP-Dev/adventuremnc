import { sampleLunarElevation, sampleLunarNormal } from '@adventuremnc/engine';

export interface ChunkBuildRequest {
  key: string;
  cx: number;
  cz: number;
  worldX: number;
  worldZ: number;
  size: number;
  resolution: number;
}

export interface ChunkBuildResponse {
  key: string;
  cx: number;
  cz: number;
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  indices: Uint32Array;
}

self.onmessage = (e: MessageEvent<ChunkBuildRequest>) => {
  const { key, cx, cz, worldX, worldZ, size, resolution } = e.data;

  const segCount = resolution;
  const vertCount = (segCount + 1) * (segCount + 1);
  const quadCount = segCount * segCount;
  const indexCount = quadCount * 6;

  const positions = new Float32Array(vertCount * 3);
  const normals = new Float32Array(vertCount * 3);
  const uvs = new Float32Array(vertCount * 2);
  const indices = new Uint32Array(indexCount);

  let vIdx = 0;
  let uvIdx = 0;

  for (let j = 0; j <= segCount; j++) {
    const fracZ = j / segCount;
    const z = worldZ + fracZ * size;

    for (let i = 0; i <= segCount; i++) {
      const fracX = i / segCount;
      const x = worldX + fracX * size;
      const y = sampleLunarElevation(x, z);

      positions[vIdx] = x;
      positions[vIdx + 1] = y;
      positions[vIdx + 2] = z;

      const [nx, ny, nz] = sampleLunarNormal(x, z);
      normals[vIdx] = nx;
      normals[vIdx + 1] = ny;
      normals[vIdx + 2] = nz;

      uvs[uvIdx] = x * 0.125;
      uvs[uvIdx + 1] = z * 0.125;

      vIdx += 3;
      uvIdx += 2;
    }
  }

  let iIdx = 0;
  for (let j = 0; j < segCount; j++) {
    for (let i = 0; i < segCount; i++) {
      const row1 = j * (segCount + 1);
      const row2 = (j + 1) * (segCount + 1);

      const a = row1 + i;
      const b = row1 + i + 1;
      const c = row2 + i;
      const d = row2 + i + 1;

      indices[iIdx++] = a;
      indices[iIdx++] = c;
      indices[iIdx++] = b;

      indices[iIdx++] = b;
      indices[iIdx++] = c;
      indices[iIdx++] = d;
    }
  }

  const response: ChunkBuildResponse = {
    key,
    cx,
    cz,
    positions,
    normals,
    uvs,
    indices,
  };

  self.postMessage(response, {
    transfer: [
      positions.buffer,
      normals.buffer,
      uvs.buffer,
      indices.buffer,
    ],
  });
};
