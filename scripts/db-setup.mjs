// Cria as tabelas do Forja no Postgres (Neon). Pode rodar quantas vezes quiser.
// Uso: npm run db:setup  (lê DATABASE_URL do ambiente ou de .env.local)
// SQL: specs/001-forja-temporada-1/data-model.md, "Armazenamento".

import { neon } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error('DATABASE_URL não está definida. Coloque a URL do Neon em .env.local ou no ambiente e rode de novo.');
  process.exit(1);
}

const sql = neon(url);

try {
  await sql`
    create table if not exists records (
      id          text primary key,
      season_id   text not null,
      kind        text not null,
      day         date not null,
      data        jsonb not null,
      created_at  timestamptz not null default now()
    )
  `;
  await sql`create index if not exists records_season_day on records (season_id, day)`;
  await sql`
    create table if not exists kv (
      key    text primary key,
      value  jsonb not null
    )
  `;
  console.log('Banco pronto: tabelas records e kv (e o índice records_season_day) existem.');
} catch (err) {
  console.error('Não foi possível criar as tabelas:', err instanceof Error ? err.message : err);
  process.exit(1);
}
