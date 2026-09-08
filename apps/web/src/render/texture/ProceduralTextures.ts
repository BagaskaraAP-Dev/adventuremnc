import * as THREE from 'three';

function createOffscreenCanvas(width: number, height: number): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

/**
 * High-definition thermal protection tile texture + bump map for exterior habitat shell.
 * Emulates Space Shuttle / Orion spacecraft ceramic heat tiles with realistic seams and stencils.
 */
export function createThermalTileTextures(): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const w = 1024;
  const h = 1024;
  const colorCanvas = createOffscreenCanvas(w, h)!;
  const bumpCanvas = createOffscreenCanvas(w, h)!;

  const ctx = colorCanvas.getContext('2d')!;
  const bCtx = bumpCanvas.getContext('2d')!;

  ctx.fillStyle = '#1e242c';
  ctx.fillRect(0, 0, w, h);
  bCtx.fillStyle = '#000000';
  bCtx.fillRect(0, 0, w, h);

  const cols = 16;
  const rows = 16;
  const tileW = w / cols;
  const tileH = h / rows;
  const seam = 3;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * tileW + seam;
      const y = r * tileH + seam;
      const tw = tileW - seam * 2;
      const th = tileH - seam * 2;

      // Random subtle tile brightness variation
      const baseVal = 215 + Math.floor((Math.sin(r * 3.7 + c * 2.3) * 0.5 + 0.5) * 25);
      ctx.fillStyle = `rgb(${baseVal}, ${baseVal + 2}, ${baseVal + 5})`;
      ctx.fillRect(x, y, tw, th);

      // Tile surface micro-bevel
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.fillRect(x, y, tw, 2);
      ctx.fillRect(x, y, 2, th);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.fillRect(x, y + th - 2, tw, 2);
      ctx.fillRect(x + tw - 2, y, 2, th);

      // Bump map: raised tile body, sunken seams
      bCtx.fillStyle = '#cccccc';
      bCtx.fillRect(x, y, tw, th);
      bCtx.fillStyle = '#ffffff';
      bCtx.fillRect(x + 2, y + 2, tw - 4, th - 4);

      // Corner ceramic pins
      ctx.fillStyle = '#718096';
      ctx.beginPath();
      ctx.arc(x + 5, y + 5, 1.5, 0, Math.PI * 2);
      ctx.arc(x + tw - 5, y + 5, 1.5, 0, Math.PI * 2);
      ctx.arc(x + 5, y + th - 5, 1.5, 0, Math.PI * 2);
      ctx.arc(x + tw - 5, y + th - 5, 1.5, 0, Math.PI * 2);
      ctx.fill();

      bCtx.fillStyle = '#555555';
      bCtx.beginPath();
      bCtx.arc(x + 5, y + 5, 1.5, 0, Math.PI * 2);
      bCtx.arc(x + tw - 5, y + 5, 1.5, 0, Math.PI * 2);
      bCtx.arc(x + 5, y + th - 5, 1.5, 0, Math.PI * 2);
      bCtx.arc(x + tw - 5, y + th - 5, 1.5, 0, Math.PI * 2);
      bCtx.fill();
    }
  }

  // Technical stencils on select tiles
  ctx.fillStyle = 'rgba(40, 50, 65, 0.75)';
  ctx.font = 'bold 12px monospace';
  ctx.fillText('LUN-SPEC 2091 // ARTEMIS BASE', 30, 80);
  ctx.fillText('PRESSURIZED SHELL // MOD-01', 30, 210);
  ctx.fillText('MAX RAD SHIELD // BERYLLIUM COMPOSITE', 540, 140);
  ctx.fillText('CRYO MANIFOLD ACCESS // 101.3 kPa', 540, 480);
  ctx.fillText('NO STEP // EVA HANDHOLD 0.5m', 280, 720);

  const map = new THREE.CanvasTexture(colorCanvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(4, 2);

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(4, 2);

  return { map, bumpMap };
}

/**
 * Diamond-quilted acoustic padded interior wall texture + bump map.
 * Emulates authentic space station interior walls (NASA Destiny & Columbus modules).
 */
export function createQuiltedInteriorTextures(): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const w = 1024;
  const h = 1024;
  const colorCanvas = createOffscreenCanvas(w, h)!;
  const bumpCanvas = createOffscreenCanvas(w, h)!;

  const ctx = colorCanvas.getContext('2d')!;
  const bCtx = bumpCanvas.getContext('2d')!;

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, w, h);
  bCtx.fillStyle = '#888888';
  bCtx.fillRect(0, 0, w, h);

  const step = 64;

  // Diamond quilt stitching
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 2;
  bCtx.strokeStyle = '#222222';
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

  // Padded cushion highlights & tufts
  for (let x = 0; x < w; x += step) {
    for (let y = 0; y < h; y += step) {
      const cx = x + step / 2;
      const cy = y + (x % (step * 2) === 0 ? step / 2 : 0);

      const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, step * 0.4);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.7, '#e2e8f0');
      grad.addColorStop(1, 'rgba(148, 163, 184, 0.4)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, step * 0.4, 0, Math.PI * 2);
      ctx.fill();

      const bGrad = bCtx.createRadialGradient(cx, cy, 2, cx, cy, step * 0.45);
      bGrad.addColorStop(0, '#ffffff');
      bGrad.addColorStop(0.8, '#aaaaaa');
      bGrad.addColorStop(1, '#444444');
      bCtx.fillStyle = bGrad;
      bCtx.beginPath();
      bCtx.arc(cx, cy, step * 0.45, 0, Math.PI * 2);
      bCtx.fill();

      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();

      bCtx.fillStyle = '#111111';
      bCtx.beginPath();
      bCtx.arc(x, y, 3.5, 0, Math.PI * 2);
      bCtx.fill();
    }
  }

  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 12px monospace';
  ctx.fillText('ACOUSTIC PADDING SPEC-NOMEX // CLASS-1', 40, 60);
  ctx.fillText('EMERGENCY O2 LINE BEHIND PANEL 04', 540, 180);
  ctx.fillText('ECLSS DUCT B-2 // CABIN AIRFLOW 40 CFM', 80, 520);
  ctx.fillText('CREW QUARTERS BERTH ACCESS', 560, 780);

  const map = new THREE.CanvasTexture(colorCanvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(6, 3);

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(6, 3);

  return { map, bumpMap };
}

/**
 * Crinkled Apollo/Artemis gold multi-layer insulation (MLI) foil texture + bump map.
 */
export function createGoldMliTextures(): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const w = 512;
  const h = 512;
  const colorCanvas = createOffscreenCanvas(w, h)!;
  const bumpCanvas = createOffscreenCanvas(w, h)!;

  const ctx = colorCanvas.getContext('2d')!;
  const bCtx = bumpCanvas.getContext('2d')!;

  ctx.fillStyle = '#e5a51a';
  ctx.fillRect(0, 0, w, h);
  bCtx.fillStyle = '#777777';
  bCtx.fillRect(0, 0, w, h);

  for (let i = 0; i < 90; i++) {
    const x1 = Math.random() * w;
    const y1 = Math.random() * h;
    const len = 30 + Math.random() * 80;
    const angle = Math.random() * Math.PI * 2;
    const x2 = x1 + Math.cos(angle) * len;
    const y2 = y1 + Math.sin(angle) * len;

    ctx.strokeStyle = '#ffeaa7';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    ctx.strokeStyle = '#b7791f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x1 + 1, y1 + 1);
    ctx.lineTo(x2 + 1, y2 + 1);
    ctx.stroke();

    bCtx.strokeStyle = '#ffffff';
    bCtx.lineWidth = 1.5;
    bCtx.beginPath();
    bCtx.moveTo(x1, y1);
    bCtx.lineTo(x2, y2);
    bCtx.stroke();

    bCtx.strokeStyle = '#222222';
    bCtx.lineWidth = 2;
    bCtx.beginPath();
    bCtx.moveTo(x1 + 1, y1 + 1);
    bCtx.lineTo(x2 + 1, y2 + 1);
    bCtx.stroke();
  }

  // Kapton amber tape strips
  ctx.fillStyle = 'rgba(217, 119, 6, 0.45)';
  ctx.fillRect(0, 120, w, 24);
  ctx.fillRect(0, 360, w, 24);

  const map = new THREE.CanvasTexture(colorCanvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(4, 2);

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(4, 2);

  return { map, bumpMap };
}

/**
 * Industrial brushed titanium / steel alloy plates with bolt rows.
 */
export function createTitaniumPlateTextures(): {
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

  for (let i = 0; i < 200; i++) {
    const y = Math.random() * h;
    ctx.strokeStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

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
    ctx.arc(bx, by, 4, 0, Math.PI * 2);
    ctx.fill();

    bCtx.fillStyle = '#222222';
    bCtx.beginPath();
    bCtx.arc(bx, by, 5, 0, Math.PI * 2);
    bCtx.fill();
    bCtx.fillStyle = '#ffffff';
    bCtx.beginPath();
    bCtx.arc(bx, by, 2.5, 0, Math.PI * 2);
    bCtx.fill();
  }

  const map = new THREE.CanvasTexture(colorCanvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(2, 2);

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(2, 2);

  return { map, bumpMap };
}

/**
 * Heavy industrial airlock bulkhead panel texture with warning stencils.
 */
export function createAirlockBulkheadTexture(): THREE.CanvasTexture {
  const canvas = createOffscreenCanvas(512, 512)!;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#28313e';
  ctx.fillRect(0, 0, 512, 512);

  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(0, 0, 512, 36);
  ctx.fillRect(0, 512 - 36, 512, 36);

  ctx.fillStyle = '#111827';
  for (let i = -512; i < 1024; i += 40) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 20, 0);
    ctx.lineTo(i + 56, 36);
    ctx.lineTo(i + 36, 36);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(i, 512 - 36);
    ctx.lineTo(i + 20, 512 - 36);
    ctx.lineTo(i + 56, 512);
    ctx.lineTo(i + 36, 512);
    ctx.fill();
  }

  ctx.strokeStyle = '#00f0ff';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(256, 256, 90, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#00f0ff';
  ctx.font = 'bold 22px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('101.3 kPa', 256, 250);
  ctx.fillStyle = '#00ff88';
  ctx.font = 'bold 16px monospace';
  ctx.fillText('SEALED // NOMINAL', 256, 280);

  ctx.fillStyle = '#e2e8f0';
  ctx.font = 'bold 18px monospace';
  ctx.fillText('AIRLOCK DECOMPRESSION CHAMBER', 256, 80);
  ctx.font = '14px monospace';
  ctx.fillText('PNEUMATIC INTERLOCK // DO NOT FORCE', 256, 110);
  ctx.fillText('MAX OPERATING PRESSURE 120 kPa', 256, 430);

  return new THREE.CanvasTexture(canvas);
}
