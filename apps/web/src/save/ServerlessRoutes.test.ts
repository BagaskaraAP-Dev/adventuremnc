import { IncomingMessage, ServerResponse } from 'node:http';
import { Socket } from 'node:net';
import { afterEach, expect, it, vi } from 'vitest';
import session from '../../api/session';
import save from '../../api/save';

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
it('round-trips the Vercel session/save entrypoints through durable Redis REST', async () => {
  vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://redis.example');
  vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'server-only-secret');
  const records = new Map<string, string>();
  const request = vi.fn<typeof fetch>(async (_url, options) => {
    const command: unknown = JSON.parse(String(options?.body));
    if (!Array.isArray(command) || !command.every((value: unknown) => typeof value === 'string')) throw new Error('Invalid Redis command');
    const args = command as string[];
    if (args[0] === 'GET') return Response.json({ result: records.get(args[1] ?? '') ?? null });
    if (args[0] !== 'EVAL') throw new Error('Unexpected command');
    const key = args[3] ?? '';
    const old = records.get(key);
    const matches = args[4] === 'missing' ? old === undefined : old === args[5];
    if (matches) records.set(key, args[6] ?? '');
    return Response.json({ result: matches ? 1 : 0 });
  });
  vi.stubGlobal('fetch', request);
  async function call(handler: typeof session, method: string, token?: string, body?: unknown) {
    const req = Object.assign(new IncomingMessage(new Socket()), { body });
    req.method = method;
    if (token) req.headers.authorization = `Bearer ${token}`;
    const res = new ServerResponse(req);
    const end = vi.spyOn(res, 'end').mockReturnValue(res);
    await handler(req, res);
    const data: unknown = JSON.parse(String(end.mock.calls[0]?.[0]));
    return { data, status: res.statusCode };
  }
  const created = await call(session, 'POST');
  expect(created.status).toBe(201);
  const data = created.data;
  if (!data || typeof data !== 'object' || !('token' in data) || typeof data.token !== 'string') throw new Error('Missing session');
  expect((await call(save, 'POST', data.token, { type: 'accept', id: 'ridge-surveyor' })).status).toBe(200);
  const loaded = await call(save, 'GET', data.token);
  expect(loaded.data).toMatchObject({ revision: 1, missions: [{ id: 'ridge-surveyor', status: 'active' }] });
  expect(records.size).toBe(1);
  expect(request.mock.calls.every(call => call[0] === 'https://redis.example')).toBe(true);
  expect(JSON.stringify(loaded.data)).not.toContain('server-only-secret');
});
