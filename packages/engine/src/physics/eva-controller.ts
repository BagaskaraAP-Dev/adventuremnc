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
  SUIT_O2_MAX,
  SUIT_O2_BASE_CONSUMPTION,
  SUIT_O2_SPRINT_MULTIPLIER,
  SUIT_TEMP_NOMINAL,
  SUIT_TEMP_FREEZE_THRESHOLD,
  SUIT_TEMP_OVERHEAT_THRESHOLD,
  SUIT_COOLING_RATE_SHADOW,
  SUIT_HEATING_RATE_SUN,
  SUIT_HVAC_REGULATION_RATE,
} from '@adventuremnc/shared';
import { sampleLunarElevation } from '../terrain/lunar-dem';

export type DeathReason =
  | 'NONE'
  | 'FALL_IMPACT'
  | 'ASPHYXIATION'
  | 'HYPOTHERMIA'
  | 'HYPERTHERMIA'
  | 'SUIT_DECOMPRESSION';

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
  deathReason: DeathReason;
  lastImpactSpeed: number;
  lopingCycle: number;
  jumpApex: number;
  // M4 Survival & Life Support Systems
  oxygen: number;
  suitTemperature: number;
  suitIntegrity: number;
  isInSunlight: boolean;
  isInsideShelter: boolean;
}

export interface EnvironmentalContext {
  isInSunlight?: boolean;
  isInsideShelter?: boolean;
  getGroundElevation?: (x: number, z: number) => number;
  constrainPosition?: (
    currX: number,
    currZ: number,
    nextX: number,
    nextZ: number
  ) => { x: number; z: number };
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
      deathReason: 'NONE',
      lastImpactSpeed: 0,
      lopingCycle: 0,
      jumpApex: 0,
      oxygen: SUIT_O2_MAX,
      suitTemperature: SUIT_TEMP_NOMINAL,
      suitIntegrity: 100.0,
      isInSunlight: true,
      isInsideShelter: false,
    };
  }

  public getState(): CharacterState {
    return { ...this.state };
  }

  public setState(partial: Partial<CharacterState>): void {
    this.state = { ...this.state, ...partial };
  }

  public update(
    inputs: CharacterInputs,
    dt: number,
    environmentalContext?: EnvironmentalContext
  ): void {
    if (environmentalContext) {
      if (typeof environmentalContext.isInSunlight === 'boolean') {
        this.state.isInSunlight = environmentalContext.isInSunlight;
      }
      if (typeof environmentalContext.isInsideShelter === 'boolean') {
        this.state.isInsideShelter = environmentalContext.isInsideShelter;
      }
    }

    if (this.state.isDead) return;

    // -------------------------------------------------------------
    // 0. M4 Survival Life Support Dynamics
    // -------------------------------------------------------------
    if (this.state.isInsideShelter) {
      // Recharged in pressurized shelter (Hab airlock / Mining rover cockpit)
      this.state.oxygen = Math.min(SUIT_O2_MAX, this.state.oxygen + 25.0 * dt);
      this.state.suitTemperature +=
        (SUIT_TEMP_NOMINAL - this.state.suitTemperature) * Math.min(1.0, 4.0 * dt);
      this.state.suitIntegrity = Math.min(100.0, this.state.suitIntegrity + 15.0 * dt);
      this.state.health = Math.min(100.0, this.state.health + 10.0 * dt);
    } else {
      // EVA Exposure in Lunar Vacuum
      // A. Oxygen Consumption & Leakage
      const leakFactor =
        this.state.suitIntegrity < 50.0
          ? 1.0 + (50.0 - this.state.suitIntegrity) / 25.0
          : 1.0;
      const speedFactor = inputs.sprint ? SUIT_O2_SPRINT_MULTIPLIER : 1.0;
      const o2Loss = SUIT_O2_BASE_CONSUMPTION * speedFactor * leakFactor * dt;
      this.state.oxygen = Math.max(0, this.state.oxygen - o2Loss);

      if (this.state.oxygen <= 0) {
        // Asphyxiation
        this.state.health = Math.max(0, this.state.health - 22.0 * dt);
        if (this.state.health <= 0) {
          this.state.isDead = true;
          this.state.deathReason = 'ASPHYXIATION';
          return;
        }
      }

      // B. Thermal Dynamics (Sunlight vs Shadow)
      if (this.state.isInSunlight) {
        // Direct solar radiative heating
        const deltaT = (SUIT_HEATING_RATE_SUN - SUIT_HVAC_REGULATION_RATE) * dt;
        this.state.suitTemperature = Math.min(65.0, this.state.suitTemperature + deltaT);

        if (this.state.suitTemperature > SUIT_TEMP_OVERHEAT_THRESHOLD) {
          const damage =
            (this.state.suitTemperature - SUIT_TEMP_OVERHEAT_THRESHOLD) * 1.5 * dt;
          this.state.health = Math.max(0, this.state.health - damage);
          if (this.state.health <= 0) {
            this.state.isDead = true;
            this.state.deathReason = 'HYPERTHERMIA';
            return;
          }
        }
      } else {
        // Deep shadow radiative freeze-out
        const deltaT = (SUIT_COOLING_RATE_SHADOW - SUIT_HVAC_REGULATION_RATE) * dt;
        this.state.suitTemperature = Math.max(-45.0, this.state.suitTemperature - deltaT);

        if (this.state.suitTemperature < SUIT_TEMP_FREEZE_THRESHOLD) {
          const damage =
            (SUIT_TEMP_FREEZE_THRESHOLD - this.state.suitTemperature) * 1.8 * dt;
          this.state.health = Math.max(0, this.state.health - damage);
          if (this.state.health <= 0) {
            this.state.isDead = true;
            this.state.deathReason = 'HYPOTHERMIA';
            return;
          }
        }
      }

      // C. Suit Decompression Check
      if (this.state.suitIntegrity <= 0) {
        this.state.health = Math.max(0, this.state.health - 30.0 * dt);
        if (this.state.health <= 0) {
          this.state.isDead = true;
          this.state.deathReason = 'SUIT_DECOMPRESSION';
          return;
        }
      }
    }

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
      const worldWishX = nf * -sinYaw + nr * cosYaw;
      const worldWishZ = nf * -cosYaw + nr * -sinYaw;

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
        const dvX = targetVx - this.state.vx;
        const dvZ = targetVz - this.state.vz;
        const dvLen = Math.sqrt(dvX * dvX + dvZ * dvZ);
        const isCounterMove = targetVx * this.state.vx + targetVz * this.state.vz < 0;
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
        const curSpeed = Math.sqrt(this.state.vx * this.state.vx + this.state.vz * this.state.vz);
        const decelStep = EVA_DECEL * 1.5 * dt;
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

      // Gravity
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
    const nextX = this.state.x + this.state.vx * dt;
    const nextZ = this.state.z + this.state.vz * dt;
    if (environmentalContext?.constrainPosition) {
      const constrained = environmentalContext.constrainPosition(
        this.state.x,
        this.state.z,
        nextX,
        nextZ
      );
      this.state.x = constrained.x;
      this.state.z = constrained.z;
    } else {
      this.state.x = nextX;
      this.state.z = nextZ;
    }
    this.state.y += this.state.vy * dt;

    const groundY = environmentalContext?.getGroundElevation
      ? environmentalContext.getGroundElevation(this.state.x, this.state.z)
      : sampleLunarElevation(this.state.x, this.state.z);

    // 4. Ground Collision, Slope Snapping & Fall Damage
    const distAboveGround = this.state.y - groundY;
    if (
      this.state.isGrounded &&
      !this.inJumpMeasurement &&
      distAboveGround > 0 &&
      distAboveGround <= 0.45
    ) {
      this.state.y = groundY;
      this.state.vy = 0;
    }

    if (this.state.y <= groundY) {
      if (!this.state.isGrounded) {
        const impactSpeed = Math.abs(this.state.vy);
        this.state.lastImpactSpeed = impactSpeed;
        this.inJumpMeasurement = false;

        if (impactSpeed > EVA_SAFE_IMPACT_VELOCITY) {
          const excess = impactSpeed - EVA_SAFE_IMPACT_VELOCITY;
          const damage = excess * excess * EVA_FALL_DAMAGE_COEFF;
          this.state.suitIntegrity = Math.max(0, this.state.suitIntegrity - excess * 6.5);
          this.state.health = Math.max(0, this.state.health - damage);
          if (this.state.health <= 0) {
            this.state.isDead = true;
            this.state.deathReason = 'FALL_IMPACT';
          }
        }
      }

      this.state.y = groundY;
      this.state.vy = 0;
      this.state.isGrounded = true;
    }
  }
}
