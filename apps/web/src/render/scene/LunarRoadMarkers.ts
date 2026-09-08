import * as THREE from 'three';
import {
  LUNAR_ROAD_SEGMENTS,
  sampleLunarElevation,
} from '@adventuremnc/engine';
import { LUNAR_ROAD_BEACON_SPACING, LUNAR_ROAD_WIDTH } from '@adventuremnc/shared';

export interface LunarRoadMarkersGroup {
  group: THREE.Group;
  updateAnimation: (timeSec: number) => void;
}

/**
 * Procedurally generates roadside solar navigation beacon posts along all lunar routes.
 * Uses InstancedMesh for high rendering efficiency (2 draw calls total).
 */
export function createLunarRoadMarkers(): LunarRoadMarkersGroup {
  const group = new THREE.Group();
  group.name = 'LunarRoadMarkers';

  // Calculate beacon positions along road shoulders
  const beaconPositions: Array<{ x: number; y: number; z: number; isJunction: boolean }> = [];
  const shoulderOffset = (LUNAR_ROAD_WIDTH * 0.5) + 0.6; // ~3.6m from centerline

  for (let sIdx = 0; sIdx < LUNAR_ROAD_SEGMENTS.length; sIdx++) {
    const seg = LUNAR_ROAD_SEGMENTS[sIdx]!;
    const dx = seg.endX - seg.startX;
    const dz = seg.endZ - seg.startZ;
    const segLen = Math.hypot(dx, dz);
    if (segLen < 1.0) continue;

    const dirX = dx / segLen;
    const dirZ = dz / segLen;
    const perpX = -dirZ;
    const perpZ = dirX;

    const count = Math.max(1, Math.floor(segLen / LUNAR_ROAD_BEACON_SPACING));
    const step = segLen / count;

    for (let i = 0; i <= count; i++) {
      const dist = i * step;
      const cx = seg.startX + dirX * dist;
      const cz = seg.startZ + dirZ * dist;

      // Alternate sides (left and right shoulder)
      const side = (i % 2 === 0) ? 1 : -1;
      const bx = cx + perpX * (shoulderOffset * side);
      const bz = cz + perpZ * (shoulderOffset * side);
      const by = sampleLunarElevation(bx, bz);

      // Junction points near Base Crossroads (-15, 28)
      const distToJunction = Math.hypot(bx - (-15), bz - 28);
      const isJunction = distToJunction < 35;

      beaconPositions.push({ x: bx, y: by, z: bz, isJunction });
    }
  }

  const totalBeacons = beaconPositions.length;
  if (totalBeacons === 0) {
    return { group, updateAnimation: () => {} };
  }

  // 1. Instanced Mesh: Stanchion Mast & Solar Cap
  const mastHeight = 1.8;
  const mastRadius = 0.05;
  const mastGeo = new THREE.CylinderGeometry(mastRadius * 0.8, mastRadius, mastHeight, 8);
  mastGeo.translate(0, mastHeight * 0.5, 0);

  const solarGeo = new THREE.BoxGeometry(0.35, 0.04, 0.25);
  solarGeo.translate(0, mastHeight + 0.06, 0);

  // Combine geometries for a single mast draw call
  const mastMat = new THREE.MeshStandardMaterial({
    color: 0x374151,
    roughness: 0.6,
    metalness: 0.8,
  });

  const mastInstances = new THREE.InstancedMesh(mastGeo, mastMat, totalBeacons);
  mastInstances.castShadow = true;
  mastInstances.receiveShadow = true;

  // 2. Instanced Mesh: Pulsing Navigation LED Beacon Lens
  const lampRadius = 0.12;
  const lampGeo = new THREE.SphereGeometry(lampRadius, 8, 8);
  lampGeo.translate(0, mastHeight - 0.08, 0);

  const lampMat = new THREE.MeshStandardMaterial({
    color: 0x00f0ff,
    emissive: 0x00d4ff,
    emissiveIntensity: 2.5,
    roughness: 0.2,
    metalness: 0.1,
  });

  const lampInstances = new THREE.InstancedMesh(lampGeo, lampMat, totalBeacons);

  const dummy = new THREE.Object3D();
  const cyanColor = new THREE.Color(0x00e5ff);
  const amberColor = new THREE.Color(0xffb703);

  for (let i = 0; i < totalBeacons; i++) {
    const b = beaconPositions[i]!;
    dummy.position.set(b.x, b.y, b.z);
    dummy.rotation.set(0, (i * 1.3) % (Math.PI * 2), 0);
    dummy.updateMatrix();

    mastInstances.setMatrixAt(i, dummy.matrix);
    lampInstances.setMatrixAt(i, dummy.matrix);
    lampInstances.setColorAt(i, b.isJunction ? amberColor : cyanColor);
  }

  mastInstances.instanceMatrix.needsUpdate = true;
  lampInstances.instanceMatrix.needsUpdate = true;
  if (lampInstances.instanceColor) lampInstances.instanceColor.needsUpdate = true;

  group.add(mastInstances);
  group.add(lampInstances);

  // Road Waypoint Stencil Signs
  const signGroup = createRoadSigns();
  group.add(signGroup);

  const updateAnimation = (timeSec: number) => {
    // Subtle rhythmic beacon strobe: 1.2 Hz pulse
    const pulse = Math.sin(timeSec * 3.8) * 0.45 + 2.2;
    lampMat.emissiveIntensity = pulse;
  };

  return { group, updateAnimation };
}

function createRoadSigns(): THREE.Group {
  const signs = new THREE.Group();

  const signLocations = [
    {
      x: -18,
      z: 3,
      text: 'MNC HAUL ROUTE 01\nSHACKLETON MINING SECTOR',
      yaw: Math.PI * 0.15,
    },
    {
      x: -12,
      z: 32,
      text: 'ROUTE 01 // NORTH RIDGE PASS\nROUTE 02 // RADIO RELAY SPUR',
      yaw: -Math.PI * 0.2,
    },
    {
      x: 115,
      z: 155,
      text: 'CRATER VISTA OVERLOOK\nGRADE 8% // TRACTION CAUTION',
      yaw: -Math.PI * 0.35,
    },
  ];

  for (const s of signLocations) {
    const y = sampleLunarElevation(s.x, s.z);
    const postGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.6, 6);
    postGeo.translate(0, 0.8, 0);
    const postMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.6 });
    const post = new THREE.Mesh(postGeo, postMat);

    const boardCanvas = document.createElement('canvas');
    boardCanvas.width = 512;
    boardCanvas.height = 256;
    const ctx = boardCanvas.getContext('2d')!;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 512, 256);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 12;
    ctx.strokeRect(6, 6, 500, 244);

    ctx.fillStyle = '#ffb703';
    ctx.font = 'bold 26px monospace';
    ctx.textAlign = 'center';
    const lines = s.text.split('\n');
    ctx.fillText(lines[0] ?? '', 256, 110);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 20px monospace';
    ctx.fillText(lines[1] ?? '', 256, 170);

    const boardTex = new THREE.CanvasTexture(boardCanvas);
    const boardMat = new THREE.MeshStandardMaterial({
      map: boardTex,
      roughness: 0.4,
      metalness: 0.2,
    });
    const board = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.7), boardMat);
    board.position.set(0, 1.4, 0);

    const signUnit = new THREE.Group();
    signUnit.position.set(s.x, y, s.z);
    signUnit.rotation.y = s.yaw;
    signUnit.add(post);
    signUnit.add(board);
    signs.add(signUnit);
  }

  return signs;
}
