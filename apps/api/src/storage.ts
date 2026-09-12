import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { join } from 'node:path';

export interface SaveRepository {
  read(key: string): Promise<string | null>;
  compareAndSet(key: string, previous: string | null, next: string): Promise<boolean>;
}

/** Development only: one server process; production uses Redis atomic CAS. */
export class FileSaveRepository implements SaveRepository {
  constructor(private readonly directory: string) {}
  async read(key: string): Promise<string | null> {
    try { return await readFile(join(this.directory, key + '.json'), 'utf8'); }
    catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return null;
      throw error;
    }
  }
  async compareAndSet(key: string, previous: string | null, next: string): Promise<boolean> {
    if (await this.read(key) !== previous) return false;
    await mkdir(this.directory, { recursive: true });
    const path = join(this.directory, key + '.json');
    await writeFile(path + '.tmp', next, { mode: 0o600 });
    await rename(path + '.tmp', path);
    return true;
  }
}

const CAS_SCRIPT = `local old = redis.call('GET', KEYS[1])
if (ARGV[1] == 'missing' and not old) or (ARGV[1] == 'present' and old == ARGV[2]) then
  redis.call('SET', KEYS[1], ARGV[3])
  return 1
end
return 0`;

export class RedisSaveRepository implements SaveRepository {
  constructor(private readonly url: string, private readonly token: string, private readonly request: typeof fetch = fetch) {}
  private async execute(command: string[]): Promise<unknown> {
    const response = await this.request(this.url, {
      method: 'POST', headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(command), signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error('Cloud storage unavailable');
    const data: unknown = await response.json();
    if (!data || typeof data !== 'object' || 'error' in data || !('result' in data)) throw new Error('Cloud storage rejected request');
    return data.result;
  }
  async read(key: string): Promise<string | null> {
    const result = await this.execute(['GET', 'mnc:save:' + key]);
    if (result !== null && typeof result !== 'string') throw new Error('Invalid cloud record');
    return result;
  }
  async compareAndSet(key: string, previous: string | null, next: string): Promise<boolean> {
    const result = await this.execute(['EVAL', CAS_SCRIPT, '1', 'mnc:save:' + key, previous === null ? 'missing' : 'present', previous ?? '', next]);
    if (result !== 0 && result !== 1) throw new Error('Invalid cloud write result');
    return result === 1;
  }
}
