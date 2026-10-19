// Zera o progresso do Forja no Postgres (Neon), com backup antes.
// Uso:
//   npm run db:reset              só faz o backup (.data/backup-<data>.json) e mostra o que seria apagado
//   npm run db:reset -- --apagar  faz o backup e apaga todos os registros e o timer
// As aulas concluídas nos registros saem no resumo, para levar para `initialCompleted` da temporada nova.

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { neon } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error('DATABASE_URL não está definida. Coloque a URL do Neon em .env.local ou no ambiente e rode de novo.');
  process.exit(1);
}
const apply = process.argv.includes('--apagar');
const sql = neon(url);

const records = await sql`
  select id, season_id, kind, to_char(day, 'YYYY-MM-DD') as day, data, created_at
  from records order by day, created_at, id
`;
const kv = await sql`select key, value from kv`;

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const file = path.join(process.cwd(), '.data', `backup-${stamp}.json`);
await mkdir(path.dirname(file), { recursive: true });
await writeFile(file, `${JSON.stringify({ exportedAt: new Date().toISOString(), records, kv }, null, 2)}\n`, 'utf8');
console.log(`Backup salvo em ${file}`);

const bySeason = {};
const byKind = {};
const lessons = {};
for (const r of records) {
  bySeason[r.season_id] = (bySeason[r.season_id] ?? 0) + 1;
  byKind[r.kind] = (byKind[r.kind] ?? 0) + 1;
  const data = typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
  if (r.kind === 'study' && Array.isArray(data.lessonIds) && data.lessonIds.length) {
    lessons[data.courseSlug] ??= [];
    for (const id of data.lessonIds) if (!lessons[data.courseSlug].includes(id)) lessons[data.courseSlug].push(id);
  }
}
console.log(`Registros: ${records.length}`, bySeason, byKind);
console.log(`Chaves em kv: ${kv.map((k) => k.key).join(', ') || 'nenhuma'}`);
console.log('Aulas concluídas nos registros (para initialCompleted):');
console.log(JSON.stringify(lessons));

if (!apply) {
  console.log('\nNada foi apagado. Rode com --apagar para apagar todos os registros e o timer.');
  process.exit(0);
}

await sql`delete from records`;
await sql`delete from kv where key = 'timer'`;
console.log(`\nApagados ${records.length} registros e o timer. O backup continua em ${file}.`);
