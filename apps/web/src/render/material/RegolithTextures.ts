import * as THREE from 'three';
import { createLunarRoadTextures, LunarRoadPbrTextures } from './LunarRoadTextures';

export interface RegolithPbrTextures {
  albedoMap: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  detailNormalMap: THREE.CanvasTexture;
  macroNoiseMap: THREE.CanvasTexture;
  road: LunarRoadPbrTextures;
}

function createPermutationTable(): Uint8Array {
  const perm = new Uint8Array(512);
  for (let i = 0; i < 256; i++) perm[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor((Math.sin(i * 12.9898) * 43758.5453 % 1 + 1) * 0.5 * (i + 1));
    const tmp = perm[i]!;
    perm[i] = perm[j]!;
    perm[j] = tmp;
  }
  for (let i = 0; i < 256; i++) perm[256 + i] = perm[i]!;
  return perm;
}

const PERM = createPermutationTable();

function seamlessNoise2D(x: number, y: number): number {
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  const xf = x - Math.floor(x);
  const yf = y - Math.floor(y);
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);

  const aa = PERM[PERM[X]! + Y]!;
  const ab = PERM[PERM[X]! + Y + 1]!;
  const ba = PERM[PERM[X + 1]! + Y]!;
  const bb = PERM[PERM[X + 1]! + Y + 1]!;

  const g1 = (aa % 8) / 8;
  const g2 = (ba % 8) / 8;
  const g3 = (ab % 8) / 8;
  const g4 = (bb % 8) / 8;

  const x1 = g1 * (1 - u) + g2 * u;
  const x2 = g3 * (1 - u) + g4 * u;
  return x1 * (1 - v) + x2 * v;
}

function generateRegolithBase(size: number): {
  albedo: HTMLCanvasElement;
  normal: HTMLCanvasElement;
  roughness: HTMLCanvasElement;
} {
  const albedoCanvas = document.createElement('canvas');
  albedoCanvas.width = size;
  albedoCanvas.height = size;
  const aCtx = albedoCanvas.getContext('2d')!;
  const aImg = aCtx.createImageData(size, size);
  const aData = aImg.data;

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = size;
  roughCanvas.height = size;
  const rCtx = roughCanvas.getContext('2d')!;
  const rImg = rCtx.createImageData(size, size);
  const rData = rImg.data;

  const heightMap = new Float32Array(size * size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = y * size + x;
      const nx = (x / size) * 8.0;
      const ny = (y / size) * 8.0;

      const n1 = seamlessNoise2D(nx, ny);
      const n2 = seamlessNoise2D(nx * 2.0, ny * 2.0) * 0.5;
      const n3 = seamlessNoise2D(nx * 4.0, ny * 4.0) * 0.25;
      const n4 = seamlessNoise2D(nx * 16.0, ny * 16.0) * 0.125;
      const totalNoise = (n1 + n2 + n3 + n4) / 1.875;

      heightMap[idx] = totalNoise;

      const baseGray = 82 + totalNoise * 30;
      const pIdx = idx * 4;
      aData[pIdx] = Math.min(255, baseGray * 1.02);
      aData[pIdx + 1] = Math.min(255, baseGray * 0.99);
      aData[pIdx + 2] = Math.min(255, baseGray * 0.96);
      aData[pIdx + 3] = 255;

      rData[pIdx] = 238;
      rData[pIdx + 1] = 238;
      rData[pIdx + 2] = 238;
      rData[pIdx + 3] = 255;
    }
  }

  // Micro-craters with raised ejecta rims
  const craterCount = 190;
  for (let c = 0; c < craterCount; c++) {
    const seed = c * 31.4159;
    const cx = Math.floor((Math.sin(seed) * 0.5 + 0.5) * size);
    const cy = Math.floor((Math.cos(seed * 1.3) * 0.5 + 0.5) * size);
    const radius = 4 + Math.floor(Math.pow(Math.sin(seed * 2.7) * 0.5 + 0.5, 2.5) * 26);
    const depth = 0.35 + (Math.cos(seed * 0.7) * 0.5 + 0.5) * 0.4;

    for (let dy = -radius * 2; dy <= radius * 2; dy++) {
      for (let dx = -radius * 2; dx <= radius * 2; dx++) {
        const dist = Math.hypot(dx, dy);
        if (dist > radius * 1.8) continue;

        const wx = (cx + dx + size) % size;
        const wy = (cy + dy + size) % size;
        const idx = wy * size + wx;
        const pIdx = idx * 4;

        const normDist = dist / radius;
        const curA0 = aData[pIdx] ?? 82;
        const curA1 = aData[pIdx + 1] ?? 80;
        const curA2 = aData[pIdx + 2] ?? 78;
        const curH = heightMap[idx] ?? 0;

        if (normDist <= 1.0) {
          const bowl = Math.cos(normDist * (Math.PI / 2)) * depth;
          heightMap[idx] = Math.max(0, curH - bowl);
          aData[pIdx] = Math.max(38, curA0 - bowl * 38);
          aData[pIdx + 1] = Math.max(36, curA1 - bowl * 38);
          aData[pIdx + 2] = Math.max(34, curA2 - bowl * 38);
        } else if (normDist <= 1.6) {
          const rimFactor = Math.sin((normDist - 1.0) * (Math.PI / 0.6)) * (depth * 0.35);
          heightMap[idx] = curH + rimFactor;
          aData[pIdx] = Math.min(168, curA0 + rimFactor * 70);
          aData[pIdx + 1] = Math.min(164, curA1 + rimFactor * 70);
          aData[pIdx + 2] = Math.min(158, curA2 + rimFactor * 70);
        }
      }
    }
  }

  // Embedded breccia rocks & vitreous impact beads
  const rockCount = 450;
  for (let r = 0; r < rockCount; r++) {
    const seed = r * 17.1828;
    const rx = Math.floor((Math.sin(seed * 1.9) * 0.5 + 0.5) * size);
    const ry = Math.floor((Math.cos(seed * 2.3) * 0.5 + 0.5) * size);
    const rockRadius = 2 + Math.floor(Math.pow(Math.sin(seed * 3.1) * 0.5 + 0.5, 3.0) * 11);
    const rockHeight = 0.45 + (Math.sin(seed * 4.7) * 0.5 + 0.5) * 0.55;
    const rockTone = 120 + Math.floor((Math.sin(seed * 5.3) * 0.5 + 0.5) * 60);

    for (let dy = -rockRadius; dy <= rockRadius; dy++) {
      for (let dx = -rockRadius; dx <= rockRadius; dx++) {
        const dist = Math.hypot(dx, dy);
        if (dist > rockRadius) continue;

        const wx = (rx + dx + size) % size;
        const wy = (ry + dy + size) % size;
        const idx = wy * size + wx;
        const pIdx = idx * 4;

        const curH = heightMap[idx] ?? 0;
        const dome = Math.sqrt(1.0 - Math.pow(dist / rockRadius, 2.0)) * rockHeight;
        heightMap[idx] = curH + dome;

        aData[pIdx] = Math.min(235, rockTone + Math.floor(dome * 35));
        aData[pIdx + 1] = Math.min(230, rockTone + Math.floor(dome * 35));
        aData[pIdx + 2] = Math.min(225, rockTone + Math.floor(dome * 35));

        rData[pIdx] = 120;
        rData[pIdx + 1] = 120;
        rData[pIdx + 2] = 120;
      }
    }
  }

  // Sobel Normal Map
  const normalCanvas = document.createElement('canvas');
  normalCanvas.width = size;
  normalCanvas.height = size;
  const nCtx = normalCanvas.getContext('2d')!;
  const nImg = nCtx.createImageData(size, size);
  const nData = nImg.data;
  const normalStrength = 4.8;

  for (let y = 0; y < size; y++) {
    const ym1 = (y - 1 + size) % size;
    const yp1 = (y + 1) % size;
    for (let x = 0; x < size; x++) {
      const xm1 = (x - 1 + size) % size;
      const xp1 = (x + 1) % size;

      const tl = heightMap[ym1 * size + xm1] ?? 0;
      const t  = heightMap[ym1 * size + x] ?? 0;
      const tr = heightMap[ym1 * size + xp1] ?? 0;
      const l  = heightMap[y * size + xm1] ?? 0;
      const r  = heightMap[y * size + xp1] ?? 0;
      const bl = heightMap[yp1 * size + xm1] ?? 0;
      const b  = heightMap[yp1 * size + x] ?? 0;
      const br = heightMap[yp1 * size + xp1] ?? 0;

      const dx = (tr + 2.0 * r + br) - (tl + 2.0 * l + bl);
      const dy = (bl + 2.0 * b + br) - (tl + 2.0 * t + tr);

      let nx = -dx * normalStrength;
      let ny = -dy * normalStrength;
      let nz = 1.0;
      const len = Math.hypot(nx, ny, nz);
      nx /= len;
      ny /= len;
      nz /= len;

      const pIdx = (y * size + x) * 4;
      nData[pIdx] = Math.round((nx * 0.5 + 0.5) * 255);
      nData[pIdx + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      nData[pIdx + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      nData[pIdx + 3] = 255;
    }
  }

  aCtx.putImageData(aImg, 0, 0);
  rCtx.putImageData(rImg, 0, 0);
  nCtx.putImageData(nImg, 0, 0);

  return { albedo: albedoCanvas, normal: normalCanvas, roughness: roughCanvas };
}

function generateMicroDetailNormal(size: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  const data = img.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx1 = seamlessNoise2D((x / size) * 32.0, (y / size) * 32.0);
      const nx2 = seamlessNoise2D((x / size) * 64.0 + 5.2, (y / size) * 64.0 + 3.7) * 0.5;
      const h = (nx1 + nx2) / 1.5;

      const pIdx = (y * size + x) * 4;
      const gx = (h - 0.5) * 2.2;
      const gy = (seamlessNoise2D((x / size) * 32.0 + 8.1, (y / size) * 32.0 + 4.9) - 0.5) * 2.2;
      let nx = -gx;
      let ny = -gy;
      let nz = 1.0;
      const len = Math.hypot(nx, ny, nz);
      nx /= len;
      ny /= len;
      nz /= len;

      data[pIdx] = Math.round((nx * 0.5 + 0.5) * 255);
      data[pIdx + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      data[pIdx + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      data[pIdx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

function generateMacroNoise(size: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  const data = img.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n1 = seamlessNoise2D((x / size) * 2.0, (y / size) * 2.0);
      const n2 = seamlessNoise2D((x / size) * 4.0 + 2.1, (y / size) * 4.0 + 6.3) * 0.5;
      const val = Math.round(128 + ((n1 + n2) / 1.5 - 0.5) * 65);

      const pIdx = (y * size + x) * 4;
      data[pIdx] = val;
      data[pIdx + 1] = val;
      data[pIdx + 2] = val;
      data[pIdx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

function configureCanvasTexture(canvas: HTMLCanvasElement, srgb = false): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createRegolithTextures(): RegolithPbrTextures {
  const base = generateRegolithBase(1024);
  const detail = generateMicroDetailNormal(512);
  const macro = generateMacroNoise(512);
  const road = createLunarRoadTextures(1024, 512);

  return {
    albedoMap: configureCanvasTexture(base.albedo, true),
    normalMap: configureCanvasTexture(base.normal),
    roughnessMap: configureCanvasTexture(base.roughness),
    detailNormalMap: configureCanvasTexture(detail),
    macroNoiseMap: configureCanvasTexture(macro),
    road,
  };
}
