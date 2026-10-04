// Fila de cursos: o atual em destaque, com módulo e próxima aula; previsão de término.

import Link from 'next/link';
import { shortDate } from '@/lib/time';
import type { GameState } from '@/lib/types';
import { lessonName } from './format';
import { MedalIcon } from './icons';

export function CoursesPanel({ state }: { state: GameState }) {
  const next = state.nextLesson;

  return (
    <section aria-labelledby="cursos-titulo" className="min-w-0">
      <h2 id="cursos-titulo" className="flex h-10 items-end font-gothic text-title font-bold">
        Cursos
      </h2>
      <ol className="mt-3 space-y-3">
        {state.courses.map((c) => {
          const current = c.slug === state.currentCourseSlug;
          const pct = c.totalMinutes > 0 ? (c.doneMinutes / c.totalMinutes) * 100 : 0;
          const moduleIndex = c.modules.findIndex((m) => !m.completed);
          const mod = moduleIndex >= 0 ? c.modules[moduleIndex] : null;
          return (
            <li key={c.slug} className="min-w-0">
              <p className={`flex items-center gap-1.5 truncate text-body ${current ? 'font-bold' : ''}`}>
                {c.completed ? <MedalIcon size={18} label="Concluído" /> : null}
                <span className="truncate">{c.name}</span>
              </p>
              {current && mod ? (
                <>
                  <p className="truncate text-small text-muted" title={mod.name}>
                    Módulo {moduleIndex + 1}: {mod.name}
                  </p>
                  {next && next.courseSlug === c.slug ? (
                    <p className="truncate text-small text-muted" title={lessonName(next.title)}>
                      Próxima aula: {lessonName(next.title)}
                    </p>
                  ) : null}
                </>
              ) : null}
              <div className="mt-1 flex items-center gap-3">
                <div className="rail flex-1" aria-hidden="true">
                  <span style={{ width: `${pct}%` }} />
                </div>
                <span className="shrink-0 text-small font-medium num">
                  {c.completed ? 'concluído' : c.projectedEnd ? `até ${shortDate(c.projectedEnd)}` : 'sem previsão'}
                </span>
              </div>
              <p className="sr-only">
                {c.doneLessons} de {c.totalLessons} aulas concluídas.
              </p>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-small">
        {state.queueEndsBeforeSeason && state.queueProjectedEnd ? (
          <span>A fila acaba em {shortDate(state.queueProjectedEnd)}. Escolha o próximo curso. </span>
        ) : null}
        <Link href="/cursos" className="link">
          Ver cursos
        </Link>
      </p>
    </section>
  );
}
