import { IncomingMessage, ServerResponse } from 'node:http';
import { Socket } from 'node:net';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { handleCloudRequest, getProductionStore } from './http';
import { CloudStore } from './cloud';

const records = new Map<string, string>();
const store = new CloudStore({
  read: async key => records.get(key) ?? null,
  compareAndSet: async (key, previous, next) => {
    if ((records.get(key) ?? null) !== previous) return false;
    records.set(key, next);
    return true;
  },
});
afterEach(() => { vi.unstubAllEnvs(); });
async function call(route: 'session' | 'save', method: string, body?: unknown, authorization?: string) {
  const request = Object.assign(new IncomingMessage(new Socket()), { body });
  request.method = method;
  if (authorization) request.headers.authorization = authorization;
  const response = new ServerResponse(request);
  const end = vi.spyOn(response, 'end').mockReturnValue(response);
  await handleCloudRequest(request, response, route, () => store);
  const data: unknown = JSON.parse(String(end.mock.calls[0]?.[0]));
  return { response, data };
}
describe('Shared HTTP contract', () => {
  it('creates a session and round-trips an authenticated save', async () => {
    const created = await call('session', 'POST');
    expect(created.response.statusCode).toBe(201);
    expect(created.response.getHeader('Cache-Control')).toBe('no-store');
    const parsed = created.data;
    if (!parsed || typeof parsed !== 'object' || !('token' in parsed) || typeof parsed.token !== 'string') throw new Error('Missing token');
    const accepted = await call('save', 'POST', { type: 'accept', id: 'ridge-surveyor' }, `Bearer ${parsed.token}`);
    expect(accepted.response.statusCode).toBe(200);
    const loaded = await call('save', 'GET', undefined, `Bearer ${parsed.token}`);
    expect(loaded.data).toMatchObject({ revision: 1, missions: [{ id: 'ridge-surveyor', status: 'active' }] });
  });
  it('rejects unauthenticated requests and invalid methods', async () => {
    expect((await call('save', 'GET')).response.statusCode).toBe(401);
    expect((await call('save', 'GET', undefined, 'Bearer ' + 'a'.repeat(64))).response.statusCode).toBe(401);
    const invalid = await call('session', 'GET');
    expect(invalid.response.statusCode).toBe(405);
    expect(invalid.response.getHeader('Allow')).toBe('POST');
  });
  it('limits parsed Vercel payloads and rejects malformed JSON and schema injection', async () => {
    const { token } = await store.create();
    const auth = `Bearer ${token}`;
    expect((await call('save', 'POST', 'x'.repeat(4097), auth)).response.statusCode).toBe(413);
    expect((await call('save', 'POST', '{', auth)).response.statusCode).toBe(400);
    expect((await call('save', 'POST', { type: 'respawn', credits: 500 }, auth)).response.statusCode).toBe(400);
  });
  it('requires durable production configuration', () => {
    for (const name of ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN', 'KV_REST_API_URL', 'KV_REST_API_TOKEN']) vi.stubEnv(name, '');
    expect(() => getProductionStore()).toThrow('not configured');
  });
});
