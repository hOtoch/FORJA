// GET /api/status: usado pelo lembrete das 21h no Windows. Só leitura.
// Autenticação: Authorization: Bearer <FORJA_STATUS_TOKEN> (não usa o cookie de sessão).
// Contrato: specs/001-forja-temporada-1/contracts/http-api.md

import { season } from '@/config/season';
import { safeEqual } from '@/lib/auth';
import { computeGameState } from '@/lib/game';
import { getStore } from '@/lib/store';
import { now } from '@/lib/time';

// charset explícito: o PowerShell 5.1 lê JSON sem charset como Latin-1 e troca os acentos.
const NO_STORE = { 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8' };

function unauthorized() {
  return Response.json({ error: 'unauthorized' }, { status: 401, headers: NO_STORE });
}

export async function GET(request: Request) {
  const expected = process.env.FORJA_STATUS_TOKEN;
  const match = /^Bearer\s+(\S+)\s*$/i.exec(request.headers.get('authorization') ?? '');
  if (!expected || !match || !(await safeEqual(match[1], expected))) return unauthorized();

  const store = getStore();
  const [records, timer, tasks] = await Promise.all([
    store.listRecords(season.id),
    store.getTimer(),
    store.getTasks(season.id),
  ]);
  const state = computeGameState(records, timer, season, now(), { tasks });

  const studyMinutes =
    state.todayInfo?.studyMinutes ??
    records.reduce((sum, r) => (r.kind === 'study' && r.day === state.today ? sum + r.data.minutes : sum), 0);

  return Response.json(
    {
      today: state.today,
      phase: state.phase,
      studyMinutes,
      workMinutes: state.todayInfo?.workMinutes ?? 0,
      goalMinutes: state.todayInfo?.goalMinutes ?? 0,
      studyDone: state.status.studyDone,
      weekAtRisk: state.status.weekAtRisk,
      reasons: state.status.reasons,
    },
    { headers: NO_STORE },
  );
}
