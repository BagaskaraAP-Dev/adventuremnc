import { HABITAT_AIRLOCK_RADIUS, type SecurityState } from '@adventuremnc/shared';

export const HABITAT_AIRLOCK = { x: -22, z: -8, radius: HABITAT_AIRLOCK_RADIUS } as const;
export const SECURITY_ESCALATION_SECONDS = 30;

export function canCycleAirlock(position: { x: number; z: number }): boolean {
  return Math.hypot(position.x - HABITAT_AIRLOCK.x, position.z - HABITAT_AIRLOCK.z) <= HABITAT_AIRLOCK.radius;
}

export function stepSecurity(state: SecurityState, seconds: number): SecurityState {
  if (state.level === 0) return state;
  const elapsed = state.elapsed + Math.max(0, seconds);
  return { level: elapsed + 1e-8 >= SECURITY_ESCALATION_SECONDS ? 2 : state.level, elapsed };
}

/** Abrasive exposure, normalized to 0..1. Only a habitat cycle removes dust. */
export function stepVisorDust(dust: number, seconds: number, exposure: {
  speed: number; driving: boolean; sprinting: boolean; outside: boolean; airlock: boolean;
}): number {
  if (exposure.airlock) return 0;
  const rate = exposure.outside && (exposure.driving || exposure.sprinting)
    ? Math.min(Math.abs(exposure.speed), 12) * (exposure.driving ? 0.0015 : 0.0025) : 0;
  return Math.max(0, Math.min(1, dust + rate * Math.max(0, seconds)));
}

/** Relative bearing in radians: positive rotates the HUD arrow clockwise. -Z is north. */
export function navigationCue(position: { x: number; z: number }, target: { x: number; z: number }, cameraYaw: number) {
  const dx = target.x - position.x;
  const dz = target.z - position.z;
  const distance = Math.hypot(dx, dz);
  const angle = distance < 0.01 ? 0 : Math.atan2(dx, -dz) + cameraYaw;
  return { distance, bearing: Math.atan2(Math.sin(angle), Math.cos(angle)) };
}
