import * as THREE from 'three';

function createOffscreenCanvas(width: number, height: number): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

/**
 * High-definition thermal protection system (TPS) ceramic tile texture + bump map.
 * Emulates Space Shuttle / Starship / Orion ceramic heatshield tiles with realistic
 * sealant seams, corner pins, ceramic surface grain, and technical stencils.
 */
export function createThermalTileTextures(repeatX = 16, repeatY = 4): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const w = 1024;
  const h = 1024;
  const colorCanvas = createOffscreenCanvas(w, h)!;
  const bumpCanvas = createOffscreenCanvas(w, h)!;

  const ctx = colorCanvas.getContext('2d')!;
  const bCtx = bumpCanvas.getContext('2d')!;

  // Dark silicon carbide sealant base
  ctx.fillStyle = '#16191f';
  ctx.fillRect(0, 0, w, h);
  bCtx.fillStyle = '#000000';
  bCtx.fillRect(0, 0, w, h);

  const cols = 8;
  const rows = 8;
  const tileW = w / cols;
  const tileH = h / rows;
  const seam = 4;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * tileW + seam;
      const y = r * tileH + seam;
      const tw = tileW - seam * 2;
      const th = tileH - seam * 2;

      // Realistic tile-to-tile subtle gray tone variation
      const seed = Math.sin(r * 12.9898 + c * 78.233) * 43758.5453;
      const variation = (seed - Math.floor(seed)) * 30 - 15;
      const baseVal = Math.round(210 + variation);

      // Base tile surface with ceramic micro-grain
      ctx.fillStyle = `rgb(${baseVal}, ${baseVal + 1}, ${baseVal + 3})`;
      ctx.fillRect(x, y, tw, th);

      // Micro-texture grain on tile
      for (let g = 0; g < 40; g++) {
        const gx = x + Math.random() * tw;
        const gy = y + Math.random() * th;
        const gAlpha = 0.04 + Math.random() * 0.06;
        ctx.fillStyle = Math.random() > 0.5 ? `rgba(255,255,255,${gAlpha})` : `rgba(0,0,0,${gAlpha})`;
        ctx.fillRect(gx, gy, 2, 2);
      }

      // Tile surface chamfer bevel
      ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
      ctx.fillRect(x, y, tw, 3);
      ctx.fillRect(x, y, 3, th);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.fillRect(x, y + th - 3, tw, 3);
      ctx.fillRect(x + tw - 3, y, 3, th);

      // Bump map: raised tile body, sunken sealant seams
      bCtx.fillStyle = '#cccccc';
      bCtx.fillRect(x, y, tw, th);
      bCtx.fillStyle = '#ffffff';
      bCtx.fillRect(x + 3, y + 3, tw - 6, th - 6);

      // Ceramic corner attachment pins
      const pinOffset = 8;
      const pinCoords: Array<[number, number]> = [
        [x + pinOffset, y + pinOffset],
        [x + tw - pinOffset, y + pinOffset],
        [x + pinOffset, y + th - pinOffset],
        [x + tw - pinOffset, y + th - pinOffset],
      ];

      for (const [px, py] of pinCoords) {
        ctx.fillStyle = '#64748b';
        ctx.beginPath();
        ctx.arc(px, py, 2.5, 0, Math.PI * 2);
        ctx.fill();

        bCtx.fillStyle = '#444444';
        bCtx.beginPath();
        bCtx.arc(px, py, 3.5, 0, Math.PI * 2);
        bCtx.fill();
        bCtx.fillStyle = '#ffffff';
        bCtx.beginPath();
        bCtx.arc(px, py, 1.5, 0, Math.PI * 2);
        bCtx.fill();
      }

      // Technical serial stencils on select tiles
      if ((r + c) % 3 === 0) {
        ctx.fillStyle = 'rgba(30, 41, 59, 0.7)';
        ctx.font = 'bold 11px monospace';
        ctx.fillText(`TPS-${r}${c} // 1420K`, x + 12, y + th - 14);
      }
    }
  }

  // Major NASA/ESA-style technical stencils across header
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.font = 'bold 14px monospace';
  ctx.fillText('LUNAR BASE ARTEMIS // PRESSURIZED HULL MOD-01', 35, 60);
  ctx.fillText('BERYLLIUM-AL ALLOY SHIELD // MAX 120 kPa', 35, 185);
  ctx.fillText('CRYO MANIFOLD INTERCONNECT // NOMINAL', 550, 60);
  ctx.fillText('CAUTION: HIGH VOLTAGE SOLAR BUS 400V', 550, 440);
  ctx.fillText('NO STEP // EVA TETHER ANCHOR 0.5m', 280, 820);

  const map = new THREE.CanvasTexture(colorCanvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(repeatX, repeatY);

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(repeatX, repeatY);

  return { map, bumpMap };
}

/**
 * Diamond-quilted acoustic padded interior wall texture + bump map.
 * Scaled and styled after modern space station modules (ISS Columbus, Destiny, Gateway).
 */
export function createQuiltedInteriorTextures(repeatX = 20, repeatY = 3): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const w = 1024;
  const h = 1024;
  const colorCanvas = createOffscreenCanvas(w, h)!;
  const bumpCanvas = createOffscreenCanvas(w, h)!;

  const ctx = colorCanvas.getContext('2d')!;
  const bCtx = bumpCanvas.getContext('2d')!;

  // Clean, cozy off-white space capsule fabric
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(0, 0, w, h);
  bCtx.fillStyle = '#777777';
  bCtx.fillRect(0, 0, w, h);

  const step = 128;

  // Diamond quilt double-stitching lines
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 2;
  bCtx.strokeStyle = '#1e293b';
  bCtx.lineWidth = 4;

  for (let d = -w; d < w * 2; d += step) {
    ctx.beginPath();
    ctx.moveTo(d, 0);
    ctx.lineTo(d + h, h);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(d, h);
    ctx.lineTo(d + h, 0);
    ctx.stroke();

    bCtx.beginPath();
    bCtx.moveTo(d, 0);
    bCtx.lineTo(d + h, h);
    bCtx.stroke();

    bCtx.beginPath();
    bCtx.moveTo(d, h);
    bCtx.lineTo(d + h, 0);
    bCtx.stroke();
  }

  // Soft pillow cushions with radial highlights and deep tufted buttons
  for (let x = 0; x < w; x += step) {
    for (let y = 0; y < h; y += step) {
      const cx = x + step / 2;
      const cy = y + (x % (step * 2) === 0 ? step / 2 : 0);

      // Pillow radial gradient for cushion look
      const grad = ctx.createRadialGradient(cx, cy, 4, cx, cy, step * 0.42);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.65, '#e2e8f0');
      grad.addColorStop(1, 'rgba(148, 163, 184, 0.35)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, step * 0.42, 0, Math.PI * 2);
      ctx.fill();

      // Bump map pillow dome
      const bGrad = bCtx.createRadialGradient(cx, cy, 4, cx, cy, step * 0.45);
      bGrad.addColorStop(0, '#ffffff');
      bGrad.addColorStop(0.7, '#a0aec0');
      bGrad.addColorStop(1, '#334155');
      bCtx.fillStyle = bGrad;
      bCtx.beginPath();
      bCtx.arc(cx, cy, step * 0.45, 0, Math.PI * 2);
      bCtx.fill();

      // Tufted anchor button
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();

      bCtx.fillStyle = '#0f172a';
      bCtx.beginPath();
      bCtx.arc(x, y, 5, 0, Math.PI * 2);
      bCtx.fill();
    }
  }

  // Technical markings
  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 12px monospace';
  ctx.fillText('ACOUSTIC NOMEX FLIGHT SPEC // CLASS-1', 40, 60);
  ctx.fillText('CREW BERTH 01-A // PRESSURIZED', 560, 60);
  ctx.fillText('EMERGENCY O2 LINE PANEL ACCESS', 80, 560);
  ctx.fillText('ECLSS RETURN DUCT // CABIN AIRFLOW', 560, 560);

  const map = new THREE.CanvasTexture(colorCanvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(repeatX, repeatY);

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(repeatX, repeatY);

  return { map, bumpMap };
}

/**
 * Modular hexagonal composite floor plating + bump map.
 * Clean, seamless, high-tech non-slip deck with recessed bevels.
 */
export function createHexFloorTextures(repeatX = 12, repeatY = 12): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
} {
  const size = 512;
  const colorCanvas = createOffscreenCanvas(size, size)!;
  const bumpCanvas = createOffscreenCanvas(size, size)!;
  const roughCanvas = createOffscreenCanvas(size, size)!;

  const ctx = colorCanvas.getContext('2d')!;
  const bCtx = bumpCanvas.getContext('2d')!;
  const rCtx = roughCanvas.getContext('2d')!;

  // Deep matte graphite base
  ctx.fillStyle = '#1e242c';
  ctx.fillRect(0, 0, size, size);
  bCtx.fillStyle = '#222222';
  bCtx.fillRect(0, 0, size, size);
  rCtx.fillStyle = '#cccccc';
  rCtx.fillRect(0, 0, size, size);

  const hexRadius = 36;
  const h = hexRadius * Math.sqrt(3);

  // Draw hexagonal tile grid
  for (let row = -1; row < 14; row++) {
    for (let col = -1; col < 12; col++) {
      const cx = col * hexRadius * 1.5;
      const cy = row * h + (col % 2 === 0 ? 0 : h / 2);

      // Tile body
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i;
        const x = cx + (hexRadius - 2) * Math.cos(angle);
        const y = cy + (hexRadius - 2) * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();

      // Hex tile subtle shade
      const tileShade = 36 + Math.floor((Math.sin(col * 3.1 + row * 7.7) * 0.5 + 0.5) * 12);
      ctx.fillStyle = `rgb(${tileShade}, ${tileShade + 2}, ${tileShade + 5})`;
      ctx.fill();

      // Hex tile edge bevel
      ctx.strokeStyle = '#333e4d';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Bump map tile
      bCtx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i;
        const x = cx + (hexRadius - 2) * Math.cos(angle);
        const y = cy + (hexRadius - 2) * Math.sin(angle);
        if (i === 0) bCtx.moveTo(x, y);
        else bCtx.lineTo(x, y);
      }
      bCtx.closePath();
      bCtx.fillStyle = '#ffffff';
      bCtx.fill();
      bCtx.strokeStyle = '#000000';
      bCtx.lineWidth = 3;
      bCtx.stroke();

      // Hex center non-slip stippling
      rCtx.fillStyle = '#888888';
      rCtx.beginPath();
      rCtx.arc(cx, cy, hexRadius * 0.5, 0, Math.PI * 2);
      rCtx.fill();
    }
  }

  const map = new THREE.CanvasTexture(colorCanvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(repeatX, repeatY);

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(repeatX, repeatY);

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.repeat.set(repeatX, repeatY);

  return { map, bumpMap, roughnessMap };
}

/**
 * Crinkled Apollo/Artemis gold multi-layer insulation (MLI) foil texture + bump map.
 */
export function createGoldMliTextures(repeatX = 4, repeatY = 2): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const w = 512;
  const h = 512;
  const colorCanvas = createOffscreenCanvas(w, h)!;
  const bumpCanvas = createOffscreenCanvas(w, h)!;

  const ctx = colorCanvas.getContext('2d')!;
  const bCtx = bumpCanvas.getContext('2d')!;

  // Deep rich gold base
  ctx.fillStyle = '#d97706';
  ctx.fillRect(0, 0, w, h);
  bCtx.fillStyle = '#666666';
  bCtx.fillRect(0, 0, w, h);

  // Multi-frequency crinkle wrinkles
  for (let i = 0; i < 120; i++) {
    const x1 = Math.random() * w;
    const y1 = Math.random() * h;
    const len = 25 + Math.random() * 90;
    const angle = Math.random() * Math.PI * 2;
    const x2 = x1 + Math.cos(angle) * len;
    const y2 = y1 + Math.sin(angle) * len;

    // Specular crease highlight
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // Shadowed crease trough
    ctx.strokeStyle = '#92400e';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(x1 + 1.2, y1 + 1.2);
    ctx.lineTo(x2 + 1.2, y2 + 1.2);
    ctx.stroke();

    bCtx.strokeStyle = '#ffffff';
    bCtx.lineWidth = 1.5;
    bCtx.beginPath();
    bCtx.moveTo(x1, y1);
    bCtx.lineTo(x2, y2);
    bCtx.stroke();

    bCtx.strokeStyle = '#111111';
    bCtx.lineWidth = 2.0;
    bCtx.beginPath();
    bCtx.moveTo(x1 + 1.2, y1 + 1.2);
    bCtx.lineTo(x2 + 1.2, y2 + 1.2);
    bCtx.stroke();
  }

  // Kapton amber tape strips with grid backing
  ctx.fillStyle = 'rgba(245, 158, 11, 0.45)';
  ctx.fillRect(0, 100, w, 22);
  ctx.fillRect(0, 320, w, 22);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 16) {
    ctx.beginPath();
    ctx.moveTo(x, 100);
    ctx.lineTo(x, 122);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, 320);
    ctx.lineTo(x, 342);
    ctx.stroke();
  }

  const map = new THREE.CanvasTexture(colorCanvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(repeatX, repeatY);

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(repeatX, repeatY);

  return { map, bumpMap };
}

/**
 * Industrial brushed dark titanium / steel alloy plates with bolt rows.
 */
export function createTitaniumPlateTextures(repeatX = 2, repeatY = 2): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const w = 512;
  const h = 512;
  const colorCanvas = createOffscreenCanvas(w, h)!;
  const bumpCanvas = createOffscreenCanvas(w, h)!;

  const ctx = colorCanvas.getContext('2d')!;
  const bCtx = bumpCanvas.getContext('2d')!;

  ctx.fillStyle = '#22272e';
  ctx.fillRect(0, 0, w, h);
  bCtx.fillStyle = '#888888';
  bCtx.fillRect(0, 0, w, h);

  // Brushed anisotropic metal streaks
  for (let i = 0; i < 240; i++) {
    const y = Math.random() * h;
    ctx.strokeStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Panel division seams
  ctx.strokeStyle = '#0d1117';
  ctx.lineWidth = 4;
  bCtx.strokeStyle = '#000000';
  bCtx.lineWidth = 4;

  ctx.strokeRect(4, 4, w - 8, h - 8);
  bCtx.strokeRect(4, 4, w - 8, h - 8);
  ctx.strokeRect(4, 4, w / 2 - 4, h - 8);
  bCtx.strokeRect(4, 4, w / 2 - 4, h - 8);

  const boltPositions: Array<[number, number]> = [
    [16, 16],
    [w / 2 - 16, 16],
    [w / 2 + 16, 16],
    [w - 16, 16],
    [16, h - 16],
    [w / 2 - 16, h - 16],
    [w / 2 + 16, h - 16],
    [w - 16, h - 16],
    [16, h / 2],
    [w - 16, h / 2],
  ];

  for (const [bx, by] of boltPositions) {
    ctx.fillStyle = '#4b5563';
    ctx.beginPath();
    ctx.arc(bx, by, 4.5, 0, Math.PI * 2);
    ctx.fill();

    bCtx.fillStyle = '#111111';
    bCtx.beginPath();
    bCtx.arc(bx, by, 5.5, 0, Math.PI * 2);
    bCtx.fill();
    bCtx.fillStyle = '#ffffff';
    bCtx.beginPath();
    bCtx.arc(bx, by, 2.5, 0, Math.PI * 2);
    bCtx.fill();
  }

  const map = new THREE.CanvasTexture(colorCanvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(repeatX, repeatY);

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(repeatX, repeatY);

  return { map, bumpMap };
}

/**
 * Heavy industrial airlock bulkhead panel texture with warning stencils.
 */
export function createAirlockBulkheadTexture(): THREE.CanvasTexture {
  const canvas = createOffscreenCanvas(512, 512)!;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#232b35';
  ctx.fillRect(0, 0, 512, 512);

  // Hazard borders
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(0, 0, 512, 38);
  ctx.fillRect(0, 512 - 38, 512, 38);

  ctx.fillStyle = '#111827';
  for (let i = -512; i < 1024; i += 40) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 20, 0);
    ctx.lineTo(i + 58, 38);
    ctx.lineTo(i + 38, 38);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(i, 512 - 38);
    ctx.lineTo(i + 20, 512 - 38);
    ctx.lineTo(i + 58, 512);
    ctx.lineTo(i + 38, 512);
    ctx.fill();
  }

  // Central circular pressure gauge dial
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(256, 256, 100, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#00f0ff';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(256, 256, 95, 0, Math.PI * 2);
  ctx.stroke();

  // Dial tick marks
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(256 + Math.cos(a) * 82, 256 + Math.sin(a) * 82);
    ctx.lineTo(256 + Math.cos(a) * 92, 256 + Math.sin(a) * 92);
    ctx.stroke();
  }

  // Dial needle indicating nominal 101.3 kPa
  ctx.strokeStyle = '#00ff88';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(256, 256);
  ctx.lineTo(256 + Math.cos(-Math.PI / 4) * 65, 256 + Math.sin(-Math.PI / 4) * 65);
  ctx.stroke();

  ctx.fillStyle = '#00f0ff';
  ctx.font = 'bold 24px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('101.3 kPa', 256, 245);
  ctx.fillStyle = '#00ff88';
  ctx.font = 'bold 16px monospace';
  ctx.fillText('PRESSURE: NOMINAL', 256, 275);

  ctx.fillStyle = '#e2e8f0';
  ctx.font = 'bold 18px monospace';
  ctx.fillText('AIRLOCK DECOMPRESSION CHAMBER', 256, 80);
  ctx.font = '14px monospace';
  ctx.fillText('PNEUMATIC INTERLOCK // DO NOT FORCE', 256, 110);
  ctx.fillText('MAX OPERATING PRESSURE 120 kPa', 256, 430);

  return new THREE.CanvasTexture(canvas);
}

/**
 * Non-slip diamond tread steel plate texture + bump map for ramps and walkways.
 */
export function createDiamondPlateTextures(repeatX = 4, repeatY = 4): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const size = 256;
  const colorCanvas = createOffscreenCanvas(size, size)!;
  const bumpCanvas = createOffscreenCanvas(size, size)!;

  const ctx = colorCanvas.getContext('2d')!;
  const bCtx = bumpCanvas.getContext('2d')!;

  ctx.fillStyle = '#2d333b';
  ctx.fillRect(0, 0, size, size);
  bCtx.fillStyle = '#444444';
  bCtx.fillRect(0, 0, size, size);

  const step = 32;
  for (let x = 0; x < size; x += step) {
    for (let y = 0; y < size; y += step) {
      const cx = x + step / 2;
      const cy = y + step / 2;

      // Diagonal raised diamond tread
      ctx.fillStyle = '#545d68';
      ctx.beginPath();
      ctx.ellipse(cx, cy, 10, 4, Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();

      bCtx.fillStyle = '#ffffff';
      bCtx.beginPath();
      bCtx.ellipse(cx, cy, 10, 4, Math.PI / 4, 0, Math.PI * 2);
      bCtx.fill();
    }
  }

  const map = new THREE.CanvasTexture(colorCanvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(repeatX, repeatY);

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(repeatX, repeatY);

  return { map, bumpMap };
}

/**
 * Circular radial hazard stripe ring texture.
 * Paints radial alternating yellow-black warning stripes around a central origin.
 */
export function createRadialHazardTexture(segments = 32): THREE.CanvasTexture {
  const size = 512;
  const canvas = createOffscreenCanvas(size, size)!;
  const ctx = canvas.getContext('2d')!;

  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2;

  ctx.fillStyle = '#ffb703';
  ctx.fillRect(0, 0, size, size);

  const angleStep = (Math.PI * 2) / segments;
  ctx.fillStyle = '#12151a';

  for (let i = 0; i < segments; i += 2) {
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, i * angleStep, (i + 1) * angleStep);
    ctx.closePath();
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

/**
 * Procedural Apollo LRV zinc-coated wire mesh tire with titanium chevron treads.
 */
export function createLunarWheelTextures(): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const w = 512;
  const h = 256;
  const colorCanvas = createOffscreenCanvas(w, h)!;
  const bumpCanvas = createOffscreenCanvas(w, h)!;

  const ctx = colorCanvas.getContext('2d')!;
  const bCtx = bumpCanvas.getContext('2d')!;

  // Zinc wire mesh base
  ctx.fillStyle = '#6b7280';
  ctx.fillRect(0, 0, w, h);
  bCtx.fillStyle = '#666666';
  bCtx.fillRect(0, 0, w, h);

  // Woven wire cross-hatch
  ctx.strokeStyle = '#9ca3af';
  ctx.lineWidth = 1;
  for (let i = -w; i < w * 2; i += 8) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + h, h);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(i, h);
    ctx.lineTo(i + h, 0);
    ctx.stroke();
  }

  // Titanium chevron / herringbone cleats
  ctx.strokeStyle = '#d1d5db';
  ctx.lineWidth = 6;
  bCtx.strokeStyle = '#ffffff';
  bCtx.lineWidth = 8;

  for (let x = 0; x < w; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 20);
    ctx.lineTo(x + 16, h / 2);
    ctx.lineTo(x, h - 20);
    ctx.stroke();

    bCtx.beginPath();
    bCtx.moveTo(x, 20);
    bCtx.lineTo(x + 16, h / 2);
    bCtx.lineTo(x, h - 20);
    bCtx.stroke();
  }

  const map = new THREE.CanvasTexture(colorCanvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(4, 1);

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(4, 1);

  return { map, bumpMap };
}
