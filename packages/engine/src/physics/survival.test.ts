import { describe, it, expect } from 'vitest';
import { FIXED_DT } from '@adventuremnc/shared';
import { EvaCharacterController, CharacterInputs } from './eva-controller';

describe('M4 Survival & Life Support Systems', () => {
  const idleInputs: CharacterInputs = {
    moveForward: false,
    moveBackward: false,
    moveLeft: false,
    moveRight: false,
    sprint: false,
    jump: false,
    cameraYaw: 0,
  };

  it('consumes oxygen continuously in vacuum and drains faster during sprint', () => {
    const ctrlIdle = new EvaCharacterController(0, 0);
    const ctrlSprint = new EvaCharacterController(0, 0);

    for (let i = 0; i < 60; i++) {
      ctrlIdle.update(idleInputs, FIXED_DT);
      ctrlSprint.update({ ...idleInputs, moveForward: true, sprint: true }, FIXED_DT);
    }

    const idleO2 = ctrlIdle.getState().oxygen;
    const sprintO2 = ctrlSprint.getState().oxygen;

    expect(idleO2).toBeLessThan(100);
    expect(sprintO2).toBeLessThan(idleO2);
  });

  it('triggers fatal asphyxiation when oxygen reaches zero', () => {
    const controller = new EvaCharacterController(0, 0);
    controller.setState({ oxygen: 0.1 });

    // Simulate until suffocation
    for (let i = 0; i < 600; i++) {
      controller.update(idleInputs, FIXED_DT);
      if (controller.getState().isDead) break;
    }

    const state = controller.getState();
    expect(state.oxygen).toBe(0);
    expect(state.isDead).toBe(true);
    expect(state.deathReason).toBe('ASPHYXIATION');
  });

  it('cools down in deep shadow and overheats in sunlight', () => {
    const ctrlShadow = new EvaCharacterController(0, 0);
    const ctrlSun = new EvaCharacterController(0, 0);

    for (let i = 0; i < 120; i++) {
      ctrlShadow.update(idleInputs, FIXED_DT, { isInSunlight: false });
      ctrlSun.update(idleInputs, FIXED_DT, { isInSunlight: true });
    }

    expect(ctrlShadow.getState().suitTemperature).toBeLessThan(21.0);
    expect(ctrlSun.getState().suitTemperature).toBeGreaterThan(21.0);
  });

  it('triggers fatal hypothermia when freezing in shadow for too long', () => {
    const controller = new EvaCharacterController(0, 0);
    controller.setState({ suitTemperature: 3.0, health: 15.0 });

    for (let i = 0; i < 600; i++) {
      controller.update(idleInputs, FIXED_DT, { isInSunlight: false });
      if (controller.getState().isDead) break;
    }

    const state = controller.getState();
    expect(state.isDead).toBe(true);
    expect(state.deathReason).toBe('HYPOTHERMIA');
  });

  it('damages suit integrity and health on high-speed falls with distinct death reason', () => {
    const controller = new EvaCharacterController(0, 0);
    // Drop from extreme height
    const state = controller.getState();
    controller.setState({ y: state.y + 70, isGrounded: false, vy: 0 });

    for (let i = 0; i < 1000; i++) {
      controller.update(idleInputs, FIXED_DT);
      if (controller.getState().isGrounded) break;
    }

    const finalState = controller.getState();
    expect(finalState.suitIntegrity).toBeLessThan(100.0);
    expect(finalState.isDead).toBe(true);
    expect(finalState.deathReason).toBe('FALL_IMPACT');
  });

  it('recharges oxygen, normalizes temperature, and repairs suit in pressurized shelter', () => {
    const controller = new EvaCharacterController(0, 0);
    controller.setState({
      oxygen: 40.0,
      suitTemperature: 10.0,
      suitIntegrity: 60.0,
      health: 80.0,
    });

    for (let i = 0; i < 60; i++) {
      controller.update(idleInputs, FIXED_DT, { isInsideShelter: true });
    }

    const recharged = controller.getState();
    expect(recharged.oxygen).toBeGreaterThan(40.0);
    expect(recharged.suitTemperature).toBeGreaterThan(10.0);
    expect(recharged.suitIntegrity).toBeGreaterThan(60.0);
    expect(recharged.health).toBeGreaterThan(80.0);
  });
});
