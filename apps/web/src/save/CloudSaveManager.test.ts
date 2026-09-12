import { afterEach, expect, it, vi } from 'vitest';
import { CloudSaveManager } from './CloudSaveManager';
const token = 'b'.repeat(64);
const state = { version: 1, revision: 0, credits: 0, position: { x: -22, y: 0, z: -8 }, missions: [] };
function setup(saved: string | null = null) {
  const storage = { getItem: vi.fn(() => saved), setItem: vi.fn() };
  vi.stubGlobal('localStorage', storage);
  const request = vi.fn<typeof fetch>();
  vi.stubGlobal('fetch', request);
  return { storage, request, cloud: new CloudSaveManager() };
}
afterEach(() => vi.unstubAllGlobals());
it('automatically creates and syncs to same-origin production routes', async () => {
  const { request, cloud, storage } = setup();
  request.mockResolvedValueOnce(Response.json({ token, state })).mockResolvedValueOnce(Response.json({ ...state, revision: 1 }));
  await cloud.connect();
  await cloud.command({ type: 'airlock' });
  expect(request.mock.calls.map(call => call[0])).toEqual(['/api/session', '/api/save']);
  expect(storage.setItem).toHaveBeenCalledWith('mnc-cloud-session', token);
  expect(request.mock.calls[1]?.[1]).toMatchObject({ headers: { Authorization: `Bearer ${token}` }, body: '{"type":"airlock"}' });
  expect(cloud.state?.revision).toBe(1);
});
it('preserves existing sessions during outages and reconnects on retry', async () => {
  const { request, cloud, storage } = setup(token);
  request.mockResolvedValueOnce(new Response('', { status: 503 })).mockResolvedValueOnce(Response.json(state));
  await expect(cloud.connect()).rejects.toThrow('unavailable');
  await cloud.connect();
  expect(request.mock.calls.map(call => call[0])).toEqual(['/api/save', '/api/save']);
  expect(storage.setItem).not.toHaveBeenCalled();
});
it('replaces only explicitly invalid sessions', async () => {
  const { request, cloud } = setup(token);
  request.mockResolvedValueOnce(new Response('', { status: 401 })).mockResolvedValueOnce(Response.json({ token, state }));
  await cloud.connect();
  expect(request.mock.calls.map(call => call[0])).toEqual(['/api/save', '/api/session']);
});
it('serializes commands and continues after a rejected command', async () => {
  const { request, cloud } = setup(token);
  request.mockResolvedValueOnce(Response.json(state)).mockResolvedValueOnce(new Response('', { status: 409 })).mockResolvedValueOnce(Response.json({ ...state, revision: 1 }));
  await cloud.connect();
  const first = cloud.command({ type: 'interact' });
  const second = cloud.command({ type: 'respawn' });
  await expect(first).rejects.toThrow('conflict');
  expect((await second).revision).toBe(1);
});
