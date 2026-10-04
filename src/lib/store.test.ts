import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createFileStore, getStore } from './store';
import type { CardioRecord, ForjaRecord, GymRecord, StudyRecord, TimerState } from './types';

function study(id: string, day: string, createdAt: string, minutes = 30): StudyRecord {
  return {
    id,
    seasonId: 's1',
    kind: 'study',
    day,
    createdAt,
    data: { courseSlug: 'desenvolvimento-assistido-por-ia', minutes, source: 'manual', lessonIds: [980] },
  };
}

function gym(id: string, day: string, seasonId = 's1'): GymRecord {
  return { id, seasonId, kind: 'gym', day, createdAt: `${day}T15:00:00.000Z`, data: {} };
}

const timer: TimerState = {
  courseSlug: 'desenvolvimento-assistido-por-ia',
  startedAt: '2026-10-06T22:00:00.000Z',
  accumulatedMs: 0,
  runningSince: '2026-10-06T22:00:00.000Z',
  lastConfirmAt: '2026-10-06T22:00:00.000Z',
  pomodoro: false,
};

describe('store em arquivo', () => {
  let dir: string;
  let file: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'forja-store-'));
    file = path.join(dir, '.data', 'forja.json');
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('começa vazio sem criar arquivo', async () => {
    const store = createFileStore(file);
    expect(await store.listRecords('s1')).toEqual([]);
    expect(await store.getTimer()).toBeNull();
    await expect(readFile(file, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('grava no formato { records, kv } e cria a pasta', async () => {
    const store = createFileStore(file);
    const r = study('a', '2026-10-06', '2026-10-06T20:00:00.000Z');
    await store.addRecord(r);
    const saved = JSON.parse(await readFile(file, 'utf8'));
    expect(saved).toEqual({ records: [r], kv: {} });
  });

  it('lista só a temporada pedida, por dia e por criação', async () => {
    const store = createFileStore(file);
    const later = study('c', '2026-10-07', '2026-10-07T10:00:00.000Z');
    const first = study('a', '2026-10-06', '2026-10-06T20:00:00.000Z');
    const second = study('b', '2026-10-06', '2026-10-06T23:00:00.000Z');
    await store.addRecord(later);
    await store.addRecord(second);
    await store.addRecord(gym('outra', '2026-10-06', 's2'));
    await store.addRecord(first);
    expect((await store.listRecords('s1')).map((r) => r.id)).toEqual(['a', 'b', 'c']);
    expect((await store.listRecords('s2')).map((r) => r.id)).toEqual(['outra']);
  });

  it('preserva os dados de cada tipo de registro', async () => {
    const store = createFileStore(file);
    const cardio: CardioRecord = {
      id: 'k',
      seasonId: 's1',
      kind: 'cardio',
      day: '2026-10-06',
      createdAt: '2026-10-06T21:00:00.000Z',
      data: { modality: 'pelada', minutes: 15, isSuper: true },
    };
    await store.addRecord(cardio);
    const [back] = (await store.listRecords('s1')) as ForjaRecord[];
    expect(back).toEqual(cardio);
  });

  it('recusa id repetido', async () => {
    const store = createFileStore(file);
    await store.addRecord(gym('x', '2026-10-06'));
    await expect(store.addRecord(gym('x', '2026-10-07'))).rejects.toThrow();
    expect(await store.listRecords('s1')).toHaveLength(1);
  });

  it('apaga por id e diz se existia', async () => {
    const store = createFileStore(file);
    await store.addRecord(gym('x', '2026-10-06'));
    await store.addRecord(gym('y', '2026-10-06'));
    expect(await store.deleteRecord('x')).toBe(true);
    expect(await store.deleteRecord('x')).toBe(false);
    expect((await store.listRecords('s1')).map((r) => r.id)).toEqual(['y']);
  });

  it('guarda, troca e apaga o timer em kv.timer', async () => {
    const store = createFileStore(file);
    await store.setTimer(timer);
    expect(await store.getTimer()).toEqual(timer);
    expect(JSON.parse(await readFile(file, 'utf8')).kv).toEqual({ timer });

    const paused = { ...timer, runningSince: null, accumulatedMs: 60_000 };
    await store.setTimer(paused);
    expect(await store.getTimer()).toEqual(paused);

    await store.setTimer(null);
    expect(await store.getTimer()).toBeNull();
    expect(JSON.parse(await readFile(file, 'utf8')).kv).toEqual({});
  });

  it('timer e registros não se atrapalham', async () => {
    const store = createFileStore(file);
    await store.setTimer(timer);
    await store.addRecord(gym('x', '2026-10-06'));
    await store.setTimer(null);
    expect(await store.listRecords('s1')).toHaveLength(1);
  });

  it('outra instância lê o que foi gravado (persistência em disco)', async () => {
    await createFileStore(file).addRecord(gym('x', '2026-10-06'));
    await createFileStore(file).setTimer(timer);
    const fresh = createFileStore(file);
    expect((await fresh.listRecords('s1')).map((r) => r.id)).toEqual(['x']);
    expect(await fresh.getTimer()).toEqual(timer);
  });

  it('gravações simultâneas não se perdem e não sobram temporários', async () => {
    const store = createFileStore(file);
    await Promise.all(
      Array.from({ length: 25 }, (_, i) => store.addRecord(gym(`g${i}`, '2026-10-06'))),
    );
    expect(await store.listRecords('s1')).toHaveLength(25);
    const files = await readdir(path.dirname(file));
    expect(files).toEqual(['forja.json']);
  });

  it('aceita um arquivo existente sem a chave kv', async () => {
    const store = createFileStore(file);
    await store.addRecord(gym('x', '2026-10-06'));
    await writeFile(file, JSON.stringify({ records: [gym('y', '2026-10-07')] }), 'utf8');
    expect((await store.listRecords('s1')).map((r) => r.id)).toEqual(['y']);
    expect(await store.getTimer()).toBeNull();
  });
});

describe('getStore', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('em produção sem DATABASE_URL lança erro claro em português', () => {
    vi.stubEnv('DATABASE_URL', '');
    vi.stubEnv('NODE_ENV', 'production');
    expect(() => getStore()).toThrow(/DATABASE_URL não está configurada/);
  });

  it('fora de produção sem DATABASE_URL usa o arquivo local', () => {
    vi.stubEnv('DATABASE_URL', '');
    vi.stubEnv('NODE_ENV', 'development');
    const store = getStore();
    expect(store).toBeDefined();
    expect(getStore()).toBe(store);
  });

  it('com DATABASE_URL usa o Neon (sem conectar ao criar)', () => {
    vi.stubEnv('DATABASE_URL', 'postgresql://user:pass@example.neon.tech/forja?sslmode=require');
    vi.stubEnv('NODE_ENV', 'production');
    const neonStore = getStore();
    expect(typeof neonStore.listRecords).toBe('function');
    vi.stubEnv('DATABASE_URL', '');
    vi.stubEnv('NODE_ENV', 'development');
    expect(getStore()).not.toBe(neonStore);
  });
});
