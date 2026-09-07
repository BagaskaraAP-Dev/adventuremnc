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
});
