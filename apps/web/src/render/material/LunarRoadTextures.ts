import * as THREE from 'three';

export interface LunarRoadPbrTextures {
  albedoMap: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
}

function createPermutation(): Uint8Array {
  const perm = new Uint8Array(512);
  for (let i = 0; i < 256; i++) perm[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor((Math.sin(i * 14.1234) * 43758.5453 % 1 + 1) * 0.5 * (i + 1));
    const tmp = perm[i]!;
    perm[i] = perm[j]!;
    perm[j] = tmp;
  }
  for (let i = 0; i < 256; i++) perm[256 + i] = perm[i]!;
  return perm;
}

const ROAD_PERM = createPermutation();

function roadNoise2D(x: number, y: number): number {
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  const xf = x - Math.floor(x);
  const yf = y - Math.floor(y);
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);

  const aa = ROAD_PERM[ROAD_PERM[X]! + Y]!;
  const ab = ROAD_PERM[ROAD_PERM[X]! + Y + 1]!;
  const ba = ROAD_PERM[ROAD_PERM[X + 1]! + Y]!;
  const bb = ROAD_PERM[ROAD_PERM[X + 1]! + Y + 1]!;

  const g1 = (aa % 8) / 8;
  const g2 = (ba % 8) / 8;
  const g3 = (ab % 8) / 8;
  const g4 = (bb % 8) / 8;

  const x1 = g1 * (1 - u) + g2 * u;
  const x2 = g3 * (1 - u) + g4 * u;
  return x1 * (1 - v) + x2 * v;
}

/**
 * Procedurally synthesizes high-definition PBR textures for compacted lunar transit roads.
 * Features:
 * - Dual rover tire track ruts (1.8m track width)
 * - Chevron / herringbone tire tread indentations
 * - Compacted dark basaltic roadbed core
 * - Pulverized light anorthosite edge berms
 * - Retroreflective sintered lane guide markers
 */
export function createLunarRoadTextures(width = 1024, height = 512): LunarRoadPbrTextures {
  const aCanvas = document.createElement('canvas');
  aCanvas.width = width;
  aCanvas.height = height;
  const aCtx = aCanvas.getContext('2d')!;
  const aImg = aCtx.createImageData(width, height);
  const aData = aImg.data;

  const nCanvas = document.createElement('canvas');
  nCanvas.width = width;
  nCanvas.height = height;
  const nCtx = nCanvas.getContext('2d')!;
  const nImg = nCtx.createImageData(width, height);
  const nData = nImg.data;

  const rCanvas = document.createElement('canvas');
  rCanvas.width = width;
  rCanvas.height = height;
  const rCtx = rCanvas.getContext('2d')!;
  const rImg = rCtx.createImageData(width, height);
  const rData = rImg.data;

  const leftRutCenter = 0.35;
  const rightRutCenter = 0.65;
  const rutHalfWidth = 0.085;

  for (let y = 0; y < height; y++) {
    const normY = y / height;
    const chevronCycle = (normY * 18.0) % 1.0;

    for (let x = 0; x < width; x++) {
      const normX = x / width;
      const idx = (y * width + x) * 4;

      const dLeft = Math.abs(normX - leftRutCenter);
      const dRight = Math.abs(normX - rightRutCenter);
      const inLeftRut = dLeft < rutHalfWidth;
      const inRightRut = dRight < rutHalfWidth;
      const inRut = inLeftRut || inRightRut;

      const noise = roadNoise2D(normX * 8.0, normY * 16.0) * 15;

      let r: number;
      let g: number;
      let b: number;
      let rough: number;
      let normNx = 0;
      let normNy = 0;

      if (inRut) {
        const rutDist = Math.min(dLeft, dRight) / rutHalfWidth;
        const rutDepth = Math.cos(rutDist * Math.PI * 0.5);

        const chevronX = inLeftRut ? (normX - leftRutCenter) / rutHalfWidth : -(normX - rightRutCenter) / rutHalfWidth;
        const chevronPattern = Math.cos((chevronCycle + Math.abs(chevronX) * 0.4) * Math.PI * 2.0);

        r = 56 - rutDepth * 14 + chevronPattern * 10;
        g = 54 - rutDepth * 14 + chevronPattern * 10;
        b = 52 - rutDepth * 14 + chevronPattern * 10;
        rough = 140 - Math.floor(rutDepth * 35);

        normNx = chevronX * rutDepth * 0.7;
        normNy = chevronPattern * 0.65;
      } else if (normX < 0.12 || normX > 0.88) {
        const bermEdge = normX < 0.12 ? (0.12 - normX) / 0.12 : (normX - 0.88) / 0.12;
        const bermFactor = Math.sin(bermEdge * Math.PI * 0.5);
        r = 108 + bermFactor * 35;
        g = 105 + bermFactor * 35;
        b = 102 + bermFactor * 35;
        rough = 245;
        normNx = (normX < 0.12 ? -1 : 1) * bermFactor * 0.55;
      } else {
        r = 74 + noise;
        g = 72 + noise;
        b = 70 + noise;
        rough = 185;
      }

      const isGuideX = Math.abs(normX - 0.22) < 0.008 || Math.abs(normX - 0.78) < 0.008;
      const isGuideY = (normY * 12.0) % 1.0 < 0.12;
      if (isGuideX && isGuideY) {
        r = 195;
        g = 210;
        b = 225;
        rough = 50;
      }

      aData[idx] = Math.max(0, Math.min(255, Math.round(r)));
      aData[idx + 1] = Math.max(0, Math.min(255, Math.round(g)));
      aData[idx + 2] = Math.max(0, Math.min(255, Math.round(b)));
      aData[idx + 3] = 255;

      rData[idx] = Math.max(0, Math.min(255, rough));
      rData[idx + 1] = Math.max(0, Math.min(255, rough));
      rData[idx + 2] = Math.max(0, Math.min(255, rough));
      rData[idx + 3] = 255;

      const len = Math.hypot(normNx, normNy, 1.0);
      nData[idx] = Math.round(((normNx / len) * 0.5 + 0.5) * 255);
      nData[idx + 1] = Math.round(((normNy / len) * 0.5 + 0.5) * 255);
      nData[idx + 2] = Math.round(((1.0 / len) * 0.5 + 0.5) * 255);
      nData[idx + 3] = 255;
    }
  }

  aCtx.putImageData(aImg, 0, 0);
  rCtx.putImageData(rImg, 0, 0);
  nCtx.putImageData(nImg, 0, 0);

  const albedoMap = new THREE.CanvasTexture(aCanvas);
  albedoMap.wrapS = THREE.RepeatWrapping;
  albedoMap.wrapT = THREE.RepeatWrapping;
  albedoMap.colorSpace = THREE.SRGBColorSpace;

  const normalMap = new THREE.CanvasTexture(nCanvas);
  normalMap.wrapS = THREE.RepeatWrapping;
  normalMap.wrapT = THREE.RepeatWrapping;

  const roughnessMap = new THREE.CanvasTexture(rCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;

  return { albedoMap, normalMap, roughnessMap };
}
