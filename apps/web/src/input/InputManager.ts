import { CharacterInputs } from '@adventuremnc/engine';

export class InputManager {
  private keys = new Set<string>();
  public onToggleCameraMode?: () => void;
  public onRespawn?: () => void;

  constructor() {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      if (e.code === 'KeyV' && this.onToggleCameraMode) {
        this.onToggleCameraMode();
      }
      if (e.code === 'KeyR' && this.onRespawn) {
        this.onRespawn();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });
  }

  public getCharacterInputs(cameraYaw: number): CharacterInputs {
    return {
      moveForward: this.keys.has('KeyW') || this.keys.has('ArrowUp'),
      moveBackward: this.keys.has('KeyS') || this.keys.has('ArrowDown'),
      moveLeft: this.keys.has('KeyA') || this.keys.has('ArrowLeft'),
      moveRight: this.keys.has('KeyD') || this.keys.has('ArrowRight'),
      sprint: this.keys.has('ShiftLeft') || this.keys.has('ShiftRight'),
      jump: this.keys.has('Space'),
      cameraYaw,
    };
  }

  public isKeyDown(code: string): boolean {
    return this.keys.has(code);
  }
}
