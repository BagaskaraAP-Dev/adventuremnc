import { FIXED_DT, type MissionState, type PlayerPosition } from '@adventuremnc/shared';

export interface MissionDefinition {
  id: MissionState['id'];
  title: string;
  description: string;
  risk: string;
  reward: number;
  duration: number;
  objectives: readonly { label: string; x: number; z: number; radius: number }[];
}
const home = { label: 'Deliver to Habitat Base', x: -22, z: -10, radius: 12 };
export const CONTRACTS: readonly MissionDefinition[] = [
  { id: 'cold-courier', title: 'Cold Courier', description: 'Collect PSR ice and deliver it before the O2 deadline.', risk: 'Permanent shadow, extreme cold, limited oxygen.', reward: 450, duration: 900,
    objectives: [{ label: 'Collect PSR ice [E]', x: 0, z: -1800, radius: 15 }, home] },
  { id: 'ridge-surveyor', title: 'Ridge Surveyor', description: 'Place a navigation sensor on the Shackleton ridge.', risk: 'Steep terrain and exposed sunlight.', reward: 250, duration: 600,
    objectives: [{ label: 'Place navigation sensor [E]', x: 0, z: -400, radius: 12 }] },
  { id: 'illegal-salvage', title: 'Illegal Salvage', description: 'Recover abandoned cargo beyond the Corporate Security perimeter.', risk: 'Remote terrain beyond corporate assistance.', reward: 650, duration: 1200,
    objectives: [{ label: 'Recover cargo [E]', x: 2800, z: -900, radius: 15 }, home] },
];
export function createMission(id: MissionState['id']): MissionState {
  if (!CONTRACTS.some(c => c.id === id)) throw new Error('Unknown contract');
  return { id, status: 'active', objective: 0, elapsed: 0 };
}
export function missionTarget(state: MissionState) {
  return CONTRACTS.find(c => c.id === state.id)?.objectives[state.objective];
}
/** Pure simulation, advanced exclusively in 1/60 second steps. */
export function stepMission(state: MissionState, oxygen: number, dead: boolean): MissionState {
  if (state.status !== 'active') return state;
  const definition = CONTRACTS.find(c => c.id === state.id);
  if (!definition) throw new Error('Unknown contract');
  const elapsed = state.elapsed + FIXED_DT;
  return { ...state, elapsed, status: dead || oxygen <= 0 || elapsed + 1e-8 >= definition.duration ? 'failed' : 'active' };
}
export function interactMission(state: MissionState, position: PlayerPosition): MissionState {
  const target = missionTarget(state);
  if (state.status !== 'active' || !target || Math.hypot(position.x - target.x, position.z - target.z) > target.radius) return state;
  const objective = state.objective + 1;
  const definition = CONTRACTS.find(c => c.id === state.id);
  return { ...state, objective, status: objective === definition?.objectives.length ? 'completed' : 'active' };
}
