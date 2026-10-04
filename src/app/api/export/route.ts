// GET /api/export: baixa todos os registros da temporada e o timer como JSON.
// Autenticação: cookie de sessão. Contrato: specs/001-forja-temporada-1/contracts/http-api.md

import { season1 } from '@/config/season1';
import { hasSession } from '@/lib/auth';
import { getStore } from '@/lib/store';
import { gameDay, now } from '@/lib/time';

export async function GET() {
  if (!(await hasSession())) {
    return Response.json({ error: 'unauthorized' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  }

  const store = getStore();
  const [records, timer] = await Promise.all([store.listRecords(season1.id), store.getTimer()]);
  const instant = now();
  const day = gameDay(instant, season1.timeZone, season1.dayStartHour);

  const body = JSON.stringify(
    { exportedAt: instant.toISOString(), seasonId: season1.id, records, timer },
    null,
    2,
  );

  return new Response(body, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="forja-${season1.id}-${day}.json"`,
      'Cache-Control': 'no-store',
    },
  });
}
