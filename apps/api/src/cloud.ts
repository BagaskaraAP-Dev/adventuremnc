import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { join } from 'node:path';
import { CloudCommandSchema, CloudStateSchema, FIXED_DT, type CloudState } from '@adventuremnc/shared';
import { CONTRACTS, createMission, interactMission, stepMission, sampleLunarElevation } from '@adventuremnc/engine';

export class CloudStore {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private readonly directory: string, private readonly now = Date.now) {}
  private path(token: string): string {
    if (!/^[a-f0-9]{64}$/.test(token)) throw new Error('Invalid session');
    return join(this.directory, token + '.json');
  }
  async create(): Promise<{ token: string; state: CloudState }> {
    const token = randomBytes(32).toString('hex');
    const state: CloudState = { version: 1, revision: 0, credits: 0, position: { x: -22, y: sampleLunarElevation(-22, -8), z: -8 }, missions: [] };
    await mkdir(this.directory, { recursive: true });
    await this.persist(token, state);
    return { token, state };
  }
  private async persist(token: string, state: CloudState): Promise<void> {
    const path = this.path(token);
    await writeFile(path + '.tmp', JSON.stringify({ state, updated: this.now() }), { mode: 0o600 });
    await rename(path + '.tmp', path);
  }
  private async read(token: string): Promise<{ state: CloudState; updated: number }> {
    const raw: unknown = JSON.parse(await readFile(this.path(token), 'utf8'));
    if (typeof raw !== 'object' || raw === null || !('state' in raw) || !('updated' in raw) || typeof raw.updated !== 'number') throw new Error('Invalid save');
    return { state: CloudStateSchema.parse(raw.state), updated: raw.updated };
  }
  async get(token: string): Promise<CloudState> { return (await this.read(token)).state; }
  command(token: string, input: unknown): Promise<CloudState> {
    const result = this.queue.then(() => this.apply(token, input));
    this.queue = result.catch(() => undefined);
    return result;
  }
  private async apply(token: string, input: unknown): Promise<CloudState> {
    const command = CloudCommandSchema.parse(input);
    const { state, updated } = await this.read(token);
    const seconds = Math.max(0, (this.now() - updated) / 1000);
    state.missions = state.missions.map(m => {
      let next = m;
      for (let i = 0; i < Math.ceil(seconds / FIXED_DT) && next.status === 'active'; i++) next = stepMission(next, command.type === 'save' ? command.oxygen : 100, command.type === 'save' && command.dead);
      return next;
    });
    if (command.type === 'save') {
      const distance = Math.hypot(command.position.x - state.position.x, command.position.z - state.position.z);
      if (distance > 40 * seconds + 5) throw new Error('Movement exceeds server travel budget');
      if (Math.abs(command.position.y - sampleLunarElevation(command.position.x, command.position.z)) > 25) throw new Error('Position is not near terrain');
      state.position = command.position;
    } else if (command.type === 'respawn') {
      state.position = { x: -22, y: sampleLunarElevation(-22, -8), z: -8 };
      state.missions = state.missions.map(m => m.status === 'active' ? { ...m, status: 'failed' } : m);
    } else if (command.type === 'accept') {
      if (Math.hypot(state.position.x + 22, state.position.z + 10) > 15) throw new Error('Return to Habitat terminal');
      if (state.missions.some(m => m.status === 'active' || (m.id === command.id && m.status === 'completed'))) throw new Error('Contract unavailable');
      state.missions = state.missions.filter(m => m.id !== command.id);
      state.missions.push(createMission(command.id));
    } else {
      state.missions = state.missions.map(m => {
        const next = interactMission(m, state.position);
        if (m.status === 'active' && next.status === 'completed') state.credits += CONTRACTS.find(c => c.id === m.id)?.reward ?? 0;
        return next;
      });
    }
    state.revision++;
    await this.persist(token, state);
    return state;
  }
}
