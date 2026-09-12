import { randomBytes } from 'node:crypto';
import { CloudCommandSchema, CloudStateSchema, type CloudState } from '@adventuremnc/shared';
import { CONTRACTS, createMission, interactMission, advanceMission, sampleLunarElevation, stepSecurity, canCycleAirlock } from '@adventuremnc/engine';
import { FileSaveRepository, type SaveRepository } from './storage';

export class CloudError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

export class CloudStore {
  private queue: Promise<unknown> = Promise.resolve();
  private readonly repository: SaveRepository;
  constructor(repository: string | SaveRepository, private readonly now = Date.now) {
    this.repository = typeof repository === 'string' ? new FileSaveRepository(repository) : repository;
  }
  private key(token: string): string {
    if (!/^[a-f0-9]{64}$/.test(token)) throw new CloudError('Invalid session', 401);
    return token;
  }
  async create(): Promise<{ token: string; state: CloudState }> {
    const token = randomBytes(32).toString('hex');
    const state: CloudState = { version: 1, revision: 0, credits: 0, position: { x: -22, y: sampleLunarElevation(-22, -8), z: -8 }, missions: [], security: { level: 0, elapsed: 0 } };
    if (!await this.repository.compareAndSet(token, null, JSON.stringify({ state, updated: this.now() }))) throw new CloudError('Session creation failed', 503);
    return { token, state };
  }
  private async read(token: string) {
    const encoded = await this.repository.read(this.key(token));
    if (encoded === null) throw new CloudError('Session not found', 401);
    const raw: unknown = JSON.parse(encoded);
    if (typeof raw !== 'object' || raw === null || !('state' in raw) || !('updated' in raw) || typeof raw.updated !== 'number' || !Number.isFinite(raw.updated)) throw new CloudError('Invalid stored save', 503);
    const state = CloudStateSchema.parse(raw.state);
    // Migrate version-1 saves that already carry salvage.
    if (typeof raw.state === 'object' && raw.state !== null && !('security' in raw.state) && state.missions.some(m => m.id === 'illegal-salvage' && m.status === 'active' && m.objective === 1)) state.security = { level: 1, elapsed: 0 };
    return { state, updated: raw.updated, encoded };
  }
  async get(token: string): Promise<CloudState> {
    const { state, updated } = await this.read(token);
    return this.advance(state, updated, 100, false);
  }
  private advance(state: CloudState, updated: number, oxygen: number, dead: boolean): CloudState {
    const seconds = Math.max(0, (this.now() - updated) / 1000);
    state.missions = state.missions.map(m => advanceMission(m, seconds, oxygen, dead));
    state.security = stepSecurity(state.security, seconds);
    return state;
  }
  command(token: string, input: unknown): Promise<CloudState> {
    const result = this.queue.then(() => this.apply(token, input));
    this.queue = result.catch(() => undefined);
    return result;
  }
  private async apply(token: string, input: unknown): Promise<CloudState> {
    const parsed = CloudCommandSchema.safeParse(input);
    if (!parsed.success) throw new CloudError('Invalid save command', 400);
    const command = parsed.data;
    // Retry optimistic conflicts across independent Vercel instances.
    for (let attempt = 0; attempt < 5; attempt++) {
      const { state, updated, encoded } = await this.read(token);
      const seconds = Math.max(0, (this.now() - updated) / 1000);
      this.advance(state, updated, command.type === 'save' ? command.oxygen : 100, command.type === 'save' && command.dead);
      if (command.type === 'save') {
        const distance = Math.hypot(command.position.x - state.position.x, command.position.z - state.position.z);
        if (distance > 40 * seconds + 5) throw new CloudError('Movement exceeds server travel budget', 409);
        if (Math.abs(command.position.y - sampleLunarElevation(command.position.x, command.position.z)) > 25) throw new CloudError('Position is not near terrain', 400);
        state.position = command.position;
      } else if (command.type === 'respawn') {
        state.position = { x: -22, y: sampleLunarElevation(-22, -8), z: -8 };
        state.missions = state.missions.map(m => m.status === 'active' ? { ...m, status: 'failed' } : m);
        state.security = { level: 0, elapsed: 0 };
      } else if (command.type === 'accept') {
        if (Math.hypot(state.position.x + 22, state.position.z + 10) > 15) throw new CloudError('Return to Habitat terminal', 409);
        if (state.security.level > 0 || state.missions.some(m => m.status === 'active' || (m.id === command.id && m.status === 'completed'))) throw new CloudError('Contract unavailable', 409);
        state.missions = state.missions.filter(m => m.id !== command.id);
        state.missions.push(createMission(command.id));
      } else {
        const airlock = command.type === 'airlock';
        if (airlock && !canCycleAirlock(state.position)) throw new CloudError('Return to Habitat airlock', 409);
        state.missions = state.missions.map(m => {
          const next = airlock && m.objective === 0 ? m : interactMission(m, state.position, airlock);
          if (m.id === 'illegal-salvage' && m.objective === 0 && next.objective === 1) state.security = { level: 1, elapsed: 0 };
          if (m.status === 'active' && next.status === 'completed') state.credits += CONTRACTS.find(c => c.id === m.id)?.reward ?? 0;
          return next;
        });
        if (airlock) state.security = { level: 0, elapsed: 0 };
      }
      state.revision++;
      if (await this.repository.compareAndSet(this.key(token), encoded, JSON.stringify({ state, updated: this.now() }))) return state;
    }
    throw new CloudError('Save busy; retry shortly', 409);
  }
}
