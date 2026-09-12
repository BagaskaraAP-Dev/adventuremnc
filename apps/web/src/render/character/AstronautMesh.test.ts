import { expect, it } from 'vitest';
import * as THREE from 'three';
import { createAstronautMesh } from './AstronautMesh';

it('shows an unobstructed, symmetric gold visor across the front of the helmet', () => {
  const { group } = createAstronautMesh();
  group.updateMatrixWorld(true);
  for (const x of [-0.14, 0, 0.14]) {
    for (const y of [1.45, 1.55, 1.65]) {
      const ray = new THREE.Raycaster(new THREE.Vector3(x, y, 1), new THREE.Vector3(0, 0, -1));
      expect(ray.intersectObject(group, true)[0]?.object.name).toBe('helmet-visor');
    }
  }
});

it('keeps a solid white shell at the sides, crown and back', () => {
  const { group } = createAstronautMesh();
  group.updateMatrixWorld(true);
  const center = new THREE.Vector3(0, 1.55, 0);
  for (const offset of [new THREE.Vector3(-1, 0, 0), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, -1)]) {
    const ray = new THREE.Raycaster(center.clone().add(offset), offset.clone().negate());
    expect(ray.intersectObject(group, true)[0]?.object.name).toBe('helmet-shell');
  }
});

it('keeps the helmet attached and facing forward through seated and walking poses', () => {
  const astronaut = createAstronautMesh();
  const helmet = astronaut.group.getObjectByName('helmet');
  expect(helmet).toBeDefined();
  if (!helmet) throw new Error('Helmet missing');
  const localPosition = helmet.position.clone();
  for (const seated of [true, false]) {
    astronaut.setSeatedPose(seated, 0.4);
    astronaut.updateAnimation(0.5, true, 0, 2);
    astronaut.group.updateMatrixWorld(true);
    expect(helmet.position.equals(localPosition)).toBe(true);
    const forward = new THREE.Vector3(0, 0, 1).transformDirection(helmet.matrixWorld);
    expect(forward.z).toBeGreaterThan(0.98);
  }
});
