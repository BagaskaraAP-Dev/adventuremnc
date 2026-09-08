import * as THREE from 'three';
import { sampleLunarElevation } from '@adventuremnc/engine';
import { HABITAT_AIRLOCK_RADIUS } from '@adventuremnc/shared';
import {
  createThermalTileTextures,
  createQuiltedInteriorTextures,
  createHexFloorTextures,
  createGoldMliTextures,
  createTitaniumPlateTextures,
  createAirlockBulkheadTexture,
  createDiamondPlateTextures,
} from '../texture/ProceduralTextures';

export interface HabitatInstance {
  group: THREE.Group;
  worldX: number;
  worldY: number;
  worldZ: number;
  airlockX: number;
  airlockY: number;
  airlockZ: number;
  floorY: number;
  radius: number;
  canInteractAirlock: (x: number, z: number) => boolean;
  distanceToAirlock: (x: number, z: number) => number;
  isInside: (x: number, z: number) => boolean;
  constrainPosition: (
    currX: number,
    currZ: number,
    nextX: number,
    nextZ: number
  ) => { x: number; z: number };
  constrainRoverPosition: (
    currX: number,
    currZ: number,
    nextX: number,
    nextZ: number,
    roverRadius?: number
  ) => { x: number; z: number; hit: boolean; normalX?: number; normalZ?: number };
  getFloorHeight: (x: number, z: number) => number | null;
  updateAnimation: (time: number, dt: number) => void;
}

/**
 * Procedural yellow & black hazard warning stripe texture.
 */
function createHazardStripeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#ffb703';
  ctx.fillRect(0, 0, 256, 256);

  ctx.fillStyle = '#12151a';
  const stripeWidth = 32;
  for (let i = -256; i < 512; i += stripeWidth * 2) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + stripeWidth, 0);
    ctx.lineTo(i + stripeWidth + 256, 256);
    ctx.lineTo(i + 256, 256);
    ctx.closePath();
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 1);
  return texture;
}

/**
 * Generates a ring geometry with polar UVs so hazard stripes wrap radially without distortion.
 */
function createRadialRingGeometry(
  innerRadius: number,
  outerRadius: number,
  segments = 48
): THREE.BufferGeometry {
  const geom = new THREE.BufferGeometry();
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const u = i / segments;

    positions.push(cos * innerRadius, 0, sin * innerRadius);
    uvs.push(u * 16, 0);

    positions.push(cos * outerRadius, 0, sin * outerRadius);
    uvs.push(u * 16, 1);
  }

  for (let i = 0; i < segments; i++) {
    const a = i * 2;
    const b = a + 1;
    const c = (i + 1) * 2;
    const d = c + 1;
    indices.push(a, b, c);
    indices.push(c, b, d);
  }

  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

/**
 * Generates an airtight dome shell section connecting seamlessly between baseRadius and topRadius.
 */
function createDomeSectionGeometry(
  baseRadius: number,
  topRadius: number,
  baseY: number,
  height: number,
  steps = 16,
  radialSegments = 32
): THREE.BufferGeometry {
  const points: THREE.Vector2[] = [];
  const ratio = Math.min(0.999, topRadius / baseRadius);
  const angleMax = Math.acos(ratio);

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const angle = t * angleMax;
    const r = baseRadius * Math.cos(angle);
    const y = baseY + height * (Math.sin(angle) / Math.sin(angleMax));
    points.push(new THREE.Vector2(r, y));
  }
  return new THREE.LatheGeometry(points, radialSegments);
}

/**
 * Procedural CRT/OLED tactical display screen texture.
 */
function createScreenTexture(
  title: string,
  lines: string[],
  accent = '#00f0ff'
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#060a0f';
  ctx.fillRect(0, 0, 512, 256);

  ctx.strokeStyle = accent;
  ctx.lineWidth = 4;
  ctx.strokeRect(6, 6, 500, 244);

  ctx.fillStyle = accent;
  ctx.font = 'bold 24px monospace';
  ctx.fillText(title, 20, 42);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(20, 56);
  ctx.lineTo(492, 56);
  ctx.stroke();

  ctx.fillStyle = '#e2e8f0';
  ctx.font = '16px monospace';
  lines.forEach((line, idx) => {
    ctx.fillText(line, 20, 88 + idx * 28);
  });

  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(20, 225);
  for (let x = 20; x < 490; x += 30) {
    const y = 225 - Math.sin((x + 50) * 0.05) * 16 - (x % 20);
    ctx.lineTo(x, y);
  }
  ctx.stroke();

  return new THREE.CanvasTexture(canvas);
}

/**
 * Procedural Mission Crest Decal for central floor.
 */
function createMissionEmblemTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, 512, 512);

  ctx.strokeStyle = '#00f0ff';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(256, 256, 230, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(256, 256, 215, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#e2e8f0';
  ctx.beginPath();
  ctx.arc(256, 256, 120, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(295, 235, 105, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#00f0ff';
  ctx.font = 'bold 26px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('MNC LUNAR BASE', 256, 425);
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 18px monospace';
  ctx.fillText('EXPEDITION 2091 // SHACKLETON SECTOR', 256, 455);

  return new THREE.CanvasTexture(canvas);
}

export function createHabitatMesh(posX = -22, posZ = -18): HabitatInstance {
  const group = new THREE.Group();
  const groundY = sampleLunarElevation(posX, posZ);
  const floorY = groundY + 0.45;
  group.position.set(posX, groundY, posZ);

  const habRadius = 6.6;
  const habWallHeight = 4.2;

  // -------------------------------------------------------------
  // High-Definition PBR Procedural Materials
  // -------------------------------------------------------------
  const wallExteriorTiles = createThermalTileTextures(16, 4);
  const habitatExteriorMat = new THREE.MeshStandardMaterial({
    map: wallExteriorTiles.map,
    bumpMap: wallExteriorTiles.bumpMap,
    bumpScale: 0.035,
    roughness: 0.42,
    metalness: 0.22,
  });

  const roofExteriorTiles = createThermalTileTextures(16, 3);
  const roofExteriorMat = new THREE.MeshStandardMaterial({
    map: roofExteriorTiles.map,
    bumpMap: roofExteriorTiles.bumpMap,
    bumpScale: 0.035,
    roughness: 0.42,
    metalness: 0.22,
  });

  const wallInteriorTiles = createQuiltedInteriorTextures(22, 3);
  const interiorPaddedMat = new THREE.MeshStandardMaterial({
    map: wallInteriorTiles.map,
    bumpMap: wallInteriorTiles.bumpMap,
    bumpScale: 0.05,
    roughness: 0.78,
    metalness: 0.05,
    side: THREE.DoubleSide,
  });

  const ceilingInteriorTiles = createQuiltedInteriorTextures(18, 3);
  const ceilingInteriorMat = new THREE.MeshStandardMaterial({
    map: ceilingInteriorTiles.map,
    bumpMap: ceilingInteriorTiles.bumpMap,
    bumpScale: 0.045,
    roughness: 0.8,
    metalness: 0.05,
    side: THREE.DoubleSide,
  });

  const goldMli = createGoldMliTextures(4, 2);
  const goldMliMat = new THREE.MeshStandardMaterial({
    map: goldMli.map,
    bumpMap: goldMli.bumpMap,
    bumpScale: 0.06,
    color: 0xffffff,
    roughness: 0.25,
    metalness: 0.95,
  });

  const titaniumPlate = createTitaniumPlateTextures(2, 2);
  const darkFrameMat = new THREE.MeshStandardMaterial({
    map: titaniumPlate.map,
    bumpMap: titaniumPlate.bumpMap,
    bumpScale: 0.035,
    color: 0x333b47,
    roughness: 0.55,
    metalness: 0.75,
  });

  const airlockBulkheadTex = createAirlockBulkheadTexture();
  const airlockDoorMat = new THREE.MeshStandardMaterial({
    map: airlockBulkheadTex,
    roughness: 0.45,
    metalness: 0.55,
  });

  const hexFloor = createHexFloorTextures(8, 8);
  const floorMat = new THREE.MeshStandardMaterial({
    map: hexFloor.map,
    bumpMap: hexFloor.bumpMap,
    bumpScale: 0.04,
    roughnessMap: hexFloor.roughnessMap,
    roughness: 0.6,
    metalness: 0.45,
  });

  const diamondPlate = createDiamondPlateTextures(3, 4);
  const rampMat = new THREE.MeshStandardMaterial({
    map: diamondPlate.map,
    bumpMap: diamondPlate.bumpMap,
    bumpScale: 0.035,
    color: 0x3a424e,
    roughness: 0.65,
    metalness: 0.6,
  });

  const hazardMat = new THREE.MeshStandardMaterial({
    map: createHazardStripeTexture(),
    roughness: 0.5,
    metalness: 0.3,
  });

  const solarCellMat = new THREE.MeshStandardMaterial({
    color: 0x001830,
    roughness: 0.2,
    metalness: 0.9,
  });

  const cupolaGlassMat = new THREE.MeshStandardMaterial({
    color: 0x90e0ef,
    roughness: 0.08,
    metalness: 0.85,
    transparent: true,
    opacity: 0.45,
    side: THREE.DoubleSide,
  });

  const statusLedMat = new THREE.MeshBasicMaterial({ color: 0x00ff88 });
  const cyanGlowMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
  const hologramWireMat = new THREE.MeshBasicMaterial({
    color: 0x00ffff,
    wireframe: true,
    transparent: true,
    opacity: 0.75,
  });
  const plantFoliageMat = new THREE.MeshStandardMaterial({
    color: 0x10b981,
    roughness: 0.6,
    metalness: 0.1,
  });
  const growLightMat = new THREE.MeshBasicMaterial({ color: 0xff007f });

  // -------------------------------------------------------------
  // 1. Heavy Foundation Plinth & Leveling Jacks
  // -------------------------------------------------------------
  // Height 0.7m: top at y = 0.45m (flush with floor base), bottom anchored at y = -0.25m
  const plinthGeom = new THREE.CylinderGeometry(habRadius + 1.2, habRadius + 1.5, 0.7, 32);
  const plinthMesh = new THREE.Mesh(plinthGeom, darkFrameMat);
  plinthMesh.position.y = 0.10;
  plinthMesh.receiveShadow = true;
  group.add(plinthMesh);

  // Plinth Outer Radial Hazard Border (On exterior foundation terrace)
  const plinthRing = new THREE.Mesh(
    createRadialRingGeometry(habRadius + 0.9, habRadius + 1.2, 48),
    hazardMat
  );
  plinthRing.rotation.x = -Math.PI / 2;
  plinthRing.position.y = 0.452;
  group.add(plinthRing);

  // -------------------------------------------------------------
  // 2. Interior Room Floor Deck (Level Walking Surface)
  // -------------------------------------------------------------
  const floorMesh = new THREE.Mesh(
    new THREE.CircleGeometry(habRadius - 0.1, 32),
    floorMat
  );
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.position.y = 0.453;
  floorMesh.receiveShadow = true;
  group.add(floorMesh);

  // Mission Emblem Decal on Center Floor
  const emblemMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(3.6, 3.6),
    new THREE.MeshBasicMaterial({
      map: createMissionEmblemTexture(),
      transparent: true,
      opacity: 0.9,
    })
  );
  emblemMesh.rotation.x = -Math.PI / 2;
  emblemMesh.position.set(0, 0.455, 0);
  group.add(emblemMesh);

  // Recessed Floor Glowing Guide Runners (Cyan & Gold LEDs)
  const runnerMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
  const runnerCentral = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.02, 6.0),
    runnerMat
  );
  runnerCentral.position.set(0, 0.456, 3.0);
  group.add(runnerCentral);

  const runnerCross = new THREE.Mesh(
    new THREE.BoxGeometry(8.0, 0.02, 0.12),
    runnerMat
  );
  runnerCross.position.set(0, 0.456, 0);
  group.add(runnerCross);

  // -------------------------------------------------------------
  // 3. Walls & Pressure Hull Architecture
  // -------------------------------------------------------------
  // Calculate precise doorway cutout: walk corridor is width 2.8m (half-width 1.40m)
  const cutoutAngle = Math.asin(1.40 / habRadius); // ~0.2137 rad
  const cutoutSweep = Math.PI * 2 - cutoutAngle * 2;

  // Outer Cylindrical Wall (HD Thermal Tiles) with precise doorway cutout
  const outerWallGeom = new THREE.CylinderGeometry(
    habRadius + 0.1,
    habRadius + 0.1,
    habWallHeight,
    32,
    1,
    true,
    cutoutAngle,
    cutoutSweep
  );
  const outerWallMesh = new THREE.Mesh(outerWallGeom, habitatExteriorMat);
  outerWallMesh.position.y = 0.45 + habWallHeight / 2;
  group.add(outerWallMesh);

  // Inner Padded Acoustic Quilted Wall (Visible inside the room)
  const innerWallGeom = new THREE.CylinderGeometry(
    habRadius - 0.15,
    habRadius - 0.15,
    habWallHeight - 0.05,
    32,
    1,
    true,
    cutoutAngle,
    cutoutSweep
  );
  const innerWallMesh = new THREE.Mesh(innerWallGeom, interiorPaddedMat);
  innerWallMesh.position.y = 0.45 + (habWallHeight - 0.05) / 2;
  group.add(innerWallMesh);

  // Gold MLI Insulation Band on exterior
  const mliBandGeom = new THREE.CylinderGeometry(
    habRadius + 0.15,
    habRadius + 0.15,
    1.4,
    32,
    1,
    true,
    cutoutAngle,
    cutoutSweep
  );
  const mliBand = new THREE.Mesh(mliBandGeom, goldMliMat);
  mliBand.position.y = 0.45 + 1.8;
  group.add(mliBand);

  // Vertical Titanium Structural Bulkhead Ribs (8 ribs around perimeter)
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI * 2 * i) / 8;
    if (Math.abs(angle - Math.PI / 2) < 0.35) continue;
    const rib = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, habWallHeight, 0.45),
      darkFrameMat
    );
    rib.position.set(
      Math.cos(angle) * habRadius,
      0.45 + habWallHeight / 2,
      Math.sin(angle) * habRadius
    );
    rib.rotation.y = -angle;
    group.add(rib);
  }

  // -------------------------------------------------------------
  // 4. Zero-Gap Dual-Shell Roof Dome & Panoramic Observation Cupola
  // -------------------------------------------------------------
  const wallTopY = 0.45 + habWallHeight; // 4.65
  const domeHeight = 2.75;
  const cupolaRadius = 2.18;

  // Structural Compression Collar Bands physically locking wall and roof together
  const collarMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(habRadius + 0.18, habRadius + 0.18, 0.22, 32, 1, true),
    darkFrameMat
  );
  collarMesh.position.y = wallTopY;
  group.add(collarMesh);

  // Exterior clamping torus ring
  const collarTorus = new THREE.Mesh(
    new THREE.TorusGeometry(habRadius + 0.16, 0.08, 8, 32),
    darkFrameMat
  );
  collarTorus.rotation.x = Math.PI / 2;
  collarTorus.position.y = wallTopY;
  group.add(collarTorus);

  // Interior crown molding ring locking quilted wall to ceiling dome
  const innerCrownTorus = new THREE.Mesh(
    new THREE.TorusGeometry(habRadius - 0.15, 0.06, 8, 32),
    darkFrameMat
  );
  innerCrownTorus.rotation.x = Math.PI / 2;
  innerCrownTorus.position.y = wallTopY;
  group.add(innerCrownTorus);

  // Exterior Roof Dome: Curves seamlessly from r=6.70 at y=4.65 up to r=2.18 at y=7.40
  const roofDomeGeom = createDomeSectionGeometry(
    habRadius + 0.1,
    cupolaRadius,
    wallTopY,
    domeHeight,
    16,
    32
  );
  const roofDomeMesh = new THREE.Mesh(roofDomeGeom, roofExteriorMat);
  group.add(roofDomeMesh);

  // Exterior Gold MLI Skirt around lower dome curvature
  const mliRoofSkirtGeom = createDomeSectionGeometry(
    habRadius + 0.14,
    habRadius * 0.78,
    wallTopY + 0.05,
    0.85,
    8,
    32
  );
  const mliRoofSkirt = new THREE.Mesh(mliRoofSkirtGeom, goldMliMat);
  group.add(mliRoofSkirt);

  // 8 Exterior Titanium Geodesic Ribs curving along roof dome
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI * 2 * i) / 8;
    const ribGroup = new THREE.Group();
    ribGroup.rotation.y = angle;

    const s1 = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.2, 0.22), darkFrameMat);
    s1.position.set(5.7, wallTopY + 0.55, 0);
    s1.rotation.z = -0.42;
    ribGroup.add(s1);

    const s2 = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.2, 0.22), darkFrameMat);
    s2.position.set(4.3, wallTopY + 1.45, 0);
    s2.rotation.z = -0.75;
    ribGroup.add(s2);

    const s3 = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.1, 0.22), darkFrameMat);
    s3.position.set(2.8, wallTopY + 2.22, 0);
    s3.rotation.z = -1.05;
    ribGroup.add(s3);

    group.add(ribGroup);
  }

  // Interior Ceiling Dome: Curves from r=6.45 at y=4.65 up to r=2.05 at y=7.30
  const innerCeilingGeom = createDomeSectionGeometry(
    habRadius - 0.15,
    cupolaRadius - 0.13,
    wallTopY,
    domeHeight - 0.1,
    16,
    32
  );
  const innerCeilingMesh = new THREE.Mesh(innerCeilingGeom, ceilingInteriorMat);
  group.add(innerCeilingMesh);

  // Interior Ceiling Arches with Recessed Glowing Cyan LEDs
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI * 2 * i) / 8;
    const archGroup = new THREE.Group();
    archGroup.rotation.y = angle;

    const ledStrip1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.1, 0.04), cyanGlowMat);
    ledStrip1.position.set(5.4, wallTopY + 0.52, 0);
    ledStrip1.rotation.z = -0.42;
    archGroup.add(ledStrip1);

    const ledStrip2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.1, 0.04), cyanGlowMat);
    ledStrip2.position.set(4.1, wallTopY + 1.38, 0);
    ledStrip2.rotation.z = -0.75;
    archGroup.add(ledStrip2);

    const ledStrip3 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.0, 0.04), cyanGlowMat);
    ledStrip3.position.set(2.7, wallTopY + 2.12, 0);
    ledStrip3.rotation.z = -1.05;
    archGroup.add(ledStrip3);

    group.add(archGroup);
  }

  // Skylight Bezel Ring (Opening between interior room and cupola)
  const skylightRing = new THREE.Mesh(
    new THREE.TorusGeometry(cupolaRadius, 0.12, 8, 32),
    darkFrameMat
  );
  skylightRing.rotation.x = Math.PI / 2;
  skylightRing.position.y = wallTopY + domeHeight - 0.05;
  group.add(skylightRing);

  // Soft atmospheric skylight wash light shining down into the center room
  const skylightWashLight = new THREE.PointLight(0x90e0ef, 1.6, 12, 1.3);
  skylightWashLight.position.set(0, wallTopY + domeHeight - 0.2, 0);
  group.add(skylightWashLight);

  // Observation Cupola (Octagonal observation deck looking out into lunar orbit)
  const cupolaBaseY = wallTopY + domeHeight - 0.05; // ~7.35
  const cupolaCollar = new THREE.Mesh(
    new THREE.CylinderGeometry(cupolaRadius + 0.05, cupolaRadius + 0.05, 0.18, 8),
    darkFrameMat
  );
  cupolaCollar.position.y = cupolaBaseY + 0.09;
  group.add(cupolaCollar);

  // Octagonal Cupola Window Frame & Tinted Glass Panes
  const cupolaFrame = new THREE.Mesh(
    new THREE.CylinderGeometry(cupolaRadius, cupolaRadius, 0.65, 8, 1, true),
    darkFrameMat
  );
  cupolaFrame.position.y = cupolaBaseY + 0.50;
  group.add(cupolaFrame);

  const cupolaGlass = new THREE.Mesh(
    new THREE.CylinderGeometry(cupolaRadius - 0.02, cupolaRadius - 0.02, 0.62, 8, 1, true),
    cupolaGlassMat
  );
  cupolaGlass.position.y = cupolaBaseY + 0.50;
  group.add(cupolaGlass);

  const cupolaTopY = cupolaBaseY + 0.82;

  // Cupola Top Structural Framing Ring
  const cupolaTopRing = new THREE.Mesh(
    new THREE.TorusGeometry(cupolaRadius, 0.09, 8, 24),
    darkFrameMat
  );
  cupolaTopRing.rotation.x = Math.PI / 2;
  cupolaTopRing.position.y = cupolaTopY;
  group.add(cupolaTopRing);

  // Cupola Glass Hemisphere Dome Cap (Starts precisely at top rim y = cupolaTopY with r = cupolaRadius - 0.02)
  const cupolaGlassDome = new THREE.Mesh(
    new THREE.SphereGeometry(cupolaRadius - 0.02, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    cupolaGlassMat
  );
  cupolaGlassDome.position.y = cupolaTopY;
  group.add(cupolaGlassDome);

  // 8 Geodesic Arched Titanium Framing Ribs over the Cupola Dome
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI * 2 * i) / 8;
    const domeRib = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, cupolaRadius * 1.2, 8),
      darkFrameMat
    );
    domeRib.position.set(
      Math.sin(angle) * (cupolaRadius * 0.45),
      cupolaTopY + cupolaRadius * 0.55,
      Math.cos(angle) * (cupolaRadius * 0.45)
    );
    domeRib.rotation.y = angle;
    domeRib.rotation.z = 0.65;
    group.add(domeRib);
  }

  // Cupola Apex Structural Hub
  const cupolaApexHub = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.45, 0.16, 8),
    darkFrameMat
  );
  cupolaApexHub.position.y = cupolaTopY + cupolaRadius - 0.02;
  group.add(cupolaApexHub);

  // Comms Mast & High-Gain Parabolic Dish (Mounted on apex hub)
  const commsMast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.09, 2.6, 8),
    darkFrameMat
  );
  commsMast.position.set(0, cupolaTopY + cupolaRadius + 1.2, 0);
  group.add(commsMast);

  const dishGeom = new THREE.ConeGeometry(1.4, 0.6, 16, 1, true);
  const dishMesh = new THREE.Mesh(dishGeom, darkFrameMat);
  dishMesh.position.set(0, cupolaTopY + cupolaRadius + 1.7, 0);
  dishMesh.rotation.x = 1.25;
  dishMesh.rotation.y = 0.6;
  group.add(dishMesh);

  const roofBeacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 8, 8),
    cyanGlowMat
  );
  roofBeacon.position.set(0, cupolaTopY + cupolaRadius + 2.5, 0);
  group.add(roofBeacon);

  // High-Efficiency Solar Array Wings (Clear above dome, no clipping!)
  const solarTruss = new THREE.Group();
  solarTruss.position.set(0, cupolaBaseY + 0.45, 0);

  const pylonLeft = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.8, 0.14), darkFrameMat);
  pylonLeft.position.set(-3.2, -0.6, 0);
  pylonLeft.rotation.z = -0.55;
  solarTruss.add(pylonLeft);

  const pylonRight = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.8, 0.14), darkFrameMat);
  pylonRight.position.set(3.2, -0.6, 0);
  pylonRight.rotation.z = 0.55;
  solarTruss.add(pylonRight);

  const trussBeam = new THREE.Mesh(
    new THREE.BoxGeometry(19.0, 0.2, 0.2),
    darkFrameMat
  );
  solarTruss.add(trussBeam);

  const panelGeom = new THREE.BoxGeometry(7.2, 0.08, 2.6);
  const panelLeft = new THREE.Mesh(panelGeom, solarCellMat);
  panelLeft.position.set(-6.8, 0.28, 0);
  panelLeft.rotation.x = -0.28;
  solarTruss.add(panelLeft);

  const panelRight = new THREE.Mesh(panelGeom, solarCellMat);
  panelRight.position.set(6.8, 0.28, 0);
  panelRight.rotation.x = -0.28;
  solarTruss.add(panelRight);

  group.add(solarTruss);

  // Exterior Flank Cryogenic O2/N2 Spheres
  const cryoMat = new THREE.MeshStandardMaterial({
    color: 0xedf2f7,
    roughness: 0.3,
    metalness: 0.7,
  });
  const tankLeft = new THREE.Mesh(new THREE.SphereGeometry(1.0, 16, 16), cryoMat);
  tankLeft.position.set(-habRadius - 0.6, 2.2, -1.8);
  group.add(tankLeft);

  const tankRight = new THREE.Mesh(new THREE.SphereGeometry(1.0, 16, 16), cryoMat);
  tankRight.position.set(habRadius + 0.6, 2.2, -1.8);
  group.add(tankRight);

  // -------------------------------------------------------------
  // 5. Walk-Through Airlock Decompression Vestibule & Ramp
  // -------------------------------------------------------------
  const airlockGroup = new THREE.Group();
  airlockGroup.position.set(0, 0, 8.2);

  const airlockLength = 3.6;
  const airlockWidth = 3.2;
  const airlockHeight = 3.2;

  // Vestibule total extrusion depth: extends from outer hatch at local z = +1.8 (world z = 10.0)
  // backward into the habitat main room to local z = -2.6 (world z = 5.6).
  // Total vestibule length = 4.4m, centered at local z = -0.4m (world z = 7.8m).
  const vestDepth = 4.4;
  const vestCenterZ = -0.4;

  // Airlock Floor Plate (Hex composite deck seamlessly overlapping main room floor)
  const airlockFloor = new THREE.Mesh(
    new THREE.BoxGeometry(airlockWidth - 0.2, 0.12, vestDepth),
    floorMat
  );
  airlockFloor.position.set(0, 0.453, vestCenterZ);
  airlockGroup.add(airlockFloor);

  // Interior Room Transition Threshold Plate (Diamond tread with hazard border)
  const innerThreshold = new THREE.Mesh(
    new THREE.BoxGeometry(airlockWidth - 0.2, 0.02, 0.6),
    rampMat
  );
  innerThreshold.position.set(0, 0.456, -2.35);
  airlockGroup.add(innerThreshold);

  // Left & Right Airlock Side Walls (Industrial Brushed Titanium, overlapping cylinder hull)
  const wallGeo = new THREE.BoxGeometry(0.24, airlockHeight, vestDepth);
  const leftWall = new THREE.Mesh(wallGeo, darkFrameMat);
  leftWall.position.set(-airlockWidth / 2, 0.45 + airlockHeight / 2, vestCenterZ);
  airlockGroup.add(leftWall);

  const rightWall = new THREE.Mesh(wallGeo, darkFrameMat);
  rightWall.position.set(airlockWidth / 2, 0.45 + airlockHeight / 2, vestCenterZ);
  airlockGroup.add(rightWall);

  // Airlock Ceiling Roof
  const ceilingGeo = new THREE.BoxGeometry(airlockWidth + 0.04, 0.22, vestDepth);
  const airlockRoof = new THREE.Mesh(ceilingGeo, darkFrameMat);
  airlockRoof.position.set(0, 0.45 + airlockHeight, vestCenterZ);
  airlockGroup.add(airlockRoof);

  // -------------------------------------------------------------
  // Zero-Gap Structural Sealing: Upper Transom Bulkhead & Pilasters
  // -------------------------------------------------------------
  // A. Upper Transom Bulkhead: Fills the entire 1.05m vertical gap above airlock roof
  // from y = 3.65m up to y = 4.70m, physically interlocking into the roof dome collar
  const upperTransomCore = new THREE.Mesh(
    new THREE.BoxGeometry(3.6, 1.05, 0.75),
    darkFrameMat
  );
  upperTransomCore.position.set(0, 4.175, -1.75);
  airlockGroup.add(upperTransomCore);

  // Exterior Thermal Tile Cladding on upper transom
  const upperTransomExterior = new THREE.Mesh(
    new THREE.BoxGeometry(3.5, 1.02, 0.12),
    habitatExteriorMat
  );
  upperTransomExterior.position.set(0, 4.175, -1.40);
  airlockGroup.add(upperTransomExterior);

  // Exterior Gold MLI blanket strip on upper transom
  const upperTransomMli = new THREE.Mesh(
    new THREE.BoxGeometry(3.52, 0.55, 0.14),
    goldMliMat
  );
  upperTransomMli.position.set(0, 3.90, -1.38);
  airlockGroup.add(upperTransomMli);

  // Interior Padded Acoustic Wall on upper transom inside room
  const upperTransomInterior = new THREE.Mesh(
    new THREE.BoxGeometry(3.4, 1.02, 0.12),
    interiorPaddedMat
  );
  upperTransomInterior.position.set(0, 4.175, -2.10);
  airlockGroup.add(upperTransomInterior);

  // Exterior Titanium Structural Support Lintel above airlock roof
  const upperLintel = new THREE.Mesh(
    new THREE.BoxGeometry(3.7, 0.20, 0.40),
    darkFrameMat
  );
  upperLintel.position.set(0, 3.75, -1.45);
  airlockGroup.add(upperLintel);

  // B. Exterior Corner Pilasters: Closes lateral transition between airlock side walls and curved cylinder hull
  const pilasterGeo = new THREE.BoxGeometry(0.36, airlockHeight + 0.1, 0.85);
  const leftPilaster = new THREE.Mesh(pilasterGeo, darkFrameMat);
  leftPilaster.position.set(-1.65, 0.45 + airlockHeight / 2, -1.65);
  airlockGroup.add(leftPilaster);

  const rightPilaster = new THREE.Mesh(pilasterGeo, darkFrameMat);
  rightPilaster.position.set(1.65, 0.45 + airlockHeight / 2, -1.65);
  airlockGroup.add(rightPilaster);

  // C. Interior Bulkhead Portal: Heavy pressurized doorway arch framing airlock entrance inside room
  const innerJambGeo = new THREE.BoxGeometry(0.24, airlockHeight, 0.28);
  const innerLeftJamb = new THREE.Mesh(innerJambGeo, darkFrameMat);
  innerLeftJamb.position.set(-1.5, 0.45 + airlockHeight / 2, -2.5);
  airlockGroup.add(innerLeftJamb);

  const innerRightJamb = new THREE.Mesh(innerJambGeo, darkFrameMat);
  innerRightJamb.position.set(1.5, 0.45 + airlockHeight / 2, -2.5);
  airlockGroup.add(innerRightJamb);

  const innerHeaderArch = new THREE.Mesh(
    new THREE.BoxGeometry(airlockWidth + 0.04, 0.28, 0.28),
    darkFrameMat
  );
  innerHeaderArch.position.set(0, 0.45 + airlockHeight, -2.5);
  airlockGroup.add(innerHeaderArch);

  const innerDoorHazard = new THREE.Mesh(
    new THREE.BoxGeometry(2.8, 0.08, 0.04),
    hazardMat
  );
  innerDoorHazard.position.set(0, 0.45 + airlockHeight - 0.14, -2.65);
  airlockGroup.add(innerDoorHazard);

  const innerDoorScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.9, 0.40),
    new THREE.MeshBasicMaterial({
      map: createScreenTexture('AIRLOCK PORTAL', [
        'CHAMBER: EQUALIZED',
        'EXT HATCH: SEALED',
        'STATUS: 100% AIRTIGHT',
      ]),
    })
  );
  innerDoorScreen.position.set(0, 0.45 + airlockHeight - 0.45, -2.65);
  airlockGroup.add(innerDoorScreen);

  // -------------------------------------------------------------
  // Outer Hatch & Exterior Entrance
  // -------------------------------------------------------------
  // Outer Hatch Door Frame
  const hatchFrameGeo = new THREE.BoxGeometry(airlockWidth + 0.2, airlockHeight + 0.2, 0.3);
  const hatchFrame = new THREE.Mesh(hatchFrameGeo, darkFrameMat);
  hatchFrame.position.set(0, 0.45 + airlockHeight / 2, airlockLength / 2);
  airlockGroup.add(hatchFrame);

  // Outer Door Arch Hazard Border
  const archHazard = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 2.7, 0.05),
    hazardMat
  );
  archHazard.position.set(0, 0.45 + 1.35, airlockLength / 2 + 0.16);
  airlockGroup.add(archHazard);

  // Outer Hatch Doorway (Textured Industrial Pressure Door)
  const outerDoor = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 2.4, 0.18),
    airlockDoorMat
  );
  outerDoor.position.set(-1.1, 0.45 + 1.2, airlockLength / 2 + 0.1);
  outerDoor.rotation.y = -0.5;
  airlockGroup.add(outerDoor);

  // Operational Status LEDs on Airlock
  const ledGeom = new THREE.SphereGeometry(0.09, 8, 8);
  const ledLeft = new THREE.Mesh(ledGeom, statusLedMat);
  ledLeft.position.set(-0.95, 0.45 + 2.75, airlockLength / 2 + 0.2);
  airlockGroup.add(ledLeft);

  const ledRight = new THREE.Mesh(ledGeom, statusLedMat);
  ledRight.position.set(0.95, 0.45 + 2.75, airlockLength / 2 + 0.2);
  airlockGroup.add(ledRight);

  // Exterior Downward Floodlight illuminating ramp and Rover Bay path
  const airlockFloodlight = new THREE.SpotLight(0x90e0ef, 3.2, 16, Math.PI / 3, 0.4);
  airlockFloodlight.position.set(0, 0.45 + airlockHeight + 0.2, airlockLength / 2 + 0.3);
  airlockFloodlight.target.position.set(0, 0, airlockLength / 2 + 4.0);
  airlockGroup.add(airlockFloodlight);
  airlockGroup.add(airlockFloodlight.target);

  // Airlock Interior Suit Racks & Wall Console
  const suitRack = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 1.8, 1.4),
    darkFrameMat
  );
  suitRack.position.set(-airlockWidth / 2 + 0.25, 0.45 + 1.0, 0);
  airlockGroup.add(suitRack);

  // Airlock Cycling Terminal Screen
  const airlockScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.7, 0.45),
    new THREE.MeshBasicMaterial({
      map: createScreenTexture('AIRLOCK TELEMETRY', [
        'PRESSURE: 101.3 kPa',
        'INNER HATCH: OPEN',
        'STATUS: PRESSURIZED',
      ]),
    })
  );
  airlockScreen.position.set(airlockWidth / 2 - 0.05, 0.45 + 1.6, 0);
  airlockScreen.rotation.y = -Math.PI / 2;
  airlockGroup.add(airlockScreen);

  // Decontamination Blue Wash Light inside vestibule
  const airlockDeconLight = new THREE.PointLight(0x00f0ff, 1.2, 6);
  airlockDeconLight.position.set(0, 0.45 + airlockHeight - 0.3, 0);
  airlockGroup.add(airlockDeconLight);

  // Entrance Ramp leading down to natural regolith
  const rampLength = 2.6;
  const rampWidth = 2.4;
  const rampGeom = new THREE.BoxGeometry(rampWidth, 0.12, rampLength);
  const rampMesh = new THREE.Mesh(rampGeom, rampMat);
  rampMesh.position.set(0, 0.22, airlockLength / 2 + rampLength / 2);
  rampMesh.rotation.x = 0.16;
  airlockGroup.add(rampMesh);

  // Ramp Left & Right Handrails
  const railGeom = new THREE.CylinderGeometry(0.03, 0.03, rampLength, 8);
  const leftRail = new THREE.Mesh(railGeom, darkFrameMat);
  leftRail.position.set(-rampWidth / 2, 0.7, airlockLength / 2 + rampLength / 2);
  leftRail.rotation.x = Math.PI / 2 - 0.16;
  airlockGroup.add(leftRail);

  const rightRail = new THREE.Mesh(railGeom, darkFrameMat);
  rightRail.position.set(rampWidth / 2, 0.7, airlockLength / 2 + rampLength / 2);
  rightRail.rotation.x = Math.PI / 2 - 0.16;
  airlockGroup.add(rightRail);

  group.add(airlockGroup);

  // -------------------------------------------------------------
  // 6. MAIN HABITAT INTERIOR ROOM (High Definition Stations)
  // -------------------------------------------------------------

  // A. STATION 1 (CENTER): Holographic Strategic Mission Table
  const holoGroup = new THREE.Group();
  holoGroup.position.set(0, 0.45, 0);

  const pedestalGeom = new THREE.CylinderGeometry(1.2, 1.4, 0.85, 6);
  const pedestal = new THREE.Mesh(pedestalGeom, darkFrameMat);
  pedestal.position.y = 0.425;
  holoGroup.add(pedestal);

  const screenGeom = new THREE.PlaneGeometry(0.8, 0.35);
  for (let s = 0; s < 6; s++) {
    const angle = (Math.PI / 3) * s;
    const sMesh = new THREE.Mesh(
      screenGeom,
      new THREE.MeshBasicMaterial({
        map: createScreenTexture('SYS-MONITOR', [
          'CABIN: 101.3 kPa',
          'TEMP: +21.5 C',
          'O2: 99.8% NOMINAL',
        ]),
      })
    );
    sMesh.position.set(
      Math.sin(angle) * 1.05,
      0.72,
      Math.cos(angle) * 1.05
    );
    sMesh.rotation.y = angle + Math.PI;
    sMesh.rotation.x = -0.45;
    holoGroup.add(sMesh);
  }

  // Floating Holographic Wireframe Moon Sphere
  const holoMoon = new THREE.Mesh(
    new THREE.SphereGeometry(0.65, 16, 12),
    hologramWireMat
  );
  holoMoon.position.y = 1.65;
  holoGroup.add(holoMoon);

  const orbitRingGeom = new THREE.RingGeometry(0.85, 0.88, 32);
  const orbitRing1 = new THREE.Mesh(orbitRingGeom, cyanGlowMat);
  orbitRing1.position.y = 1.65;
  orbitRing1.rotation.x = Math.PI / 3;
  holoGroup.add(orbitRing1);

  const orbitRing2 = new THREE.Mesh(orbitRingGeom, cyanGlowMat);
  orbitRing2.position.y = 1.65;
  orbitRing2.rotation.y = Math.PI / 4;
  orbitRing2.rotation.x = -Math.PI / 4;
  holoGroup.add(orbitRing2);

  const holoLight = new THREE.PointLight(0x00ffff, 1.5, 8, 1.5);
  holoLight.position.set(0, 1.65, 0);
  holoGroup.add(holoLight);

  group.add(holoGroup);

  // B. STATION 2 (WEST WING): Geological Petrology Lab & Mineral Glovebox
  const labGroup = new THREE.Group();
  labGroup.position.set(-4.2, 0.45, -0.5);

  const benchGeom = new THREE.BoxGeometry(1.2, 0.88, 3.2);
  const labBench = new THREE.Mesh(benchGeom, darkFrameMat);
  labBench.position.set(0, 0.44, 0);
  labGroup.add(labBench);

  const labScreen1 = new THREE.Mesh(
    new THREE.PlaneGeometry(1.1, 0.55),
    new THREE.MeshBasicMaterial({
      map: createScreenTexture(
        'SPECTROMETRY // LUN-2091',
        [
          'FE-TI ILMENITE: 14.8%',
          'ANORTHOSITE: 68.2%',
          'VOLATILE TRACE: DETECTED',
        ],
        '#00ffaa'
      ),
    })
  );
  labScreen1.position.set(-0.45, 1.25, -0.7);
  labScreen1.rotation.y = Math.PI / 2;
  labGroup.add(labScreen1);

  const labScreen2 = new THREE.Mesh(
    new THREE.PlaneGeometry(1.1, 0.55),
    new THREE.MeshBasicMaterial({
      map: createScreenTexture(
        'TOPOGRAPHY SECTOR',
        [
          'SHACKLETON RIM: 89.9 S',
          'PERMANENT SHADOW: ACTIVE',
          'ELEVATION: 186.8 m',
        ],
        '#38bdf8'
      ),
    })
  );
  labScreen2.position.set(-0.45, 1.25, 0.7);
  labScreen2.rotation.y = Math.PI / 2;
  labGroup.add(labScreen2);

  const glovebox = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 0.6, 0.8),
    cupolaGlassMat
  );
  glovebox.position.set(0, 1.18, 0);
  labGroup.add(glovebox);

  const crystalGeom = new THREE.OctahedronGeometry(0.18, 0);
  const crystalMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
  const mineralCrystal = new THREE.Mesh(crystalGeom, crystalMat);
  mineralCrystal.position.set(0, 1.18, 0);
  labGroup.add(mineralCrystal);

  const crystalLight = new THREE.PointLight(0x00f0ff, 1.2, 5);
  crystalLight.position.set(0, 1.18, 0);
  labGroup.add(crystalLight);

  group.add(labGroup);

  // C. STATION 3 (EAST WING): Hydroponics & Lunar Greenhouse
  const hydroGroup = new THREE.Group();
  hydroGroup.position.set(4.2, 0.45, -0.5);

  const rackFrameGeom = new THREE.BoxGeometry(0.9, 2.8, 3.2);
  const rackFrame = new THREE.Mesh(rackFrameGeom, darkFrameMat);
  rackFrame.position.set(0, 1.4, 0);
  hydroGroup.add(rackFrame);

  for (let t = 0; t < 3; t++) {
    const yPos = 0.5 + t * 0.9;
    const tray = new THREE.Mesh(
      new THREE.BoxGeometry(0.75, 0.1, 2.9),
      darkFrameMat
    );
    tray.position.set(0, yPos, 0);
    hydroGroup.add(tray);

    for (let p = -1.2; p <= 1.2; p += 0.4) {
      const plant = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.16, 1),
        plantFoliageMat
      );
      plant.position.set(0, yPos + 0.16, p);
      hydroGroup.add(plant);
    }

    const growLight = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 2.8, 8),
      growLightMat
    );
    growLight.position.set(0, yPos + 0.72, 0);
    growLight.rotation.x = Math.PI / 2;
    hydroGroup.add(growLight);
  }

  const hydroLight = new THREE.SpotLight(0xff0088, 2.2, 8, Math.PI / 3, 0.5);
  hydroLight.position.set(0, 2.7, 0);
  hydroLight.target.position.set(-1.0, 1.0, 0);
  hydroGroup.add(hydroLight);
  hydroGroup.add(hydroLight.target);

  const bioreactor = new THREE.Mesh(
    new THREE.CylinderGeometry(0.25, 0.25, 2.2, 16),
    new THREE.MeshStandardMaterial({
      color: 0x059669,
      roughness: 0.2,
      transparent: true,
      opacity: 0.7,
    })
  );
  bioreactor.position.set(-0.2, 1.1, 1.9);
  hydroGroup.add(bioreactor);

  group.add(hydroGroup);

  // D. STATION 4 (NORTH WING): Crew Living Quarters & Sleep Pods
  const quartersGroup = new THREE.Group();
  quartersGroup.position.set(0, 0.45, -4.5);

  const berthGeom = new THREE.BoxGeometry(2.4, 1.1, 1.2);
  const lowerBerth = new THREE.Mesh(berthGeom, darkFrameMat);
  lowerBerth.position.set(0, 0.55, 0);
  quartersGroup.add(lowerBerth);

  const upperBerth = new THREE.Mesh(berthGeom, darkFrameMat);
  upperBerth.position.set(0, 1.75, 0);
  quartersGroup.add(upperBerth);

  const mattressMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.9,
  });
  const matLower = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.2, 0.9), mattressMat);
  matLower.position.set(0, 0.35, 0.1);
  quartersGroup.add(matLower);

  const matUpper = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.2, 0.9), mattressMat);
  matUpper.position.set(0, 1.55, 0.1);
  quartersGroup.add(matUpper);

  const lockerGeom = new THREE.BoxGeometry(1.2, 2.2, 0.6);
  const lockers = new THREE.Mesh(lockerGeom, darkFrameMat);
  lockers.position.set(-2.0, 1.1, 0.2);
  quartersGroup.add(lockers);

  const galley = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.6, 0.5), darkFrameMat);
  galley.position.set(2.0, 0.8, 0.2);
  quartersGroup.add(galley);

  const sleepLamp = new THREE.PointLight(0xffd8a8, 1.0, 6);
  sleepLamp.position.set(0, 2.2, 0.5);
  quartersGroup.add(sleepLamp);

  group.add(quartersGroup);

  // E. STATION 5 (NORTH-WEST WING): Communications & Earth Telemetry Station
  const commsGroup = new THREE.Group();
  commsGroup.position.set(-3.2, 0.45, -3.2);

  const commsRack = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.2, 0.6), darkFrameMat);
  commsRack.position.set(0, 1.1, 0);
  commsRack.rotation.y = Math.PI / 4;
  commsGroup.add(commsRack);

  const commsScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(1.1, 0.65),
    new THREE.MeshBasicMaterial({
      map: createScreenTexture(
        'EARTH-MOON RELAY DSN',
        [
          'UPLINK: GOLDSTONE 8.4 GHz',
          'DOWNLINK: 142.6 Mbps',
          'LATENCY: 1.284 SECONDS',
        ],
        '#a855f7'
      ),
    })
  );
  commsScreen.position.set(0, 1.3, 0.32);
  commsScreen.rotation.y = Math.PI / 4;
  commsGroup.add(commsScreen);

  group.add(commsGroup);

  // F. STATION 6 (NORTH-EAST WING): Primary ECLSS Life Support Systems
  const eclssGroup = new THREE.Group();
  eclssGroup.position.set(3.2, 0.45, -3.2);

  const eclssRack = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.2, 0.6), darkFrameMat);
  eclssRack.position.set(0, 1.1, 0);
  eclssRack.rotation.y = -Math.PI / 4;
  eclssGroup.add(eclssRack);

  const eclssScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(1.1, 0.65),
    new THREE.MeshBasicMaterial({
      map: createScreenTexture(
        'ECLSS LIFE SUPPORT',
        [
          'PRESSURE: 101.3 kPa [1.0 ATM]',
          'OXYGEN RECOVERY: 98.6%',
          'CO2 SCRUBBERS: ACTIVE',
        ],
        '#10b981'
      ),
    })
  );
  eclssScreen.position.set(0, 1.3, 0.32);
  eclssScreen.rotation.y = -Math.PI / 4;
  eclssGroup.add(eclssScreen);

  group.add(eclssGroup);

  // -------------------------------------------------------------
  // 7. Ambient Cozy Interior Lighting
  // -------------------------------------------------------------
  const cabinLightWarm = new THREE.PointLight(0xfff3d6, 1.6, 14, 1.4);
  cabinLightWarm.position.set(0, 0.45 + habWallHeight - 0.4, 0);
  group.add(cabinLightWarm);

  const cabinLightNorth = new THREE.PointLight(0xffedd5, 1.2, 10, 1.5);
  cabinLightNorth.position.set(0, 0.45 + habWallHeight - 0.6, -3.0);
  group.add(cabinLightNorth);

  // -------------------------------------------------------------
  // World Coordinates & Mathematical Physics Helpers
  // -------------------------------------------------------------
  const airlockWorldX = posX;
  const airlockWorldZ = posZ + 8.2 + airlockLength / 2; // ~ -8.0
  const airlockWorldY = sampleLunarElevation(airlockWorldX, airlockWorldZ);

  return {
    group,
    worldX: posX,
    worldY: groundY,
    worldZ: posZ,
    airlockX: airlockWorldX,
    airlockY: airlockWorldY,
    airlockZ: airlockWorldZ,
    floorY,
    radius: habRadius,

    canInteractAirlock: (px: number, pz: number) => {
      const dx = px - airlockWorldX;
      const dz = pz - airlockWorldZ;
      return Math.hypot(dx, dz) <= HABITAT_AIRLOCK_RADIUS;
    },

    distanceToAirlock: (px: number, pz: number) => {
      return Math.hypot(px - airlockWorldX, pz - airlockWorldZ);
    },

    isInside: (px: number, pz: number) => {
      const dx = px - posX;
      const dz = pz - posZ;
      const distToCenter = Math.hypot(dx, dz);
      // Main room dome
      if (distToCenter <= habRadius - 0.1) return true;
      // Airlock vestibule corridor
      if (Math.abs(dx) <= airlockWidth / 2 && dz >= 5.5 && dz <= 8.2 + airlockLength / 2) {
        return true;
      }
      return false;
    },

    getFloorHeight: (px: number, pz: number) => {
      const dx = px - posX;
      const dz = pz - posZ;
      const distToCenter = Math.hypot(dx, dz);

      // Inside main room dome
      if (distToCenter <= habRadius - 0.15) {
        return floorY;
      }

      // Inside airlock vestibule
      const vestibuleEnd = 8.2 + airlockLength / 2;
      if (Math.abs(dx) <= airlockWidth / 2 && dz >= 5.5 && dz <= vestibuleEnd) {
        return floorY;
      }

      // Walking down the entrance ramp to regolith
      const rampEnd = vestibuleEnd + rampLength;
      if (Math.abs(dx) <= rampWidth / 2 + 0.3 && dz > vestibuleEnd && dz <= rampEnd) {
        const t = (dz - vestibuleEnd) / rampLength;
        const groundAtRampEnd = sampleLunarElevation(px, posZ + rampEnd);
        return floorY * (1.0 - t) + groundAtRampEnd * t;
      }

      return null;
    },

    constrainRoverPosition: (
      _currX: number,
      _currZ: number,
      nextX: number,
      nextZ: number,
      roverRadius = 1.3
    ) => {
      let hit = false;
      let normalX = 0;
      let normalZ = 0;

      // 1. Habitat Main Cylindrical Hull & Heavy Foundation Plinth
      // Plinth radius is habRadius + 1.5 = 8.1m. With rover radius: 9.4m minimum distance.
      const minHabDist = habRadius + 1.5 + roverRadius; // 9.4m
      const dxHab = nextX - posX;
      const dzHab = nextZ - posZ;
      const distHab = Math.hypot(dxHab, dzHab);

      if (distHab < minHabDist) {
        hit = true;
        const inv = 1.0 / (distHab || 0.001);
        normalX = dxHab * inv;
        normalZ = dzHab * inv;
        nextX = posX + normalX * minHabDist;
        nextZ = posZ + normalZ * minHabDist;
      }

      // 2. Airlock Vestibule & Entrance Ramp Bounding Box (Impassable for vehicles)
      const boxMinX = posX - airlockWidth / 2 - roverRadius - 0.2; // ~ -25.1
      const boxMaxX = posX + airlockWidth / 2 + roverRadius + 0.2; // ~ -18.9
      const boxMinZ = posZ + 5.0 - roverRadius;                   // ~ -14.3
      const boxMaxZ = posZ + 8.2 + airlockLength / 2 + rampLength + roverRadius; // ~ -4.1

      if (nextX > boxMinX && nextX < boxMaxX && nextZ > boxMinZ && nextZ < boxMaxZ) {
        hit = true;
        const dL = Math.abs(nextX - boxMinX);
        const dR = Math.abs(boxMaxX - nextX);
        const dF = Math.abs(boxMaxZ - nextZ);
        const minEdge = Math.min(dL, dR, dF);

        if (minEdge === dL) {
          nextX = boxMinX;
          normalX = -1;
          normalZ = 0;
        } else if (minEdge === dR) {
          nextX = boxMaxX;
          normalX = 1;
          normalZ = 0;
        } else {
          nextZ = boxMaxZ;
          normalX = 0;
          normalZ = 1;
        }
      }

      // 3. Rover Bay 01 Charging Tower Obstacle (at X: -17.8, Z: -4.5)
      const towerX = -17.8;
      const towerZ = -4.5;
      const towerMinDist = 0.8 + roverRadius;
      const dxTower = nextX - towerX;
      const dzTower = nextZ - towerZ;
      const distTower = Math.hypot(dxTower, dzTower);

      if (distTower < towerMinDist) {
        hit = true;
        const inv = 1.0 / (distTower || 0.001);
        normalX = dxTower * inv;
        normalZ = dzTower * inv;
        nextX = towerX + normalX * towerMinDist;
        nextZ = towerZ + normalZ * towerMinDist;
      }

      return { x: nextX, z: nextZ, hit, normalX, normalZ };
    },

    constrainPosition: (currX: number, currZ: number, nextX: number, nextZ: number) => {
      const pRadius = 0.35; // astronaut physical suit radius

      const vestibuleEnd = 8.2 + airlockLength / 2; // 10.0 (world z = -8.0)
      const rampEnd = vestibuleEnd + rampLength; // 12.6 (world z = -5.4)

      const currDx = currX - posX;
      const currDz = currZ - posZ;
      const currDist = Math.hypot(currDx, currDz);

      const isCurrInsideMainRoom = currDist <= habRadius - 0.2;
      const isCurrInVestibule =
        Math.abs(currDx) <= airlockWidth / 2 && currDz >= 5.2 && currDz <= vestibuleEnd + 0.1;
      const isCurrOnRamp =
        Math.abs(currDx) <= rampWidth / 2 + 0.35 && currDz > vestibuleEnd && currDz <= rampEnd + 0.2;

      // -----------------------------------------------------------
      // A. Astronaut is INSIDE the main habitat room
      // -----------------------------------------------------------
      if (isCurrInsideMainRoom) {
        const nextDx = nextX - posX;
        const nextDz = nextZ - posZ;
        const nextDist = Math.hypot(nextDx, nextDz);

        // 1. Outer Wall: Inner padded cylinder is at habRadius - 0.15 = 6.45m
        const maxWalkableRadius = habRadius - 0.15 - pRadius; // ~6.10m
        const isExitingToAirlock = Math.abs(nextDx) <= 1.2 && nextDz >= 5.0;

        if (nextDist > maxWalkableRadius && !isExitingToAirlock) {
          const angle = Math.atan2(nextDx, nextDz);
          nextX = posX + Math.sin(angle) * maxWalkableRadius;
          nextZ = posZ + Math.cos(angle) * maxWalkableRadius;
        }

        // 2. Center Holographic Mission Table (Pedestal collision radius 1.4m)
        const tableDist = Math.hypot(nextX - posX, nextZ - posZ);
        const minTableRadius = 1.35 + pRadius; // 1.70m
        if (tableDist < minTableRadius) {
          const angle = Math.atan2(nextX - posX, nextZ - posZ);
          nextX = posX + Math.sin(angle) * minTableRadius;
          nextZ = posZ + Math.cos(angle) * minTableRadius;
        }

        // 3. West Geology Lab Bench (posX - 4.2 = -26.2, posZ - 0.5 = -18.5)
        const benchMinX = posX - 4.2 - 0.7 - pRadius;
        const benchMaxX = posX - 4.2 + 0.7 + pRadius;
        const benchMinZ = posZ - 0.5 - 1.7 - pRadius;
        const benchMaxZ = posZ - 0.5 + 1.7 + pRadius;
        if (nextX > benchMinX && nextX < benchMaxX && nextZ > benchMinZ && nextZ < benchMaxZ) {
          const dL = Math.abs(nextX - benchMinX);
          const dR = Math.abs(benchMaxX - nextX);
          const dN = Math.abs(nextZ - benchMinZ);
          const dS = Math.abs(benchMaxZ - nextZ);
          const m = Math.min(dL, dR, dN, dS);
          if (m === dL) nextX = benchMinX;
          else if (m === dR) nextX = benchMaxX;
          else if (m === dN) nextZ = benchMinZ;
          else nextZ = benchMaxZ;
        }

        // 4. East Hydroponics Greenhouse Racks (posX + 4.2 = -17.8, posZ - 0.5 = -18.5)
        const rackMinX = posX + 4.2 - 0.6 - pRadius;
        const rackMaxX = posX + 4.2 + 0.6 + pRadius;
        const rackMinZ = posZ - 0.5 - 1.7 - pRadius;
        const rackMaxZ = posZ - 0.5 + 1.7 + pRadius;
        if (nextX > rackMinX && nextX < rackMaxX && nextZ > rackMinZ && nextZ < rackMaxZ) {
          const dL = Math.abs(nextX - rackMinX);
          const dR = Math.abs(rackMaxX - nextX);
          const dN = Math.abs(nextZ - rackMinZ);
          const dS = Math.abs(rackMaxZ - nextZ);
          const m = Math.min(dL, dR, dN, dS);
          if (m === dL) nextX = rackMinX;
          else if (m === dR) nextX = rackMaxX;
          else if (m === dN) nextZ = rackMinZ;
          else nextZ = rackMaxZ;
        }

        // 5. North Crew Berths & Lockers (posX: -22, posZ - 4.5 = -22.5)
        const berthMinX = posX - 1.6 - pRadius;
        const berthMaxX = posX + 1.6 + pRadius;
        const berthMinZ = posZ - 4.5 - 0.8 - pRadius;
        const berthMaxZ = posZ - 4.5 + 0.8 + pRadius;
        if (nextX > berthMinX && nextX < berthMaxX && nextZ > berthMinZ && nextZ < berthMaxZ) {
          const dL = Math.abs(nextX - berthMinX);
          const dR = Math.abs(benchMaxX - nextX);
          const dN = Math.abs(nextZ - berthMinZ);
          const dS = Math.abs(berthMaxZ - nextZ);
          const m = Math.min(dL, dR, dN, dS);
          if (m === dL) nextX = berthMinX;
          else if (m === dR) nextX = berthMaxX;
          else if (m === dN) nextZ = berthMinZ;
          else nextZ = berthMaxZ;
        }

        return { x: nextX, z: nextZ };
      }

      // -----------------------------------------------------------
      // B. Astronaut is INSIDE the Airlock Vestibule
      // -----------------------------------------------------------
      if (isCurrInVestibule) {
        // Constrained between titanium side walls
        const maxSide = airlockWidth / 2 - 0.25 - pRadius; // ~1.0m
        nextX = Math.max(posX - maxSide, Math.min(posX + maxSide, nextX));

        // When moving out toward ramp at vestibuleEnd:
        // Doorway opening is on right side (x between posX - 0.2 and posX + maxSide)
        // Left side has the heavy pressure door (x < posX - 0.2)
        if (nextZ > posZ + vestibuleEnd && nextX < posX - 0.2) {
          nextZ = posZ + vestibuleEnd;
        }

        return { x: nextX, z: nextZ };
      }

      // -----------------------------------------------------------
      // C. Astronaut is on the ENTRANCE RAMP
      // -----------------------------------------------------------
      if (isCurrOnRamp) {
        // Constrained between ramp handrails
        const maxRampSide = rampWidth / 2 - pRadius;
        nextX = Math.max(posX - maxRampSide, Math.min(posX + maxRampSide, nextX));
        return { x: nextX, z: nextZ };
      }

      // -----------------------------------------------------------
      // D. Astronaut is OUTSIDE on lunar regolith
      // -----------------------------------------------------------
      const nextDx = nextX - posX;
      const nextDz = nextZ - posZ;
      const nextDist = Math.hypot(nextDx, nextDz);
      const minOuterRadius = habRadius + 0.1 + pRadius; // 7.05m

      // Can only enter via the entrance ramp (dz >= vestibuleEnd - 0.2 && |dx| <= rampWidth/2)
      const isEnteringRamp =
        Math.abs(nextDx) <= rampWidth / 2 + 0.2 && nextDz >= vestibuleEnd - 0.1;

      // Solid exterior cylindrical hull (cannot walk through outer walls!)
      if (nextDist < minOuterRadius && !isEnteringRamp) {
        const angle = Math.atan2(nextDx, nextDz);
        nextX = posX + Math.sin(angle) * minOuterRadius;
        nextZ = posZ + Math.cos(angle) * minOuterRadius;
      }

      // Solid airlock exterior side walls (cannot walk through from outside!)
      const alMinX = posX - airlockWidth / 2 - 0.15 - pRadius;
      const alMaxX = posX + airlockWidth / 2 + 0.15 + pRadius;
      const alMinZ = posZ + 5.2 - pRadius;
      const alMaxZ = posZ + vestibuleEnd + pRadius;

      if (!isEnteringRamp && nextX > alMinX && nextX < alMaxX && nextZ > alMinZ && nextZ < alMaxZ) {
        if (currX < posX) nextX = alMinX;
        else nextX = alMaxX;
      }

      return { x: nextX, z: nextZ };
    },

    updateAnimation: (time: number, dt: number) => {
      holoMoon.rotation.y += dt * 0.45;
      orbitRing1.rotation.z += dt * 0.35;
      orbitRing2.rotation.z -= dt * 0.28;

      const holoPulse = 1.2 + 0.3 * Math.sin(time * 2.5);
      holoLight.intensity = holoPulse;

      mineralCrystal.rotation.y += dt * 0.8;
      mineralCrystal.rotation.x += dt * 0.4;
      const crystalPulse = 0.8 + 0.4 * Math.sin(time * 3.5);
      crystalLight.intensity = crystalPulse;

      const ledPulse = 0.8 + 0.2 * Math.sin(time * 4.0);
      statusLedMat.color.setRGB(0, 1.0 * ledPulse, 0.53 * ledPulse);
    },
  };
}
