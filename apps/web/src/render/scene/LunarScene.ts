import * as THREE from 'three';
import { EARTH_ANGULAR_DIAMETER_DEG } from '@adventuremnc/shared';
import { createRealisticEarth } from './EarthMesh';

export interface LunarSceneElements {
  scene: THREE.Scene;
  sunLight: THREE.DirectionalLight;
  earthMesh: THREE.Object3D;
  updateSunPosition: (timeSeconds: number) => void;
  update: (dt: number) => void;
}

export function createLunarScene(): LunarSceneElements {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000); // Black space - zero atmospheric fog

  // 1. Directional Sun at low elevation (~1.8°) characteristic of South Pole
  const sunLight = new THREE.DirectionalLight(0xfffaed, 5.0);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  sunLight.shadow.camera.near = 10;
  sunLight.shadow.camera.far = 3500;
  sunLight.shadow.bias = -0.0003;

  const shadowFrustum = 1600;
  sunLight.shadow.camera.left = -shadowFrustum;
  sunLight.shadow.camera.right = shadowFrustum;
  sunLight.shadow.camera.top = shadowFrustum;
  sunLight.shadow.camera.bottom = -shadowFrustum;

  scene.add(sunLight);
  scene.add(sunLight.target);

  // 2. Earth in Sky (tidal locked, fixed position ~11° above horizon)
  const earthDist = 6000;
  const angularRadiusRad = (EARTH_ANGULAR_DIAMETER_DEG * Math.PI) / 360;
  const earthRadius = earthDist * Math.tan(angularRadiusRad);

  const earthSystem = createRealisticEarth(sunLight, earthRadius);
  // Position Earth at azimuth 45°, elevation 11°
  const elevRad = (11 * Math.PI) / 180;
  const azimRad = (45 * Math.PI) / 180;
  earthSystem.group.position.set(
    earthDist * Math.cos(elevRad) * Math.sin(azimRad),
    earthDist * Math.sin(elevRad),
    earthDist * Math.cos(elevRad) * Math.cos(azimRad)
  );
  scene.add(earthSystem.group);

  // 3. Earthshine light: subtle directional fill from Earth direction
  const earthshineLight = new THREE.DirectionalLight(0x7da4d0, 0.05);
  earthshineLight.position.copy(earthSystem.group.position);
  earthshineLight.target.position.set(0, 0, 0);
  scene.add(earthshineLight);
  scene.add(earthshineLight.target);

  // 4. Subtle starfield (faint distant points, low exposure)
  const starCount = 1200;
  const starPositions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount * 3; i += 3) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 2 - 1);
    const r = 7500;
    starPositions[i] = r * Math.sin(phi) * Math.cos(theta);
    starPositions[i + 1] = Math.abs(r * Math.cos(phi)) + 100; // Above horizon
    starPositions[i + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  const starMat = new THREE.PointsMaterial({
    color: 0xaaaaaa,
    size: 1.5,
    sizeAttenuation: false,
  });
  const stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);

  const updateSunPosition = (angleRad: number) => {
    const sunDist = 2500;
    const sunElev = (1.8 * Math.PI) / 180; // ~1.8 deg low elevation
    const sunX = Math.cos(angleRad) * sunDist * Math.cos(sunElev);
    const sunZ = Math.sin(angleRad) * sunDist * Math.cos(sunElev);
    const sunY = sunDist * Math.sin(sunElev);

    sunLight.position.set(sunX, sunY, sunZ);
  };

  updateSunPosition(0.4);

  const update = (dt: number) => {
    earthSystem.update(dt);
  };

  return {
    scene,
    sunLight,
    earthMesh: earthSystem.group,
    updateSunPosition,
    update,
  };
}
