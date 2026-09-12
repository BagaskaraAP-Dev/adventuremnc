import { CloudStateSchema, type CloudState, type CloudCommand } from '@adventuremnc/shared';

export class CloudSaveManager {
  state: CloudState | null = null;
  private token: string | null = null;
  private pending: Promise<unknown> = Promise.resolve();
  constructor() {
    try { this.token = localStorage.getItem('mnc-cloud-session'); } catch { /* Memory-only session when storage is disabled. */ }
  }
  private async request(path: string, options: RequestInit): Promise<Response> {
    return fetch(path, { ...options, cache: 'no-store', signal: AbortSignal.timeout(8000) });
  }
  async connect(): Promise<CloudState> {
    if (this.token) {
      const response = await this.request('/api/save', { headers: { Authorization: `Bearer ${this.token}` } });
      if (response.ok) {
        this.state = CloudStateSchema.parse(await response.json());
        return this.state;
      }
      // Only an explicitly invalid session can be replaced. Outages retain the token.
      if (response.status !== 401) throw new Error('Cloud unavailable; retrying automatically');
      this.token = null;
    }
    const response = await this.request('/api/session', { method: 'POST' });
    if (!response.ok) throw new Error('Cloud unavailable; retrying automatically');
    const data: unknown = await response.json();
    if (!data || typeof data !== 'object' || !('token' in data) || typeof data.token !== 'string' || !/^[a-f0-9]{64}$/.test(data.token) || !('state' in data)) throw new Error('Invalid session response');
    this.state = CloudStateSchema.parse(data.state);
    this.token = data.token;
    try { localStorage.setItem('mnc-cloud-session', this.token); } catch { /* Keep the current in-memory session. */ }
    return this.state;
  }
  command(command: CloudCommand): Promise<CloudState> {
    const operation = this.pending.then(async () => {
      if (!this.token || !this.state) throw new Error('Cloud disconnected');
      const response = await this.request('/api/save', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.token}` },
        body: JSON.stringify(command),
      });
      if (!response.ok) {
        if (response.status === 401) this.state = null;
        throw new Error(response.status === 409 ? 'Cloud conflict — retry or respawn [R]' : 'Cloud unavailable; retrying automatically');
      }
      this.state = CloudStateSchema.parse(await response.json());
      return this.state;
    });
    this.pending = operation.catch(() => undefined);
    return operation;
  }
}
