import { afterEach, expect, it, vi } from 'vitest';
import { ThirdPersonCamera } from './ThirdPersonCamera';

function setup() {
  vi.stubGlobal('window', new EventTarget());
  vi.stubGlobal('document', new EventTarget());
  return new ThirdPersonCamera(new EventTarget() as HTMLElement, 1.6);
}
afterEach(() => vi.unstubAllGlobals());
it('blends vehicle mount and dismount without resetting the view', () => {
  const camera = setup();
  camera.yaw = 0.8;
  camera.reset(-22, 150, -8);
  const before = camera.camera.position.clone();
  camera.setTargetProfile(6.2, 1.45);
  expect(camera.camera.position.equals(before)).toBe(true);
  camera.updateRover(-20, 150, -8, 1.5, 1 / 60, 0);
  expect(camera.camera.position.distanceTo(before)).toBeLessThan(1);
  expect(camera.yaw).toBe(0.8);
  const mounted = camera.camera.position.clone();
  camera.setTargetProfile(3.6, 1.25);
  camera.update(-22, 150, -8, 1 / 60);
  expect(camera.camera.position.distanceTo(mounted)).toBeLessThan(1);
});
it('relocates at respawn using the current yaw and target profile without a next-frame jump', () => {
  const camera = setup();
  camera.yaw = Math.PI / 2;
  camera.setTargetProfile(3.6, 1.25);
  camera.reset(-22, 150, -8);
  const respawn = camera.camera.position.clone();
  expect(respawn.x).toBeGreaterThan(-22);
  expect(respawn.z).toBeCloseTo(-8);
  camera.update(-22, 150, -8, 1 / 60);
  expect(camera.camera.position.distanceTo(respawn)).toBeLessThan(1e-8);
});
