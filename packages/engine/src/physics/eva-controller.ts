import {
  LUNAR_GRAVITY,
  EVA_JUMP_VELOCITY,
  EVA_WALK_SPEED,
  EVA_SPRINT_SPEED,
  EVA_TRACTION_ACCEL,
  EVA_DECEL,
  EVA_SAFE_IMPACT_VELOCITY,
  EVA_FALL_DAMAGE_COEFF,
  EVA_AIR_CONTROL,
} from '@adventuremnc/shared';
import { sampleLunarElevation } from '../terrain/lunar-dem';

export interface CharacterInputs {
  moveForward: boolean;
  moveBackward: boolean;
  moveLeft: boolean;
  moveRight: boolean;
  sprint: boolean;
  jump: boolean;
  cameraYaw: number;
}

export interface CharacterState {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  yaw: number;
  isGrounded: boolean;
  health: number;
  isDead: boolean;
  lastImpactSpeed: number;
  lopingCycle: number;
  jumpApex: number;
}

export class EvaCharacterController {
  private state: CharacterState;
  private jumpStartY = 0;
  private inJumpMeasurement = false;

  constructor(startX = 0, startZ = 0) {
    const groundY = sampleLunarElevation(startX, startZ);
    this.state = {
      x: startX,
      y: groundY,
      z: startZ,
      vx: 0,
      vy: 0,
      vz: 0,
      yaw: 0,
      isGrounded: true,
      health: 100,
      isDead: false,
      lastImpactSpeed: 0,
      lopingCycle: 0,
      jumpApex: 0,
    };
  }

  public getState(): CharacterState {
    return { ...this.state };
  }

  public setState(partial: Partial<CharacterState>): void {
    this.state = { ...this.state, ...partial };
  }

  public update(inputs: CharacterInputs, dt: number): void {
    if (this.state.isDead) return;

    const groundY = sampleLunarElevation(this.state.x, this.state.z);

    // 1. Horizontal Input & Movement Direction (Camera-Relative)
    const fwdInput = (inputs.moveForward ? 1 : 0) - (inputs.moveBackward ? 1 : 0);
    const rightInput = (inputs.moveRight ? 1 : 0) - (inputs.moveLeft ? 1 : 0);
    const hasInput = fwdInput !== 0 || rightInput !== 0;

    let targetVx = 0;
    let targetVz = 0;

    if (hasInput) {
      const len = Math.hypot(fwdInput, rightInput);
      const nf = fwdInput / len;
      const nr = rightInput / len;

      const cosYaw = Math.cos(inputs.cameraYaw);
      const sinYaw = Math.sin(inputs.cameraYaw);

      // Camera horizontal forward: (-sinYaw, -cosYaw)
      // Camera horizontal right:   (cosYaw, -sinYaw)
      const worldWishX = nf * (-sinYaw) + nr * cosYaw;
      const worldWishZ = nf * (-cosYaw) + nr * (-sinYaw);

      const targetSpeed = inputs.sprint ? EVA_SPRINT_SPEED : EVA_WALK_SPEED;
      targetVx = worldWishX * targetSpeed;
      targetVz = worldWishZ * targetSpeed;

      // Smoothly rotate character to face movement direction
      const targetYaw = Math.atan2(worldWishX, worldWishZ);
      let yawDiff = targetYaw - this.state.yaw;
      while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
      while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
      this.state.yaw += yawDiff * Math.min(1.0, dt * 18.0);
    }

    // 2. Traction & Inertia Integration
    if (this.state.isGrounded) {
      if (hasInput) {
        // Accelerate with low regolith traction, with traction boost when changing directions
        const dvX = targetVx - this.state.vx;
        const dvZ = targetVz - this.state.vz;
        const dvLen = Math.sqrt(dvX * dvX + dvZ * dvZ);
        const isCounterMove = (targetVx * this.state.vx + targetVz * this.state.vz) < 0;
        const tractionFactor = isCounterMove ? 2.5 : 1.0;
        const maxStep = EVA_TRACTION_ACCEL * tractionFactor * dt;

        if (dvLen <= maxStep) {
          this.state.vx = targetVx;
          this.state.vz = targetVz;
        } else {
          this.state.vx += (dvX / dvLen) * maxStep;
          this.state.vz += (dvZ / dvLen) * maxStep;
        }
      } else {
        // Decelerate / slide on regolith
        const curSpeed = Math.sqrt(this.state.vx * this.state.vx + this.state.vz * this.state.vz);
        const decelStep = (EVA_DECEL * 1.5) * dt;
        if (curSpeed <= decelStep) {
          this.state.vx = 0;
          this.state.vz = 0;
        } else {
          this.state.vx -= (this.state.vx / curSpeed) * decelStep;
          this.state.vz -= (this.state.vz / curSpeed) * decelStep;
        }
      }

      // Jump initiation
      if (inputs.jump) {
        this.state.vy = EVA_JUMP_VELOCITY;
        this.state.isGrounded = false;
        this.jumpStartY = this.state.y;
        this.inJumpMeasurement = true;
        this.state.jumpApex = 0;
      }

      // Loping gait cycle advance
      const hSpeed = Math.sqrt(this.state.vx * this.state.vx + this.state.vz * this.state.vz);
      this.state.lopingCycle = (this.state.lopingCycle + hSpeed * dt * 3.5) % (Math.PI * 2);
    } else {
      // IN FLIGHT (VACUUM): Zero air control
      if (EVA_AIR_CONTROL > 0) {
        this.state.vx += targetVx * EVA_AIR_CONTROL * dt;
        this.state.vz += targetVz * EVA_AIR_CONTROL * dt;
      }

      // Gravity: continuous acceleration downward without terminal velocity
      this.state.vy -= LUNAR_GRAVITY * dt;

      // Track jump apex
      if (this.inJumpMeasurement) {
        const currentAltitude = this.state.y - this.jumpStartY;
        if (currentAltitude > this.state.jumpApex) {
          this.state.jumpApex = currentAltitude;
        }
      }
    }

    // 3. Position Integration
    this.state.x += this.state.vx * dt;
    this.state.y += this.state.vy * dt;
    this.state.z += this.state.vz * dt;

    // 4. Ground Collision, Slope Snapping & Fall Damage
    const distAboveGround = this.state.y - groundY;
    if (this.state.isGrounded && !this.inJumpMeasurement && distAboveGround > 0 && distAboveGround <= 0.45) {
      this.state.y = groundY;
      this.state.vy = 0;
    }

    if (this.state.y <= groundY) {
      if (!this.state.isGrounded) {
        // Impact occurs
        const impactSpeed = Math.abs(this.state.vy);
        this.state.lastImpactSpeed = impactSpeed;
        this.inJumpMeasurement = false;

        if (impactSpeed > EVA_SAFE_IMPACT_VELOCITY) {
          const excess = impactSpeed - EVA_SAFE_IMPACT_VELOCITY;
          const damage = excess * excess * EVA_FALL_DAMAGE_COEFF;
          this.state.health = Math.max(0, this.state.health - damage);
          if (this.state.health <= 0) {
            this.state.isDead = true;
          }
        }
      }

      this.state.y = groundY;
      this.state.vy = 0;
      this.state.isGrounded = true;
    }
  }
}
