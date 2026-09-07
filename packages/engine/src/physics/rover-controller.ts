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
import { sampleLunarElevation, sampleLunarNormal } from '../terrain/lunar-dem';

export interface RoverInputs {
  throttle: number; // -1 (reverse) to +1 (forward)
  steer: number; // -1 (left) to +1 (right)
  handbrake: boolean;
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
  private readonly restSuspensionHeight = 0.5;

  constructor(startX = 10, startZ = 10) {
    const groundY = sampleLunarElevation(startX, startZ);
    this.state = {
      x: startX,
      y: groundY + this.restSuspensionHeight,
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
    this.updateWheelPositions();
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

  public update(inputs: RoverInputs, dt: number): void {
    if (this.state.isRolledOver) return;

    // 1. Steering integration
    const targetSteer = inputs.steer * ROVER_MAX_STEER_RAD;
    this.state.steerAngle += (targetSteer - this.state.steerAngle) * Math.min(1.0, dt * 8);

    // 2. Wheel Raycasts & Suspension
    this.updateWheelPositions();
    let groundedCount = 0;
    let avgGroundY = 0;

    for (const w of this.state.wheels) {
      const groundAtWheel = sampleLunarElevation(w.worldX, w.worldZ);
      const wheelHubTargetY = groundAtWheel + 0.35; // wheel radius 0.35m

      if (w.worldY <= wheelHubTargetY + 0.1) {
        w.isGrounded = true;
        w.suspensionCompression = Math.max(0, (wheelHubTargetY - w.worldY) + 0.1);
        groundedCount++;
      } else {
        w.isGrounded = false;
        w.suspensionCompression = 0;
      }
      avgGroundY += groundAtWheel;
    }
    avgGroundY /= 4;

    this.state.isGrounded = groundedCount >= 2;

    // 3. Acceleration & Low-Traction Braking
    if (this.state.isGrounded) {
      if (inputs.throttle > 0) {
        // Accelerate forward up to max speed
        if (this.state.speed < ROVER_MAX_SPEED) {
          this.state.speed = Math.min(
            ROVER_MAX_SPEED,
            this.state.speed + ROVER_MOTOR_ACCEL * inputs.throttle * dt
          );
        }
      } else if (inputs.throttle < 0) {
        if (this.state.speed > 0) {
          // Braking forward motion: limited by regolith friction
          this.state.speed = Math.max(
            0,
            this.state.speed - ROVER_BRAKE_DECEL * Math.abs(inputs.throttle) * dt
          );
        } else {
          // Reverse drive
          this.state.speed = Math.max(
            -ROVER_MAX_SPEED * 0.4,
            this.state.speed - ROVER_MOTOR_ACCEL * 0.5 * dt
          );
        }
      } else if (inputs.handbrake) {
        // Handbrake slide
        const decel = ROVER_BRAKE_DECEL * 1.5 * dt;
        if (this.state.speed > 0) {
          this.state.speed = Math.max(0, this.state.speed - decel);
        } else {
          this.state.speed = Math.min(0, this.state.speed + decel);
        }
      } else {
        // Natural rolling resistance on loose regolith
        const rollResist = 0.8 * dt;
        if (this.state.speed > 0) {
          this.state.speed = Math.max(0, this.state.speed - rollResist);
        } else {
          this.state.speed = Math.min(0, this.state.speed + rollResist);
        }
      }

      // Yaw rotation based on steering and speed (bicycle model)
      if (Math.abs(this.state.speed) > 0.05) {
        const turnRadius = ROVER_WHEELBASE / Math.tan(this.state.steerAngle || 0.0001);
        const angularVelocity = (this.state.speed / turnRadius);
        this.state.yaw += angularVelocity * dt;
      }

      // World velocity from forward direction
      this.state.vx = -Math.sin(this.state.yaw) * this.state.speed;
      this.state.vz = -Math.cos(this.state.yaw) * this.state.speed;

      // Chassis terrain conformity (pitch and roll from terrain normals)
      const [nx, ny, nz] = sampleLunarNormal(this.state.x, this.state.z, 1.2);
      const targetPitch = Math.atan2(-nz, ny);
      const targetRoll = Math.atan2(nx, ny);

      this.state.pitch += (targetPitch - this.state.pitch) * Math.min(1.0, dt * 10);
      this.state.roll += (targetRoll - this.state.roll) * Math.min(1.0, dt * 10);

      // Vertical position conform to average ground
      const targetY = avgGroundY + this.restSuspensionHeight;
      this.state.y += (targetY - this.state.y) * Math.min(1.0, dt * 12);
      this.state.vy = 0;
    } else {
      // Airborne (ballistic flight in vacuum)
      this.state.vy -= LUNAR_GRAVITY * dt;
      this.state.y += this.state.vy * dt;

      if (this.state.y <= avgGroundY + this.restSuspensionHeight) {
        this.state.y = avgGroundY + this.restSuspensionHeight;
        this.state.vy = 0;
        this.state.isGrounded = true;
      }
    }

    // 4. Position Integration
    this.state.x += this.state.vx * dt;
    this.state.z += this.state.vz * dt;

    // Check rollover
    if (Math.abs(this.state.roll) > 1.2 || Math.abs(this.state.pitch) > 1.2) {
      this.state.isRolledOver = true;
    }
  }

  private updateWheelPositions(): void {
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

    const [fl, fr, rl, rr] = this.state.wheels;
    const wheelsList = [fl, fr, rl, rr];

    for (let i = 0; i < 4; i++) {
      const o = offsets[i];
      const targetWheel = wheelsList[i];
      if (o && targetWheel) {
        const wx = this.state.x + o.lx * cosY - o.lz * sinY;
        const wz = this.state.z + o.lx * sinY + o.lz * cosY;
        targetWheel.worldX = wx;
        targetWheel.worldZ = wz;
        targetWheel.worldY = this.state.y - 0.2;
      }
    }
  }
}
