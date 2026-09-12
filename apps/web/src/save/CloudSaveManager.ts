import { CloudStateSchema, type CloudState, type CloudCommand } from '@adventuremnc/shared';
export class CloudSaveManager {
  state: CloudState | null = null;
  private token = localStorage.getItem('mnc-cloud-session');
  private pending: Promise<unknown> = Promise.resolve();
  async connect(): Promise<CloudState> {
    if (!this.token) {
      const response = await fetch('/api/session', { method: 'POST' });
      if (!response.ok) throw new Error('Cloud unavailable');
      const data: unknown = await response.json();
      if (!data || typeof data !== 'object' || !('token' in data) || typeof data.token !== 'string' || !('state' in data)) throw new Error('Invalid session response');
      this.state = CloudStateSchema.parse(data.state);
      this.token = data.token;
      localStorage.setItem('mnc-cloud-session', this.token);
    } else {
      const response = await fetch('/api/save', { headers: { Authorization: `Bearer ${this.token}` } });
      if (!response.ok) throw new Error('Cloud unavailable');
      this.state = CloudStateSchema.parse(await response.json());
    }
    return this.state;
  }
  command(command: CloudCommand): Promise<CloudState> {
    const operation = this.pending.then(async () => {
      if (!this.token || !this.state) throw new Error('Cloud disconnected');
      const response = await fetch('/api/save', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.token}` },
        body: JSON.stringify(command),
      });
      if (!response.ok) throw new Error('Cloud rejected sync; return to last saved position or reconnect');
      this.state = CloudStateSchema.parse(await response.json());
      return this.state;
    });
    this.pending = operation.catch(() => undefined);
    return operation;
  }
}
