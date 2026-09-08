import * as THREE from 'three';
import { sampleLunarElevation } from '@adventuremnc/engine';

export interface RoverBayInstance {
  group: THREE.Group;
  worldX: number;
  worldY: number;
  worldZ: number;
  updateAnimation: (time: number) => void;
}

/**
 * Creates procedural yellow & black hazard warning stripe texture for landing apron borders.
 */
function createHazardStripeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#ffb703'; // High-contrast safety yellow
  ctx.fillRect(0, 0, 256, 256);

  ctx.fillStyle = '#12151a'; // Deep matte carbon black
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
 * Creates illuminated tactical signage texture for the Rover Bay.
 */
function createBaySignTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0a0e14';
  ctx.fillRect(0, 0, 512, 128);

  ctx.strokeStyle = '#00f0ff';
  ctx.lineWidth = 4;
  ctx.strokeRect(6, 6, 500, 116);

  ctx.fillStyle = '#00f0ff';
  ctx.font = 'bold 30px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('LUNAR ROVER BAY 01', 256, 52);

  ctx.fillStyle = '#00ff88';
  ctx.font = 'bold 20px monospace';
  ctx.fillText('⚡ RAPID CHARGING & DOCK // READY', 256, 92);

  return new THREE.CanvasTexture(canvas);
}

export function createRoverBayMesh(posX = -14, posZ = -10): RoverBayInstance {
  const group = new THREE.Group();
  const groundY = sampleLunarElevation(posX, posZ);
  group.position.set(posX, groundY, posZ);

  // Materials
  const tarmacMat = new THREE.MeshStandardMaterial({
    color: 0x22262c,
    roughness: 0.8,
    metalness: 0.25,
  });

  const hazardMat = new THREE.MeshStandardMaterial({
    map: createHazardStripeTexture(),
    roughness: 0.5,
    metalness: 0.3,
  });

  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x2b303a,
    roughness: 0.5,
    metalness: 0.8,
  });

  const solarMat = new THREE.MeshStandardMaterial({
    color: 0x001833,
    roughness: 0.15,
    metalness: 0.9,
  });

  const amberLightMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
  const greenLightMat = new THREE.MeshBasicMaterial({ color: 0x00ff88 });

  // 1. Heavy-duty Rover Parking Pad (Octagonal Platform)
  const padGeom = new THREE.CylinderGeometry(3.6, 3.8, 0.2, 8);
  const padMesh = new THREE.Mesh(padGeom, tarmacMat);
  padMesh.position.y = 0.1;
  padMesh.receiveShadow = true;
  group.add(padMesh);

  // Pad Hazard Warning Perimeter Ring
  const ringGeom = new THREE.RingGeometry(3.2, 3.6, 8);
  const ringMesh = new THREE.Mesh(ringGeom, hazardMat);
  ringMesh.rotation.x = -Math.PI / 2;
  ringMesh.position.y = 0.21;
  group.add(ringMesh);

  // 4 Perimeter Runway Approach Beacons
  const cornerCoords: Array<[number, number]> = [
    [-2.6, -2.6],
    [2.6, -2.6],
    [-2.6, 2.6],
    [2.6, 2.6],
  ];
  for (const [cx, cz] of cornerCoords) {
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.35, 8),
      frameMat
    );
    post.position.set(cx, 0.3, cz);
    group.add(post);

    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 8, 8),
      amberLightMat
    );
    bulb.position.set(cx, 0.48, cz);
    group.add(bulb);
  }

  // 2. Solar Charging Mast & Power Gantry (East side of pad)
  const gantryGroup = new THREE.Group();
  gantryGroup.position.set(3.2, 0.2, 0);

  // Main Vertical Truss
  const towerGeom = new THREE.BoxGeometry(0.25, 4.0, 0.25);
  const tower = new THREE.Mesh(towerGeom, frameMat);
  tower.position.y = 2.0;
  gantryGroup.add(tower);

  // Angled Solar Panel Array
  const solarPanel = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 0.08, 1.4),
    solarMat
  );
  solarPanel.position.set(0, 4.0, 0);
  solarPanel.rotation.z = 0.35;
  solarPanel.rotation.x = -0.25;
  gantryGroup.add(solarPanel);

  // Charging Station Terminal Kiosk
  const kiosk = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 1.4, 0.5),
    frameMat
  );
  kiosk.position.set(-0.5, 0.7, 0);
  gantryGroup.add(kiosk);

  // Status Screen / LED on Kiosk
  const kioskLed = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.25, 0.05),
    greenLightMat
  );
  kioskLed.position.set(-0.72, 1.1, 0);
  kioskLed.rotation.y = Math.PI / 2;
  gantryGroup.add(kioskLed);

  // Overhanging Power Boom & Flexible Charging Umbilical Cable
  const boom = new THREE.Mesh(
    new THREE.BoxGeometry(2.0, 0.1, 0.1),
    frameMat
  );
  boom.position.set(-1.0, 3.2, 0);
  gantryGroup.add(boom);

  // Power Cable Curve
  const cableCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 3.2, 0),
    new THREE.Vector3(-1.0, 3.0, 0.2),
    new THREE.Vector3(-1.8, 1.8, 0.1),
    new THREE.Vector3(-2.2, 0.8, 0),
  ]);
  const cableGeom = new THREE.TubeGeometry(cableCurve, 16, 0.035, 8, false);
  const cableMesh = new THREE.Mesh(cableGeom, frameMat);
  gantryGroup.add(cableMesh);

  // Overhead Illuminated Sign
  const signGeom = new THREE.BoxGeometry(2.4, 0.6, 0.1);
  const signMat = new THREE.MeshBasicMaterial({
    map: createBaySignTexture(),
  });
  const signMesh = new THREE.Mesh(signGeom, signMat);
  signMesh.position.set(-0.8, 2.5, 0);
  signMesh.rotation.y = -Math.PI / 2;
  gantryGroup.add(signMesh);

  // High-Intensity Floodlight illuminating the parked rover
  const floodlight = new THREE.SpotLight(0xfff8ee, 3.2, 16, Math.PI / 3, 0.35, 1.2);
  floodlight.position.set(-1.0, 3.3, 0);
  floodlight.target.position.set(-3.2, 0, 0);
  gantryGroup.add(floodlight);
  gantryGroup.add(floodlight.target);

  group.add(gantryGroup);

  return {
    group,
    worldX: posX,
    worldY: groundY,
    worldZ: posZ,
    updateAnimation: (time: number) => {
      const pulse = 0.7 + 0.3 * Math.sin(time * 3.0);
      amberLightMat.color.setRGB(1.0 * pulse, 0.66 * pulse, 0.0);
    },
  };
}
