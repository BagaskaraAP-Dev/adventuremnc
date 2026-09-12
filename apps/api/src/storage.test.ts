import { describe, expect, it, vi } from 'vitest';
import { RedisSaveRepository, type SaveRepository } from './storage';
import { CloudStore } from './cloud';
import { sampleLunarElevation } from '@adventuremnc/engine';

describe('Production persistence', () => {
  it('uses authenticated REST and an atomic conditional write', async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json({ result: null })).mockResolvedValueOnce(Response.json({ result: 1 })).mockResolvedValueOnce(Response.json({ result: 0 }));
    const repository = new RedisSaveRepository('https://redis.example', 'secret', request);
    expect(await repository.read('session')).toBeNull();
    expect(await repository.compareAndSet('session', null, 'initial')).toBe(true);
    expect(await repository.compareAndSet('session', 'old', 'next')).toBe(false);
    expect(request.mock.calls[0]?.[1]?.headers).toMatchObject({ Authorization: 'Bearer secret' });
    const args: unknown = JSON.parse(String(request.mock.calls[2]?.[1]?.body));
    expect(args).toEqual(['EVAL', expect.stringContaining("redis.call('GET', KEYS[1])"), '1', 'mnc:save:session', 'present', 'old', 'next']);
  });
  it('propagates outages and malformed Redis responses without falling back to memory', async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response('', { status: 503 })).mockResolvedValueOnce(Response.json({ error: 'denied' })).mockResolvedValueOnce(Response.json({ result: {} }));
    const repository = new RedisSaveRepository('https://redis.example', 'secret', request);
    await expect(repository.read('test')).rejects.toThrow('unavailable');
    await expect(repository.read('test')).rejects.toThrow('rejected');
    await expect(repository.read('test')).rejects.toThrow('Invalid');
  });
  it('awards once across independent instances racing on the same record', async () => {
    const records = new Map<string, string>();
    const repository: SaveRepository = {
      read: async key => records.get(key) ?? null,
      compareAndSet: async (key, previous, next) => {
        if ((records.get(key) ?? null) !== previous) return false;
        records.set(key, next);
        return true;
      },
    };
    let now = 0;
    const a = new CloudStore(repository, () => now);
    const b = new CloudStore(repository, () => now);
    const { token } = await a.create();
    await a.command(token, { type: 'accept', id: 'ridge-surveyor' });
    now = 30000;
    await b.command(token, { type: 'save', position: { x: 0, y: sampleLunarElevation(0, -400), z: -400 }, oxygen: 100, dead: false });
    await Promise.all([a.command(token, { type: 'interact' }), b.command(token, { type: 'interact' })]);
    expect((await new CloudStore(repository, () => now).get(token))).toMatchObject({ credits: 250, revision: 4 });
  });
});
