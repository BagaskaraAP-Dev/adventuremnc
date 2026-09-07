import { describe, it, expect } from 'vitest';
import { LUNAR_GRAVITY, EVA_JUMP_VELOCITY, FIXED_DT } from '@adventuremnc/shared';
import { EvaCharacterController, CharacterInputs } from './eva-controller';

describe('EvaCharacterController Physics & Gait', () => {
  const defaultInputs: CharacterInputs = {
    moveForward: false,
    moveBackward: false,
    moveLeft: false,
    moveRight: false,
    sprint: false,
    jump: false,
    cameraYaw: 0,
  };

  it('verifies jump apex matches analytic v0^2 / (2g) within ±5%', () => {
    const controller = new EvaCharacterController(0, 0);
    const v0 = EVA_JUMP_VELOCITY;
    const analyticApex = (v0 * v0) / (2 * LUNAR_GRAVITY); // ~3.9877 m

    // Trigger jump
    controller.update({ ...defaultInputs, jump: true }, FIXED_DT);

    // Simulate flight until descent / impact
    let maxApex = 0;
    for (let i = 0; i < 600; i++) {
      controller.update(defaultInputs, FIXED_DT);
      const state = controller.getState();
      if (state.jumpApex > maxApex) {
        maxApex = state.jumpApex;
      }
      if (state.isGrounded && i > 10) break;
    }

    // Must be within ±5% of analytic value
    const relativeError = Math.abs(maxApex - analyticApex) / analyticApex;
    expect(relativeError).toBeLessThan(0.05);
  });

  it('enforces zero air control in vacuum during flight', () => {
    const controller = new EvaCharacterController(0, 0);

    // Jump vertically
    controller.update({ ...defaultInputs, jump: true }, FIXED_DT);
    expect(controller.getState().isGrounded).toBe(false);

    // Attempt to steer right aggressively in air
    for (let i = 0; i < 30; i++) {
      controller.update({ ...defaultInputs, moveRight: true }, FIXED_DT);
    }

    const stateInAir = controller.getState();
    // In vacuum with zero air control, vx must remain zero
    expect(stateInAir.vx).toBe(0);
  });

  it('calculates fall damage from impact velocity exceeding safe threshold', () => {
    const controller = new EvaCharacterController(0, 0);

    // Drop from 35 meters in vacuum
    const state = controller.getState();
    controller.setState({ y: state.y + 35, isGrounded: false, vy: 0 });

    for (let i = 0; i < 800; i++) {
      controller.update(defaultInputs, FIXED_DT);
      if (controller.getState().isGrounded) break;
    }

    const finalState = controller.getState();
    expect(finalState.lastImpactSpeed).toBeGreaterThan(10.0); // sqrt(2 * 1.625 * 35) ~ 10.66 m/s
    expect(finalState.health).toBeLessThan(100);
  });

  it('advances loping gait cycle proportionally to ground speed', () => {
    const controller = new EvaCharacterController(0, 0);
    expect(controller.getState().lopingCycle).toBe(0);

    for (let i = 0; i < 60; i++) {
      controller.update({ ...defaultInputs, moveForward: true }, FIXED_DT);
    }

    const state = controller.getState();
    expect(state.lopingCycle).toBeGreaterThan(0);
  });

  it('correctly maps camera-relative inputs to world movement at multiple camera yaw angles', () => {
    // 1. Camera yaw = 0 (looking towards -Z)
    // Moving forward (W) must produce vz < 0, vx = 0
    const ctrlYaw0 = new EvaCharacterController(0, 0);
    ctrlYaw0.update({ ...defaultInputs, moveForward: true, cameraYaw: 0 }, FIXED_DT);
    expect(ctrlYaw0.getState().vz).toBeLessThan(0);
    expect(Math.abs(ctrlYaw0.getState().vx)).toBeCloseTo(0, 4);

    // Moving right (D) must produce vx > 0, vz = 0
    const ctrlRight = new EvaCharacterController(0, 0);
    ctrlRight.update({ ...defaultInputs, moveRight: true, cameraYaw: 0 }, FIXED_DT);
    expect(ctrlRight.getState().vx).toBeGreaterThan(0);
    expect(Math.abs(ctrlRight.getState().vz)).toBeCloseTo(0, 4);

    // 2. Camera yaw = PI/2 (looking towards -X)
    // Moving forward (W) must produce vx < 0, vz = 0
    const ctrlYaw90 = new EvaCharacterController(0, 0);
    ctrlYaw90.update({ ...defaultInputs, moveForward: true, cameraYaw: Math.PI / 2 }, FIXED_DT);
    expect(ctrlYaw90.getState().vx).toBeLessThan(0);
    expect(Math.abs(ctrlYaw90.getState().vz)).toBeCloseTo(0, 4);

    // 3. Camera yaw = -PI/2 (looking towards +X)
    // Moving forward (W) must produce vx > 0, vz = 0
    const ctrlYawMinus90 = new EvaCharacterController(0, 0);
    ctrlYawMinus90.update({ ...defaultInputs, moveForward: true, cameraYaw: -Math.PI / 2 }, FIXED_DT);
    expect(ctrlYawMinus90.getState().vx).toBeGreaterThan(0);
    expect(Math.abs(ctrlYawMinus90.getState().vz)).toBeCloseTo(0, 4);
  });
});
