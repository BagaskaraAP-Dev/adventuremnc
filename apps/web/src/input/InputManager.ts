import { CharacterInputs } from '@adventuremnc/engine';

export class InputManager {
  private keys = new Set<string>();
  public onToggleCameraMode?: () => void;
  public onRespawn?: () => void;
  public onInteract?: () => void;

  constructor() {
    window.addEventListener('keydown', (e) => {
      // If typing in an input field (e.g. terminal input), ignore game movement inputs
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      this.keys.add(e.code);
      if (e.code === 'KeyV' && this.onToggleCameraMode) {
        this.onToggleCameraMode();
      }
      if (e.code === 'KeyR' && this.onRespawn) {
        this.onRespawn();
      }
      if (e.code === 'KeyE' && this.onInteract) {
        this.onInteract();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });

    window.addEventListener('blur', () => {
      this.keys.clear();
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

  public getRoverInputs(): { throttle: number; steer: number; handbrake: boolean } {
    let throttle = 0;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) throttle += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) throttle -= 1;

    let steer = 0;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) steer += 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) steer -= 1;

    return {
      throttle,
      steer,
      handbrake: this.keys.has('Space'),
    };
  }

  public isKeyDown(code: string): boolean {
    return this.keys.has(code);
  }

  public clearKeys(): void {
    this.keys.clear();
  }
}
