import * as THREE from 'three';
import { sampleLunarElevation } from '@adventuremnc/engine';
import { HABITAT_AIRLOCK_RADIUS } from '@adventuremnc/shared';

export interface HabitatInstance {
  group: THREE.Group;
  worldX: number;
  worldY: number;
  worldZ: number;
  airlockX: number;
  airlockY: number;
  airlockZ: number;
  canInteractAirlock: (x: number, z: number) => boolean;
  distanceToAirlock: (x: number, z: number) => number;
}

export function createHabitatMesh(posX = -22, posZ = -18): HabitatInstance {
  const group = new THREE.Group();
  const groundY = sampleLunarElevation(posX, posZ);
  group.position.set(posX, groundY, posZ);

  // Materials
  const habitatMat = new THREE.MeshStandardMaterial({
    color: 0xdedede,
    roughness: 0.45,
    metalness: 0.25,
  });

  const goldMliMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    roughness: 0.35,
    metalness: 0.85,
  });

  const darkFrameMat = new THREE.MeshStandardMaterial({
    color: 0x1a202c,
    roughness: 0.7,
    metalness: 0.5,
  });

  const solarCellMat = new THREE.MeshStandardMaterial({
    color: 0x001830,
    roughness: 0.2,
    metalness: 0.9,
  });

  const airlockDoorMat = new THREE.MeshStandardMaterial({
    color: 0x374151,
    roughness: 0.6,
    metalness: 0.4,
  });

  const statusLedMat = new THREE.MeshBasicMaterial({
    color: 0x00ff88,
  });

  // 1. Foundation Plinth / Base Ring
  const plinthGeom = new THREE.CylinderGeometry(7.2, 7.8, 1.2, 24);
  const plinthMesh = new THREE.Mesh(plinthGeom, darkFrameMat);
  plinthMesh.position.y = 0.6;
  group.add(plinthMesh);

  // 2. Main Cylindrical Habitat Pod (Inflatable / Pressure Shell)
  const habBodyGeom = new THREE.CylinderGeometry(6.4, 6.4, 5.5, 24);
  const habBodyMesh = new THREE.Mesh(habBodyGeom, habitatMat);
  habBodyMesh.position.y = 3.8;
  group.add(habBodyMesh);

  // 3. Top Aerodynamic Dome
  const domeGeom = new THREE.SphereGeometry(6.4, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
  const domeMesh = new THREE.Mesh(domeGeom, habitatMat);
  domeMesh.position.y = 6.55;
  group.add(domeMesh);

  // 4. Gold MLI Insulation Band around Habitat
  const mliBandGeom = new THREE.CylinderGeometry(6.46, 6.46, 1.8, 24);
  const mliBandMesh = new THREE.Mesh(mliBandGeom, goldMliMat);
  mliBandMesh.position.y = 3.6;
  group.add(mliBandMesh);

  // 5. Airlock Module (Extending forward towards Z+ from hab)
  const airlockVestibule = new THREE.Group();
  airlockVestibule.position.set(0, 0.6, 6.2);

  const airlockBoxGeom = new THREE.BoxGeometry(3.2, 3.4, 3.8);
  const airlockBoxMesh = new THREE.Mesh(airlockBoxGeom, habitatMat);
  airlockBoxMesh.position.y = 1.7;
  airlockVestibule.add(airlockBoxMesh);

  // Outer Hatch Frame & Door
  const doorFrameGeom = new THREE.BoxGeometry(2.0, 2.6, 0.2);
  const doorFrameMesh = new THREE.Mesh(doorFrameGeom, darkFrameMat);
  doorFrameMesh.position.set(0, 1.6, 1.95);
  airlockVestibule.add(doorFrameMesh);

  const doorGeom = new THREE.BoxGeometry(1.6, 2.2, 0.15);
  const doorMesh = new THREE.Mesh(doorGeom, airlockDoorMat);
  doorMesh.position.set(0, 1.6, 2.0);
  airlockVestibule.add(doorMesh);

  // Airlock Operational Status Lights
  const ledGeom = new THREE.SphereGeometry(0.08, 8, 8);
  const ledLeft = new THREE.Mesh(ledGeom, statusLedMat);
  ledLeft.position.set(-0.7, 2.8, 2.05);
  airlockVestibule.add(ledLeft);

  const ledRight = new THREE.Mesh(ledGeom, statusLedMat);
  ledRight.position.set(0.7, 2.8, 2.05);
  airlockVestibule.add(ledRight);

  // Exterior Airlock Downward Floodlight
  const airlockLight = new THREE.PointLight(0x90e0ef, 1.8, 12, 1.5);
  airlockLight.position.set(0, 3.1, 2.4);
  airlockVestibule.add(airlockLight);

  group.add(airlockVestibule);

  // 6. Solar Panel Trusses (Wing array)
  const solarTruss = new THREE.Group();
  solarTruss.position.set(0, 7.8, 0);

  const trussBeamGeom = new THREE.BoxGeometry(18.0, 0.15, 0.15);
  const trussBeam = new THREE.Mesh(trussBeamGeom, darkFrameMat);
  solarTruss.add(trussBeam);

  // Left & Right Solar Panels
  const panelGeom = new THREE.BoxGeometry(6.5, 0.08, 2.4);
  const panelLeft = new THREE.Mesh(panelGeom, solarCellMat);
  panelLeft.position.set(-6.5, 0.2, 0);
  panelLeft.rotation.x = -0.28; // Angled to catch low lunar sun
  solarTruss.add(panelLeft);

  const panelRight = new THREE.Mesh(panelGeom, solarCellMat);
  panelRight.position.set(6.5, 0.2, 0);
  panelRight.rotation.x = -0.28;
  solarTruss.add(panelRight);

  group.add(solarTruss);

  // 7. Communications Dish & Navigational Beacon
  const mastGeom = new THREE.CylinderGeometry(0.08, 0.08, 2.5, 8);
  const mastMesh = new THREE.Mesh(mastGeom, darkFrameMat);
  mastMesh.position.set(0, 9.8, 0);
  group.add(mastMesh);

  const dishGeom = new THREE.ConeGeometry(1.2, 0.5, 16, 1, true);
  const dishMesh = new THREE.Mesh(dishGeom, habitatMat);
  dishMesh.position.set(0, 10.4, 0);
  dishMesh.rotation.x = 1.2;
  dishMesh.rotation.y = 0.5;
  group.add(dishMesh);

  const beaconGeom = new THREE.SphereGeometry(0.12, 8, 8);
  const beaconMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
  const beaconMesh = new THREE.Mesh(beaconGeom, beaconMat);
  beaconMesh.position.set(0, 11.2, 0);
  group.add(beaconMesh);

  // World coordinates of airlock entrance
  const airlockWorldX = posX;
  const airlockWorldZ = posZ + 8.2;
  const airlockWorldY = sampleLunarElevation(airlockWorldX, airlockWorldZ);

  return {
    group,
    worldX: posX,
    worldY: groundY,
    worldZ: posZ,
    airlockX: airlockWorldX,
    airlockY: airlockWorldY,
    airlockZ: airlockWorldZ,
    canInteractAirlock: (px: number, pz: number) => {
      const dx = px - airlockWorldX;
      const dz = pz - airlockWorldZ;
      return Math.hypot(dx, dz) <= HABITAT_AIRLOCK_RADIUS;
    },
    distanceToAirlock: (px: number, pz: number) => {
      return Math.hypot(px - airlockWorldX, pz - airlockWorldZ);
    },
  };
}
