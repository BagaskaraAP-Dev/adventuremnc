import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { sampleLunarElevation } from '@adventuremnc/engine';
import { CloudStore } from './cloud';
const directories: string[] = [];
afterEach(async () => { await Promise.all(directories.splice(0).map(path => rm(path, { recursive: true, force: true }))); });
async function setup() {
  const directory = await mkdtemp(join(tmpdir(), 'mnc-save-'));
  directories.push(directory);
  let now = 1000;
  return { directory, store: new CloudStore(directory, () => now), advance: (seconds: number) => { now += seconds * 1000; } };
}
describe('Authoritative cloud saves', () => {
  it('persists across store restart and isolates sessions', async () => {
    const { store, directory } = await setup();
    const a = await store.create();
    const b = await store.create();
    await store.command(a.token, { type: 'accept', id: 'cold-courier' });
    expect((await new CloudStore(directory).get(a.token)).missions).toHaveLength(1);
    expect((await store.get(b.token)).missions).toEqual([]);
    await expect(store.get('../escape')).rejects.toThrow();
  });
  it('rejects credits, mission state injection and teleporting', async () => {
    const { store } = await setup();
    const { token } = await store.create();
    const save = { type: 'save', position: { x: 0, y: sampleLunarElevation(0, -400), z: -400 }, oxygen: 100, dead: false };
    await expect(store.command(token, { ...save, credits: 9999 })).rejects.toThrow();
    await expect(store.command(token, { ...save, missions: [] })).rejects.toThrow();
    await expect(store.command(token, save)).rejects.toThrow('Movement');
    expect((await store.get(token)).credits).toBe(0);
  });
  it('awards the server reward once under concurrent replay', async () => {
    const { store, advance } = await setup();
    const { token } = await store.create();
    await store.command(token, { type: 'accept', id: 'ridge-surveyor' });
    await expect(store.command(token, { type: 'accept', id: 'cold-courier' })).rejects.toThrow();
    advance(30);
    await store.command(token, { type: 'save', position: { x: 0, y: sampleLunarElevation(0, -400), z: -400 }, oxygen: 100, dead: false });
    await Promise.all([store.command(token, { type: 'interact' }), store.command(token, { type: 'interact' })]);
    expect((await store.get(token)).credits).toBe(250);
    expect((await store.get(token)).missions[0]?.status).toBe('completed');
  });
  it('counts offline time and fails expired missions', async () => {
    const { store, advance } = await setup();
    const { token } = await store.create();
    await store.command(token, { type: 'accept', id: 'ridge-surveyor' });
    advance(601);
    const state = await store.command(token, { type: 'interact' });
    expect(state.missions[0]?.status).toBe('failed');
    expect(state.credits).toBe(0);
  });
});
