import * as THREE from 'three';

export class FlyCamera {
  public camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;
  private isLocked = false;

  private moveForward = false;
  private moveBackward = false;
  private moveLeft = false;
  private moveRight = false;
  private moveUp = false;
  private moveDown = false;
  private turbo = false;

  private euler = new THREE.Euler(0, 0, 0, 'YXZ');
  private velocity = new THREE.Vector3();

  constructor(domElement: HTMLElement, aspect: number) {
    this.domElement = domElement;
    this.camera = new THREE.PerspectiveCamera(70, aspect, 0.5, 9000);
    this.camera.position.set(0, 180, 200);

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

      const movementX = event.movementX || 0;
      const movementY = event.movementY || 0;

      this.euler.setFromQuaternion(this.camera.quaternion);
      this.euler.y -= movementX * 0.0022;
      this.euler.x -= movementY * 0.0022;

      // Clamp vertical pitch to avoid flipping
      this.euler.x = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.euler.x));

      this.camera.quaternion.setFromEuler(this.euler);
    });

    window.addEventListener('keydown', (event) => {
      this.handleKey(event.code, true);
    });

    window.addEventListener('keyup', (event) => {
      this.handleKey(event.code, false);
    });
  }

  private handleKey(code: string, pressed: boolean): void {
    switch (code) {
      case 'KeyW':
        this.moveForward = pressed;
        break;
      case 'KeyS':
        this.moveBackward = pressed;
        break;
      case 'KeyA':
        this.moveLeft = pressed;
        break;
      case 'KeyD':
        this.moveRight = pressed;
        break;
      case 'Space':
        this.moveUp = pressed;
        break;
      case 'KeyC':
        this.moveDown = pressed;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.turbo = pressed;
        break;
    }
  }

  public update(dt: number): void {
    const speed = this.turbo ? 120 : 30; // m/s

    const moveVector = new THREE.Vector3();
    if (this.moveForward) moveVector.z -= 1;
    if (this.moveBackward) moveVector.z += 1;
    if (this.moveLeft) moveVector.x -= 1;
    if (this.moveRight) moveVector.x += 1;
    if (this.moveUp) moveVector.y += 1;
    if (this.moveDown) moveVector.y -= 1;

    if (moveVector.lengthSq() > 0) {
      moveVector.normalize();
    }

    // Transform by camera rotation
    moveVector.applyQuaternion(this.camera.quaternion);

    this.velocity.copy(moveVector).multiplyScalar(speed);
    this.camera.position.addScaledVector(this.velocity, dt);
  }

  public getPosition(): THREE.Vector3 {
    return this.camera.position;
  }
}
