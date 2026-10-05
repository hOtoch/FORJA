// Cursos (revisão 2): a fila com um anel de progresso por curso, o atual em destaque com
// a próxima aula, e a data prevista de término.

import Link from 'next/link';
import type { GameState } from '@/lib/types';
import { lessonName, projDate } from './format';
import { MedalIcon } from './icons';
import { RingMeter } from './viz';

export function CoursesPanel({ state }: { state: GameState }) {
  const next = state.nextLesson;

  return (
    <section aria-labelledby="cursos-titulo" className="card">
      <div className="card-head">
        <h2 id="cursos-titulo" className="card-title">
          Cursos
        </h2>
        <Link href="/cursos" className="link text-small">
          Ver o mapa
        </Link>
      </div>

      <ol className="space-y-3">
        {state.courses.map((c, i) => {
          const current = c.slug === state.currentCourseSlug;
          const pct = c.totalLessons > 0 ? Math.round((c.doneLessons / c.totalLessons) * 100) : 0;
          return (
            <li
              key={c.slug}
              className={`flex items-center gap-3 rounded-[10px] p-2 ${current ? 'bg-bg ring-1 ring-line' : ''}`}
            >
              <RingMeter
                value={c.doneLessons}
                max={c.totalLessons}
                size={52}
                stroke={6}
                color={current ? 'var(--heat-2)' : 'var(--text)'}
                label={`${c.name}: ${c.doneLessons} de ${c.totalLessons} aulas`}
              >
                {c.completed ? <MedalIcon size={20} /> : <span className="text-micro font-bold num">{pct}%</span>}
              </RingMeter>
              <div className="min-w-0 flex-1">
                <p className={`truncate text-body ${current ? 'font-bold' : 'font-medium'}`}>
                  <span className="sr-only">{i + 1}. </span>
                  {c.name}
                </p>
                {current && next && next.courseSlug === c.slug ? (
                  <p className="truncate text-small text-muted" title={lessonName(next.title)}>
                    Próxima aula: {lessonName(next.title)}
                  </p>
                ) : (
                  <p className="text-small text-muted num">
                    {c.doneLessons} de {c.totalLessons} aulas
                  </p>
                )}
              </div>
              <p className="shrink-0 text-right text-small">
                <span className="block text-micro text-muted">{c.completed ? '' : 'termina'}</span>
                <span className="font-bold num">
                  {c.completed ? 'concluído' : c.projectedEnd ? projDate(c.projectedEnd) : 'sem previsão'}
                </span>
              </p>
            </li>
          );
        })}
      </ol>
      {state.queueEndsBeforeSeason && state.queueProjectedEnd ? (
        <p className="mt-3 text-small text-muted">
          No seu ritmo, a fila acaba em {projDate(state.queueProjectedEnd)}, antes de 23/12. Escolha o próximo curso.
        </p>
      ) : null}
    </section>
  );
}
