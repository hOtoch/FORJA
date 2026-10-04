// Armazenamento do Forja: registros de fatos (`records`) e o timer em andamento (`kv['timer']`).
// Dois adaptadores com a mesma interface (data-model.md, "Armazenamento"):
// - Neon (Postgres) quando há DATABASE_URL;
// - arquivo JSON local (.data/forja.json) quando não há, só fora de produção.

import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { neon } from '@neondatabase/serverless';
import type { ForjaRecord, TimerState } from './types';

export interface Store {
  /** Registros da temporada, em ordem de dia e de criação. */
  listRecords(seasonId: string): Promise<ForjaRecord[]>;
  addRecord(r: ForjaRecord): Promise<void>;
  /** true se o registro existia e foi apagado. */
  deleteRecord(id: string): Promise<boolean>;
  getTimer(): Promise<TimerState | null>;
  /** null apaga o timer. */
  setTimer(t: TimerState | null): Promise<void>;
}

const TIMER_KEY = 'timer';

function byDayThenCreated(a: ForjaRecord, b: ForjaRecord): number {
  if (a.day !== b.day) return a.day < b.day ? -1 : 1;
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1;
  return 0;
}

// ---------- Neon ----------

interface RecordRow {
  id: string;
  season_id: string;
  kind: ForjaRecord['kind'];
  day: string;
  data: unknown;
  created_at: string | Date;
}

function parseJson<T>(value: unknown): T {
  return (typeof value === 'string' ? JSON.parse(value) : value) as T;
}

function rowToRecord(row: RecordRow): ForjaRecord {
  return {
    id: row.id,
    seasonId: row.season_id,
    kind: row.kind,
    day: row.day,
    createdAt: new Date(row.created_at).toISOString(),
    data: parseJson(row.data),
  } as ForjaRecord;
}

export function createNeonStore(databaseUrl: string): Store {
  const sql = neon(databaseUrl);
  return {
    async listRecords(seasonId) {
      const rows = (await sql`
        select id, season_id, kind, to_char(day, 'YYYY-MM-DD') as day, data, created_at
        from records
        where season_id = ${seasonId}
        order by day, created_at, id
      `) as RecordRow[];
      return rows.map(rowToRecord);
    },
    async addRecord(r) {
      await sql`
        insert into records (id, season_id, kind, day, data, created_at)
        values (${r.id}, ${r.seasonId}, ${r.kind}, ${r.day}::date, ${JSON.stringify(r.data)}::jsonb, ${r.createdAt}::timestamptz)
      `;
    },
    async deleteRecord(id) {
      const rows = await sql`delete from records where id = ${id} returning id`;
      return rows.length > 0;
    },
    async getTimer() {
      const rows = (await sql`select value from kv where key = ${TIMER_KEY}`) as { value: unknown }[];
      return rows.length ? parseJson<TimerState>(rows[0].value) : null;
    },
    async setTimer(t) {
      if (t === null) {
        await sql`delete from kv where key = ${TIMER_KEY}`;
        return;
      }
      await sql`
        insert into kv (key, value) values (${TIMER_KEY}, ${JSON.stringify(t)}::jsonb)
        on conflict (key) do update set value = excluded.value
      `;
    },
  };
}

// ---------- Arquivo JSON ----------

interface FileData {
  records: ForjaRecord[];
  kv: Record<string, unknown>;
}

function isMissing(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === 'ENOENT';
}

function isBusy(err: unknown): boolean {
  const code = typeof err === 'object' && err !== null ? (err as { code?: string }).code : undefined;
  return code === 'EPERM' || code === 'EBUSY' || code === 'EACCES';
}

export function createFileStore(filePath: string): Store {
  const file = path.resolve(filePath);
  // Fila em memória: uma leitura-modificação-escrita por vez neste processo.
  let queue: Promise<unknown> = Promise.resolve();

  function exclusive<T>(fn: () => Promise<T>): Promise<T> {
    const run = queue.then(fn, fn);
    queue = run.catch(() => undefined);
    return run;
  }

  async function read(): Promise<FileData> {
    try {
      const parsed = JSON.parse(await readFile(file, 'utf8')) as Partial<FileData>;
      return {
        records: Array.isArray(parsed.records) ? parsed.records : [],
        kv: parsed.kv && typeof parsed.kv === 'object' ? parsed.kv : {},
      };
    } catch (err) {
      if (isMissing(err)) return { records: [], kv: {} };
      throw err;
    }
  }

  /** Escrita atômica: grava num arquivo temporário e renomeia por cima do original. */
  async function write(data: FileData): Promise<void> {
    await mkdir(path.dirname(file), { recursive: true });
    const tmp = `${file}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
    await writeFile(tmp, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
    // No Windows o rename pode falhar por um instante se outro processo (antivírus,
    // indexador) estiver com o arquivo aberto; tenta de novo algumas vezes.
    for (let attempt = 0; ; attempt++) {
      try {
        await rename(tmp, file);
        return;
      } catch (err) {
        if (!isBusy(err) || attempt >= 5) {
          await rm(tmp, { force: true });
          throw err;
        }
        await new Promise((resolve) => setTimeout(resolve, 20 * (attempt + 1)));
      }
    }
  }

  function update<T>(fn: (data: FileData) => T): Promise<T> {
    return exclusive(async () => {
      const data = await read();
      const result = fn(data);
      await write(data);
      return result;
    });
  }

  return {
    async listRecords(seasonId) {
      const data = await exclusive(read);
      return data.records.filter((r) => r.seasonId === seasonId).sort(byDayThenCreated);
    },
    async addRecord(r) {
      await update((data) => {
        if (data.records.some((x) => x.id === r.id)) {
          throw new Error(`Já existe um registro com o id ${r.id}.`);
        }
        data.records.push(r);
      });
    },
    async deleteRecord(id) {
      return update((data) => {
        const before = data.records.length;
        data.records = data.records.filter((r) => r.id !== id);
        return data.records.length < before;
      });
    },
    async getTimer() {
      const data = await exclusive(read);
      return (data.kv[TIMER_KEY] as TimerState | undefined) ?? null;
    },
    async setTimer(t) {
      await update((data) => {
        if (t === null) delete data.kv[TIMER_KEY];
        else data.kv[TIMER_KEY] = t;
      });
    },
  };
}

// ---------- Escolha do adaptador ----------

export const DEFAULT_DATA_FILE = path.join('.data', 'forja.json');

let cached: { key: string; store: Store } | null = null;

/**
 * Store do ambiente atual: Neon com DATABASE_URL; senão, o arquivo .data/forja.json.
 * Em produção, sem DATABASE_URL, lança um erro claro (o disco da Vercel não guarda dados).
 */
export function getStore(): Store {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (databaseUrl) {
    const key = `neon:${databaseUrl}`;
    if (cached?.key !== key) cached = { key, store: createNeonStore(databaseUrl) };
    return cached.store;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'DATABASE_URL não está configurada. Em produção o Forja precisa do Postgres (Neon): ' +
        'ligue o Neon ao projeto na Vercel ou defina DATABASE_URL e rode "npm run db:setup".',
    );
  }
  const file = path.join(process.cwd(), DEFAULT_DATA_FILE);
  const key = `file:${file}`;
  if (cached?.key !== key) cached = { key, store: createFileStore(file) };
  return cached.store;
}
