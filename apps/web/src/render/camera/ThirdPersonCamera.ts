import * as THREE from 'three';
import { sampleLunarElevation } from '@adventuremnc/engine';

export class ThirdPersonCamera {
  public camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;
  private isLocked = false;

  public yaw = 0;
  public pitch = 0.2;
  private distance = 3.6;

  private currentLookAt = new THREE.Vector3();
  private currentCamPos = new THREE.Vector3();

  constructor(domElement: HTMLElement, aspect: number) {
    this.domElement = domElement;
    this.camera = new THREE.PerspectiveCamera(70, aspect, 0.2, 9000);
    this.initEventListeners();
  }

  private initEventListeners(): void {
    this.domElement.addEventListener('click', () => {
      this.domElement.requestPointerLock();
    });

    document.addEventListener('pointerlockchange', () => {
      this.isLocked = document.pointerLockElement === this.domElement;
    });

    document.addEventListener('mousemove', (event) => {
      if (!this.isLocked) return;

      this.yaw -= event.movementX * 0.0022;
      this.pitch -= event.movementY * 0.0022;

      // Clamp pitch between -0.85 (-48 deg) and +1.1 (+63 deg)
      this.pitch = Math.max(-0.85, Math.min(1.1, this.pitch));
    });
  }

  public targetDistance = 3.6;
  public targetLookAtHeight = 1.25;

  public setTargetProfile(distance: number, height: number, snapYaw?: number): void {
    this.targetDistance = distance;
    this.targetLookAtHeight = height;
    if (snapYaw !== undefined) {
      this.yaw = snapYaw;
    }
  }

  public updateRover(
    targetX: number,
    targetY: number,
    targetZ: number,
    roverYaw: number,
    dt: number
  ): void {
    // Smooth chase-camera tracking behind rover heading
    let diff = roverYaw - this.yaw;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    this.yaw += diff * Math.min(1.0, dt * 4.0);

    // Keep pitch comfortable for vehicle driving
    this.pitch = Math.max(0.1, Math.min(0.55, this.pitch));

    this.updateInternal(targetX, targetY, targetZ, dt);
  }

  public update(targetX: number, targetY: number, targetZ: number, dt: number): void {
    this.updateInternal(targetX, targetY, targetZ, dt);
  }

  private updateInternal(targetX: number, targetY: number, targetZ: number, dt: number): void {
    this.distance += (this.targetDistance - this.distance) * Math.min(1.0, dt * 8);

    const targetLookAt = new THREE.Vector3(targetX, targetY + this.targetLookAtHeight, targetZ);

    // Calculate desired spherical camera position relative to target
    const cosPitch = Math.cos(this.pitch);
    const sinPitch = Math.sin(this.pitch);
    const sinYaw = Math.sin(this.yaw);
    const cosYaw = Math.cos(this.yaw);

    const offsetX = this.distance * cosPitch * sinYaw;
    const offsetY = this.distance * sinPitch;
    const offsetZ = this.distance * cosPitch * cosYaw;

    let desiredCamX = targetLookAt.x + offsetX;
    let desiredCamY = targetLookAt.y + offsetY;
    let desiredCamZ = targetLookAt.z + offsetZ;

    // Terrain collision guard
    const groundY = sampleLunarElevation(desiredCamX, desiredCamZ);
    if (desiredCamY < groundY + 0.6) {
      desiredCamY = groundY + 0.6;
    }

    // Smooth camera lag
    const lerpFactor = Math.min(1.0, dt * 14);
    if (this.currentCamPos.lengthSq() === 0) {
      this.currentCamPos.set(desiredCamX, desiredCamY, desiredCamZ);
      this.currentLookAt.copy(targetLookAt);
    } else {
      this.currentCamPos.lerp(new THREE.Vector3(desiredCamX, desiredCamY, desiredCamZ), lerpFactor);
      this.currentLookAt.lerp(targetLookAt, lerpFactor);
    }

    this.camera.position.copy(this.currentCamPos);
    this.camera.lookAt(this.currentLookAt);
  }

  public reset(targetX: number, targetY: number, targetZ: number): void {
    this.currentCamPos.set(targetX, targetY + 1.8, targetZ + 3.6);
    this.currentLookAt.set(targetX, targetY + 1.2, targetZ);
    this.camera.position.copy(this.currentCamPos);
    this.camera.lookAt(this.currentLookAt);
  }
}
