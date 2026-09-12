import { expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { createRoverMesh } from './RoverMesh';
vi.mock('../texture/ProceduralTextures', () => ({
  createGoldMliTextures: () => ({ map: null, bumpMap: null }), createTitaniumPlateTextures: () => ({ map: null, bumpMap: null }), createLunarWheelTextures: () => ({ map: null, bumpMap: null }),
}));
it('switches both real spotlights and aims them forward as the rover turns', () => {
  const rover = createRoverMesh();
  const lights: THREE.SpotLight[] = [];
  rover.group.traverse(object => { if (object instanceof THREE.SpotLight) lights.push(object); });
  expect(lights).toHaveLength(2);
  rover.setHeadlights(false);
  expect(lights.every(light => !light.visible)).toBe(true);
  rover.setHeadlights(true);
  rover.updatePose(10, 150, -20, Math.PI / 2, 0, 0, 0, 0);
  rover.group.updateMatrixWorld(true);
  for (const light of lights) {
    expect(light.visible).toBe(true);
    expect(light.distance).toBeGreaterThanOrEqual(50);
    const direction = light.target.getWorldPosition(new THREE.Vector3()).sub(light.getWorldPosition(new THREE.Vector3())).normalize();
    expect(direction.x).toBeLessThan(-0.99);
    expect(Math.abs(direction.z)).toBeLessThan(0.01);
  }
});
