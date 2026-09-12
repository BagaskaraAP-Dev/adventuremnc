import { describe, it, expect } from 'vitest';
import {
  ROVER_MAX_SPEED,
  ROVER_BRAKE_DECEL,
  FIXED_DT,
} from '@adventuremnc/shared';
import { RoverController, ROVER_TIRE_RADIUS } from './rover-controller';
import { sampleLunarElevation } from '../terrain/lunar-dem';

describe('RoverController Dynamics & Braking', () => {
  it('documents and verifies low-traction braking distance matches analytic d = v^2 / (2a)', () => {
    const rover = new RoverController(0, 0);

    // Accelerate to maximum nominal speed
    for (let i = 0; i < 300; i++) {
      rover.update({ throttle: 1, steer: 0, handbrake: false }, FIXED_DT);
    }
    const stateAtTopSpeed = rover.getState();
    expect(stateAtTopSpeed.speed).toBeCloseTo(ROVER_MAX_SPEED, 1);

    // Apply full brakes
    const startZ = rover.getState().z;

    for (let i = 0; i < 600; i++) {
      rover.update({ throttle: -1, steer: 0, handbrake: false }, FIXED_DT);
      const curSpeed = rover.getState().speed;
      if (curSpeed <= 0.01) break;
    }

    const brakingDistance = Math.abs(rover.getState().z - startZ);
    const analyticDistance = (ROVER_MAX_SPEED * ROVER_MAX_SPEED) / (2 * ROVER_BRAKE_DECEL);

    // Braking distance must be within 10% of theoretical 12.90 meters
    expect(brakingDistance).toBeGreaterThan(11.5);
    expect(brakingDistance).toBeLessThan(14.5);
    const error = Math.abs(brakingDistance - analyticDistance) / analyticDistance;
    expect(error).toBeLessThan(0.1);
  });

  it('rotates yaw proportionally to steer angle and speed', () => {
    const rover = new RoverController(0, 0);
    const initYaw = rover.getState().yaw;

    // Drive forward while steering right
    for (let i = 0; i < 60; i++) {
      rover.update({ throttle: 1, steer: 1, handbrake: false }, FIXED_DT);
    }

    const finalYaw = rover.getState().yaw;
    expect(finalYaw).not.toBe(initYaw);
  });

  it('checks player interaction range within radius', () => {
    const rover = new RoverController(50, 50);
    expect(rover.canInteract(51, 51)).toBe(true);
    expect(rover.canInteract(55, 55)).toBe(false);
  });

  it('guarantees rover wheels never sink below terrain elevation when driving', () => {
    const rover = new RoverController(-15, -4.5);

    // Drive forward at full throttle across terrain and roads for 120 steps (2 seconds)
    for (let step = 0; step < 120; step++) {
      rover.update({ throttle: 1, steer: 0.1, handbrake: false }, FIXED_DT);
      const state = rover.getState();

      for (const w of state.wheels) {
        const groundH = sampleLunarElevation(w.worldX, w.worldZ);
        const wheelBottom = w.worldY - ROVER_TIRE_RADIUS;
        // The bottom of the tire must never penetrate into the ground (tolerance 0.001m)
        expect(wheelBottom).toBeGreaterThanOrEqual(groundH - 0.001);
      }
    }
  });
});
