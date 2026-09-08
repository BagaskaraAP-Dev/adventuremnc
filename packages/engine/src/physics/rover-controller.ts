import {
  LUNAR_GRAVITY,
  ROVER_MAX_SPEED,
  ROVER_MOTOR_ACCEL,
  ROVER_BRAKE_DECEL,
  ROVER_MAX_STEER_RAD,
  ROVER_WHEELBASE,
  ROVER_TRACK_WIDTH,
  ROVER_INTERACT_RADIUS,
} from '@adventuremnc/shared';
import { sampleLunarElevation } from '../terrain/lunar-dem';

/**
 * Geometric constants matching RoverMesh:
 * TorusGeometry major radius 0.35 + tube radius 0.11 = 0.46m outer tire contact radius.
 * Wheel pivot is mounted at local Y = -0.15m relative to chassis origin.
 */
export const ROVER_TIRE_RADIUS = 0.46;
export const ROVER_PIVOT_OFFSET_Y = 0.15;
export const ROVER_REST_CLEARANCE = 0.04;
export const ROVER_REST_HEIGHT = ROVER_TIRE_RADIUS + ROVER_PIVOT_OFFSET_Y + ROVER_REST_CLEARANCE; // ~0.65m

export interface RoverInputs {
  throttle: number; // -1 (reverse) to +1 (forward)
  steer: number; // -1 (left) to +1 (right)
  handbrake: boolean;
}

export interface RoverEnvironmentalContext {
  getGroundElevation?: (x: number, z: number) => number;
  constrainPosition?: (
    currX: number,
    currZ: number,
    nextX: number,
    nextZ: number,
    radius: number
  ) => { x: number; z: number; hit?: boolean; normalX?: number; normalZ?: number };
}

export interface RoverWheelState {
  worldX: number;
  worldY: number;
  worldZ: number;
  isGrounded: boolean;
  suspensionCompression: number;
  slip: number;
}

export interface RoverState {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  speed: number;
  yaw: number;
  pitch: number;
  roll: number;
  steerAngle: number;
  isGrounded: boolean;
  isRolledOver: boolean;
  wheels: [RoverWheelState, RoverWheelState, RoverWheelState, RoverWheelState]; // FL, FR, RL, RR
}

export class RoverController {
  private state: RoverState;

  constructor(startX = 10, startZ = 10) {
    const groundY = sampleLunarElevation(startX, startZ);
    this.state = {
      x: startX,
      y: groundY + ROVER_REST_HEIGHT,
      z: startZ,
      vx: 0,
      vy: 0,
      vz: 0,
      speed: 0,
      yaw: 0,
      pitch: 0,
      roll: 0,
      steerAngle: 0,
      isGrounded: true,
      isRolledOver: false,
      wheels: [
        { worldX: 0, worldY: 0, worldZ: 0, isGrounded: true, suspensionCompression: 0, slip: 0 },
        { worldX: 0, worldY: 0, worldZ: 0, isGrounded: true, suspensionCompression: 0, slip: 0 },
        { worldX: 0, worldY: 0, worldZ: 0, isGrounded: true, suspensionCompression: 0, slip: 0 },
        { worldX: 0, worldY: 0, worldZ: 0, isGrounded: true, suspensionCompression: 0, slip: 0 },
      ],
    };
    this.syncWheelPositions(sampleLunarElevation);
  }

  public getState(): RoverState {
    return {
      ...this.state,
      wheels: [
        { ...this.state.wheels[0] },
        { ...this.state.wheels[1] },
        { ...this.state.wheels[2] },
        { ...this.state.wheels[3] },
      ],
    };
  }

  public setState(partial: Partial<RoverState>): void {
    this.state = { ...this.state, ...partial };
  }

  public canInteract(playerX: number, playerZ: number): boolean {
    const dx = playerX - this.state.x;
    const dz = playerZ - this.state.z;
    return Math.sqrt(dx * dx + dz * dz) <= ROVER_INTERACT_RADIUS;
  }

  public update(inputs: RoverInputs, dt: number, env?: RoverEnvironmentalContext): void {
    if (this.state.isRolledOver) return;

    const sampleElevation = (x: number, z: number): number => {
      return env?.getGroundElevation ? env.getGroundElevation(x, z) : sampleLunarElevation(x, z);
    };

    // 1. Steering integration
    const targetSteer = inputs.steer * ROVER_MAX_STEER_RAD;
    this.state.steerAngle += (targetSteer - this.state.steerAngle) * Math.min(1.0, dt * 8);

    // Yaw rotation based on steering and speed (bicycle model)
    if (this.state.isGrounded && Math.abs(this.state.speed) > 0.05) {
      const turnRadius = ROVER_WHEELBASE / Math.tan(this.state.steerAngle || 0.0001);
      const angularVelocity = this.state.speed / turnRadius;
      this.state.yaw += angularVelocity * dt;
    }

    // 2. Acceleration & Low-Traction Braking
    if (this.state.isGrounded) {
      if (inputs.throttle > 0) {
        if (this.state.speed < 0) {
          this.state.speed = Math.min(0, this.state.speed + ROVER_BRAKE_DECEL * inputs.throttle * dt);
        } else if (this.state.speed < ROVER_MAX_SPEED) {
          this.state.speed = Math.min(ROVER_MAX_SPEED, this.state.speed + ROVER_MOTOR_ACCEL * inputs.throttle * dt);
        }
      } else if (inputs.throttle < 0) {
        if (this.state.speed > 0) {
          this.state.speed = Math.max(0, this.state.speed - ROVER_BRAKE_DECEL * Math.abs(inputs.throttle) * dt);
        } else {
          this.state.speed = Math.max(-ROVER_MAX_SPEED * 0.4, this.state.speed - ROVER_MOTOR_ACCEL * 0.5 * dt);
        }
      } else if (inputs.handbrake) {
        const decel = ROVER_BRAKE_DECEL * 1.5 * dt;
        if (this.state.speed > 0) {
          this.state.speed = Math.max(0, this.state.speed - decel);
        } else {
          this.state.speed = Math.min(0, this.state.speed + decel);
        }
      } else {
        const rollResist = 0.8 * dt;
        if (this.state.speed > 0) {
          this.state.speed = Math.max(0, this.state.speed - rollResist);
        } else {
          this.state.speed = Math.min(0, this.state.speed + rollResist);
        }
      }
    }

    // World velocity from forward direction
    this.state.vx = -Math.sin(this.state.yaw) * this.state.speed;
    this.state.vz = -Math.cos(this.state.yaw) * this.state.speed;

    // 3. Horizontal Position Integration
    const nextX = this.state.x + this.state.vx * dt;
    const nextZ = this.state.z + this.state.vz * dt;

    if (env?.constrainPosition) {
      const c = env.constrainPosition(this.state.x, this.state.z, nextX, nextZ, 1.25);
      this.state.x = c.x;
      this.state.z = c.z;

      if (c.hit && c.normalX !== undefined && c.normalZ !== undefined) {
        const dot = this.state.vx * c.normalX + this.state.vz * c.normalZ;
        if (dot < 0) {
          this.state.vx -= dot * c.normalX * 1.3;
          this.state.vz -= dot * c.normalZ * 1.3;
          this.state.speed *= 0.15;
        }
      }
    } else {
      this.state.x = nextX;
      this.state.z = nextZ;
    }

    // 4. Vertical Anti-Penetration & Suspension Grounding AT NEW POSITION
    this.syncWheelPositions(sampleElevation, dt);

    // Check rollover
    if (Math.abs(this.state.roll) > 1.2 || Math.abs(this.state.pitch) > 1.2) {
      this.state.isRolledOver = true;
    }
  }

  private syncWheelPositions(sampleElevation: (x: number, z: number) => number, dt = 0): void {
    const halfBase = ROVER_WHEELBASE * 0.5;
    const halfTrack = ROVER_TRACK_WIDTH * 0.5;

    const cosY = Math.cos(this.state.yaw);
    const sinY = Math.sin(this.state.yaw);

    const offsets = [
      { lx: -halfTrack, lz: -halfBase }, // FL
      { lx: halfTrack, lz: -halfBase },  // FR
      { lx: -halfTrack, lz: halfBase },  // RL
      { lx: halfTrack, lz: halfBase },   // RR
    ] as const;

    const wheelGroundH: number[] = [];
    for (let i = 0; i < 4; i++) {
      const o = offsets[i]!;
      const wx = this.state.x + o.lx * cosY - o.lz * sinY;
      const wz = this.state.z + o.lx * sinY + o.lz * cosY;
      const w = this.state.wheels[i]!;
      w.worldX = wx;
      w.worldZ = wz;
      wheelGroundH.push(sampleElevation(wx, wz));
    }

    // Calculate natural chassis pitch & roll from 4 wheel contacts
    const hFL = wheelGroundH[0]!;
    const hFR = wheelGroundH[1]!;
    const hRL = wheelGroundH[2]!;
    const hRR = wheelGroundH[3]!;

    const frontAvgH = (hFL + hFR) * 0.5;
    const rearAvgH = (hRL + hRR) * 0.5;
    const leftAvgH = (hFL + hRL) * 0.5;
    const rightAvgH = (hFR + hRR) * 0.5;

    const targetPitch = Math.atan2(rearAvgH - frontAvgH, ROVER_WHEELBASE);
    const targetRoll = Math.atan2(leftAvgH - rightAvgH, ROVER_TRACK_WIDTH);

    if (dt > 0) {
      this.state.pitch += (targetPitch - this.state.pitch) * Math.min(1.0, dt * 25);
      this.state.roll += (targetRoll - this.state.roll) * Math.min(1.0, dt * 25);
    } else {
      this.state.pitch = targetPitch;
      this.state.roll = targetRoll;
    }

    // Compute minimum chassis center Y so NO wheel penetrates the ground
    const localHubYs: number[] = [];
    let minAllowedChassisY = Number.NEGATIVE_INFINITY;

    for (let i = 0; i < 4; i++) {
      const o = offsets[i]!;
      const gh = wheelGroundH[i]!;
      const localHubY = -ROVER_PIVOT_OFFSET_Y - Math.sin(this.state.pitch) * o.lz + Math.sin(this.state.roll) * o.lx;
      localHubYs.push(localHubY);

      // Chassis Y must satisfy: chassisY + localHubY - ROVER_TIRE_RADIUS >= gh
      const requiredChassisY = gh + ROVER_TIRE_RADIUS - localHubY;
      if (requiredChassisY > minAllowedChassisY) {
        minAllowedChassisY = requiredChassisY;
      }
    }

    if (dt > 0) {
      if (this.state.vy !== 0 || this.state.y > minAllowedChassisY + 0.3) {
        // Airborne in vacuum
        this.state.vy -= LUNAR_GRAVITY * dt;
        this.state.y += this.state.vy * dt;
        if (this.state.y <= minAllowedChassisY) {
          this.state.y = minAllowedChassisY;
          this.state.vy = 0;
          this.state.isGrounded = true;
        } else {
          this.state.isGrounded = false;
        }
      } else {
        // Normal grounded driving: responsive suspension follow + HARD ANTI-SINK CLAMP
        this.state.isGrounded = true;
        this.state.vy = 0;
        const targetY = minAllowedChassisY + ROVER_REST_CLEARANCE;
        this.state.y += (targetY - this.state.y) * Math.min(1.0, dt * 30);
        if (this.state.y < minAllowedChassisY) {
          this.state.y = minAllowedChassisY;
        }
      }
    } else {
      this.state.y = minAllowedChassisY + ROVER_REST_CLEARANCE;
      this.state.isGrounded = true;
      this.state.vy = 0;
    }

    // Update wheel worldY and grounded state
    for (let i = 0; i < 4; i++) {
      const w = this.state.wheels[i]!;
      const gh = wheelGroundH[i]!;
      const localHubY = localHubYs[i]!;
      w.worldY = this.state.y + localHubY;
      const tireBottom = w.worldY - ROVER_TIRE_RADIUS;
      w.isGrounded = tireBottom <= gh + 0.06;
      w.suspensionCompression = Math.max(0, gh - tireBottom + 0.06);
    }
  }
}
