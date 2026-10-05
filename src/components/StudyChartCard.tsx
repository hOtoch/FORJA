// Estudo dos últimos 14 dias: colunas com a linha da meta. No começo da temporada, mostra
// as duas primeiras semanas (os dias que ainda vão chegar ficam vazios).

import { season1 } from '@/config/season1';
import { shortDate } from '@/lib/time';
import type { GameState } from '@/lib/types';
import { WEEKDAY_SHORT } from './format';
import { StudyChart, type StudyBar } from './viz';

const WINDOW = 14;
const LETTER = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

export function StudyChartCard({ state }: { state: GameState }) {
  const goal = season1.goals.studyMinutes;
  const todayIdx = state.days.findIndex((d) => d.isToday);
  const end = state.phase === 'after' ? state.days.length : todayIdx >= 0 ? todayIdx + 1 : 0;
  const start = Math.max(0, Math.min(end, state.days.length) - WINDOW);
  const slice = state.days.slice(start, Math.max(start + WINDOW, end)).slice(0, WINDOW);

  const bars: StudyBar[] = slice.map((d) => ({
    date: d.date,
    label: `${WEEKDAY_SHORT[d.weekday - 1]}, ${shortDate(d.date)}`,
    tick: String(Number(d.date.slice(8, 10))),
    weekday: LETTER[d.weekday - 1],
    minutes: d.studyMinutes,
    isFuture: d.isFuture,
    isToday: d.isToday,
    isBreak: d.breakKind !== null,
  }));

  const counted = slice.filter((d) => !d.isFuture && !d.isToday && !d.breakKind);
  const met = counted.filter((d) => d.studyMet).length;
  const studied = slice.filter((d) => !d.isFuture && d.studyMinutes > 0);
  const avg = studied.length ? Math.round(studied.reduce((a, d) => a + d.studyMinutes, 0) / studied.length) : 0;

  return (
    <section aria-labelledby="estudo-titulo" className="card">
      <div className="card-head">
        <h2 id="estudo-titulo" className="card-title">
          Estudo dos últimos 14 dias
        </h2>
        <span className="card-meta num">
          {counted.length > 0 ? `${met} de ${counted.length} dias na meta` : 'começa hoje'}
        </span>
      </div>
      {state.phase === 'before' ? (
        <p className="text-body text-muted">O gráfico começa a se encher em {shortDate(season1.start)}.</p>
      ) : (
        <>
          <StudyChart bars={bars} goal={goal} title="Minutos de estudo por dia, últimos 14 dias" />
          <p className="mt-2 text-small text-muted num">
            {studied.length > 0
              ? `Média de ${avg} min nos dias com estudo.`
              : 'Nenhum estudo registrado nestes dias ainda.'}
          </p>
        </>
      )}
    </section>
  );
}
