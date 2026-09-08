import * as THREE from 'three';
import { sampleLunarElevation } from '@adventuremnc/engine';
import { HABITAT_AIRLOCK_RADIUS } from '@adventuremnc/shared';
import {
  createThermalTileTextures,
  createQuiltedInteriorTextures,
  createGoldMliTextures,
  createTitaniumPlateTextures,
  createAirlockBulkheadTexture,
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
 * Procedural hexagonal composite floor plating with glowing accent lines.
 */
function createHexFloorTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#1c2026';
  ctx.fillRect(0, 0, 512, 512);

  ctx.strokeStyle = '#2d3748';
  ctx.lineWidth = 3;
  const hexRadius = 40;
  const h = hexRadius * Math.sqrt(3);

  for (let row = -1; row < 14; row++) {
    for (let col = -1; col < 10; col++) {
      const cx = col * hexRadius * 1.5;
      const cy = row * h + (col % 2 === 0 ? 0 : h / 2);

      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i;
        const x = cx + hexRadius * Math.cos(angle);
        const y = cy + hexRadius * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }

  ctx.strokeStyle = 'rgba(0, 240, 255, 0.45)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(256, 0);
  ctx.lineTo(256, 512);
  ctx.moveTo(0, 256);
  ctx.lineTo(512, 256);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(6, 6);
  return texture;
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
  const thermalTiles = createThermalTileTextures();
  const quiltedPadding = createQuiltedInteriorTextures();
  const goldMli = createGoldMliTextures();
  const titaniumPlate = createTitaniumPlateTextures();
  const airlockBulkheadTex = createAirlockBulkheadTexture();

  const habitatExteriorMat = new THREE.MeshStandardMaterial({
    map: thermalTiles.map,
    bumpMap: thermalTiles.bumpMap,
    bumpScale: 0.035,
    roughness: 0.42,
    metalness: 0.22,
  });

  const interiorPaddedMat = new THREE.MeshStandardMaterial({
    map: quiltedPadding.map,
    bumpMap: quiltedPadding.bumpMap,
    bumpScale: 0.05,
    roughness: 0.78,
    metalness: 0.05,
    side: THREE.DoubleSide,
  });

  const goldMliMat = new THREE.MeshStandardMaterial({
    map: goldMli.map,
    bumpMap: goldMli.bumpMap,
    bumpScale: 0.06,
    color: 0xffffff,
    roughness: 0.25,
    metalness: 0.95,
  });

  const darkFrameMat = new THREE.MeshStandardMaterial({
    map: titaniumPlate.map,
    bumpMap: titaniumPlate.bumpMap,
    bumpScale: 0.035,
    color: 0x333b47,
    roughness: 0.55,
    metalness: 0.75,
  });

  const airlockDoorMat = new THREE.MeshStandardMaterial({
    map: airlockBulkheadTex,
    roughness: 0.45,
    metalness: 0.55,
  });

  const solarCellMat = new THREE.MeshStandardMaterial({
    color: 0x001830,
    roughness: 0.2,
    metalness: 0.9,
  });

  const floorMat = new THREE.MeshStandardMaterial({
    map: createHexFloorTexture(),
    roughness: 0.6,
    metalness: 0.4,
  });

  const hazardMat = new THREE.MeshStandardMaterial({
    map: createHazardStripeTexture(),
    roughness: 0.5,
    metalness: 0.3,
  });

  const cupolaGlassMat = new THREE.MeshStandardMaterial({
    color: 0x90e0ef,
    roughness: 0.1,
    metalness: 0.8,
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
  const plinthGeom = new THREE.CylinderGeometry(habRadius + 1.2, habRadius + 1.5, 0.7, 32);
  const plinthMesh = new THREE.Mesh(plinthGeom, darkFrameMat);
  plinthMesh.position.y = 0.35;
  plinthMesh.receiveShadow = true;
  group.add(plinthMesh);

  // Plinth Outer Hazard Border
  const plinthRingGeom = new THREE.RingGeometry(habRadius + 0.9, habRadius + 1.2, 32);
  const plinthRing = new THREE.Mesh(plinthRingGeom, hazardMat);
  plinthRing.rotation.x = -Math.PI / 2;
  plinthRing.position.y = 0.71;
  group.add(plinthRing);

  // -------------------------------------------------------------
  // 2. Interior Room Floor Deck (Level Walking Surface)
  // -------------------------------------------------------------
  const floorMesh = new THREE.Mesh(
    new THREE.CircleGeometry(habRadius - 0.1, 32),
    floorMat
  );
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.position.y = 0.45;
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
  emblemMesh.position.set(0, 0.46, 0);
  group.add(emblemMesh);

  // Recessed Floor Glowing Guide Runners (Cyan & Gold LEDs)
  const runnerMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
  const runnerCentral = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.02, 6.0),
    runnerMat
  );
  runnerCentral.position.set(0, 0.47, 3.0);
  group.add(runnerCentral);

  const runnerCross = new THREE.Mesh(
    new THREE.BoxGeometry(8.0, 0.02, 0.12),
    runnerMat
  );
  runnerCross.position.set(0, 0.47, 0);
  group.add(runnerCross);

  // -------------------------------------------------------------
  // 3. Walls & Pressure Hull Architecture
  // -------------------------------------------------------------
  // Outer Cylindrical Wall (HD Thermal Tiles) with cutout doorway for airlock
  const outerWallGeom = new THREE.CylinderGeometry(
    habRadius + 0.1,
    habRadius + 0.1,
    habWallHeight,
    32,
    1,
    true,
    0.35,
    Math.PI * 2 - 0.7
  );
  const outerWallMesh = new THREE.Mesh(outerWallGeom, habitatExteriorMat);
  outerWallMesh.position.y = 0.45 + habWallHeight / 2;
  group.add(outerWallMesh);

  // Inner Padded Acoustic Quilted Wall (Visible inside the room)
  const innerWallGeom = new THREE.CylinderGeometry(
    habRadius - 0.15,
    habRadius - 0.15,
    habWallHeight - 0.1,
    32,
    1,
    true,
    0.35,
    Math.PI * 2 - 0.7
  );
  const innerWallMesh = new THREE.Mesh(innerWallGeom, interiorPaddedMat);
  innerWallMesh.position.y = 0.45 + habWallHeight / 2;
  group.add(innerWallMesh);

  // Gold MLI Insulation Band on exterior
  const mliBandGeom = new THREE.CylinderGeometry(
    habRadius + 0.15,
    habRadius + 0.15,
    1.4,
    32,
    1,
    true,
    0.35,
    Math.PI * 2 - 0.7
  );
  const mliBand = new THREE.Mesh(mliBandGeom, goldMliMat);
  mliBand.position.y = 0.45 + 1.8;
  group.add(mliBand);

  // Vertical Titanium Structural Bulkhead Ribs (8 ribs around perimeter)
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI * 2 * i) / 8;
    if (Math.abs(angle - Math.PI / 2) < 0.45) continue;
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
  // 4. Roof Geodesic Dome with Panoramic Observation Cupola
  // -------------------------------------------------------------
  const domeRadius = habRadius + 0.1;
  const domeHeight = 3.2;
  const domeGeom = new THREE.SphereGeometry(
    domeRadius,
    32,
    16,
    0,
    Math.PI * 2,
    0,
    Math.PI * 0.38
  );
  const domeMesh = new THREE.Mesh(domeGeom, habitatExteriorMat);
  domeMesh.position.y = 0.45 + habWallHeight;
  group.add(domeMesh);

  // Roof Observation Cupola (Multi-pane Skylight looking into space & Earth!)
  const cupolaRing = new THREE.Mesh(
    new THREE.TorusGeometry(2.4, 0.14, 8, 24),
    darkFrameMat
  );
  cupolaRing.rotation.x = Math.PI / 2;
  cupolaRing.position.y = 0.45 + habWallHeight + domeHeight - 0.2;
  group.add(cupolaRing);

  const cupolaGlass = new THREE.Mesh(
    new THREE.SphereGeometry(2.4, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.25),
    cupolaGlassMat
  );
  cupolaGlass.position.y = 0.45 + habWallHeight + domeHeight - 0.2;
  group.add(cupolaGlass);

  // Roof Comms Mast & Navigational Beacon
  const commsMast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.08, 3.2, 8),
    darkFrameMat
  );
  commsMast.position.set(0, 0.45 + habWallHeight + domeHeight + 1.4, 0);
  group.add(commsMast);

  const dishGeom = new THREE.ConeGeometry(1.4, 0.6, 16, 1, true);
  const dishMesh = new THREE.Mesh(dishGeom, darkFrameMat);
  dishMesh.position.set(0, 0.45 + habWallHeight + domeHeight + 2.2, 0);
  dishMesh.rotation.x = 1.25;
  dishMesh.rotation.y = 0.6;
  group.add(dishMesh);

  const roofBeacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 8, 8),
    cyanGlowMat
  );
  roofBeacon.position.set(0, 0.45 + habWallHeight + domeHeight + 3.1, 0);
  group.add(roofBeacon);

  // Large Photovoltaic Solar Array Wings
  const solarTruss = new THREE.Group();
  solarTruss.position.set(0, 0.45 + habWallHeight + domeHeight - 0.4, 0);
  const trussBeam = new THREE.Mesh(
    new THREE.BoxGeometry(19.0, 0.18, 0.18),
    darkFrameMat
  );
  solarTruss.add(trussBeam);

  const panelGeom = new THREE.BoxGeometry(7.2, 0.08, 2.6);
  const panelLeft = new THREE.Mesh(panelGeom, solarCellMat);
  panelLeft.position.set(-6.8, 0.25, 0);
  panelLeft.rotation.x = -0.28;
  solarTruss.add(panelLeft);

  const panelRight = new THREE.Mesh(panelGeom, solarCellMat);
  panelRight.position.set(6.8, 0.25, 0);
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

  // Airlock Floor Plate
  const airlockFloor = new THREE.Mesh(
    new THREE.BoxGeometry(airlockWidth - 0.2, 0.1, airlockLength),
    floorMat
  );
  airlockFloor.position.set(0, 0.45, 0);
  airlockGroup.add(airlockFloor);

  // Left & Right Airlock Side Walls (Industrial Brushed Titanium)
  const wallGeo = new THREE.BoxGeometry(0.2, airlockHeight, airlockLength);
  const leftWall = new THREE.Mesh(wallGeo, darkFrameMat);
  leftWall.position.set(-airlockWidth / 2, 0.45 + airlockHeight / 2, 0);
  airlockGroup.add(leftWall);

  const rightWall = new THREE.Mesh(wallGeo, darkFrameMat);
  rightWall.position.set(airlockWidth / 2, 0.45 + airlockHeight / 2, 0);
  airlockGroup.add(rightWall);

  // Airlock Ceiling Roof
  const ceilingGeo = new THREE.BoxGeometry(airlockWidth, 0.2, airlockLength);
  const airlockRoof = new THREE.Mesh(ceilingGeo, darkFrameMat);
  airlockRoof.position.set(0, 0.45 + airlockHeight, 0);
  airlockGroup.add(airlockRoof);

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
  const rampMesh = new THREE.Mesh(rampGeom, floorMat);
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

    constrainPosition: (currX: number, currZ: number, nextX: number, nextZ: number) => {
      const dx = nextX - posX;
      const dz = nextZ - posZ;
      const dist = Math.hypot(dx, dz);

      const vestibuleEnd = 8.2 + airlockLength / 2;
      const rampEnd = vestibuleEnd + rampLength;
      const inCorridor = Math.abs(dx) <= airlockWidth / 2 - 0.2 && dz >= 5.0 && dz <= rampEnd + 0.5;

      const maxInnerRadius = habRadius - 0.3;
      if (dist > maxInnerRadius && !inCorridor) {
        const prevDx = currX - posX;
        const prevDz = currZ - posZ;
        const prevDist = Math.hypot(prevDx, prevDz);

        if (prevDist <= maxInnerRadius + 0.2) {
          const angle = Math.atan2(dx, dz);
          return {
            x: posX + Math.sin(angle) * maxInnerRadius,
            z: posZ + Math.cos(angle) * maxInnerRadius,
          };
        }
      }

      if (dz >= 6.0 && dz <= vestibuleEnd) {
        const maxSide = airlockWidth / 2 - 0.35;
        if (Math.abs(dx) > maxSide) {
          return {
            x: posX + Math.sign(dx) * maxSide,
            z: nextZ,
          };
        }
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
