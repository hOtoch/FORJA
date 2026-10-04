import type { Metadata } from 'next';
import Link from 'next/link';
import { lessonName, minutesLabel } from '@/components/format';
import { MedalIcon } from '@/components/icons';
import { season1 } from '@/config/season1';
import { getSampleState } from '@/lib/game/fixture';
import { shortDate } from '@/lib/time';
import type { CourseProgress, GameState } from '@/lib/types';

export const metadata: Metadata = { title: 'Cursos do Forja' };

function summary(state: GameState): string {
  const end = state.queueProjectedEnd;
  if (!end) return 'Ainda não dá para prever quando a fila acaba.';
  if (state.queueEndsBeforeSeason)
    return `No seu ritmo, a fila acaba em ${shortDate(end)}, antes do fim da temporada. Escolha o próximo curso.`;
  return `No seu ritmo, a fila acaba em ${shortDate(end)}.`;
}

function CourseMap({ course, position, state }: { course: CourseProgress; position: number; state: GameState }) {
  const current = course.slug === state.currentCourseSlug;
  const next = state.nextLesson;
  const leftMin = course.totalMinutes - course.doneMinutes;
  const currentModule = course.modules.findIndex((m) => !m.completed);
  const pct = course.totalMinutes > 0 ? (course.doneMinutes / course.totalMinutes) * 100 : 0;
  const headingId = `curso-${course.slug}`;

  return (
    <section aria-labelledby={headingId} className="min-w-0">
      <h2 id={headingId} className="flex items-center gap-2 font-gothic text-title font-bold">
        {course.name}
        {course.completed ? <MedalIcon size={22} label="Curso concluído" /> : null}
      </h2>
      <p className="mt-1 text-body">
        {position}º da fila{current ? ', o curso atual' : ''}.{' '}
        <span className="num">
          {course.doneLessons} de {course.totalLessons} aulas
        </span>
        {course.completed ? ', concluído.' : <span className="num">, faltam {minutesLabel(leftMin)} de vídeo.</span>}
      </p>
      <p className="text-body num">
        {course.completed ? '' : course.projectedEnd ? `Previsão: até ${shortDate(course.projectedEnd)}.` : 'Sem previsão.'}
      </p>
      <div className="rail mt-3" aria-hidden="true">
        <span style={{ width: `${pct}%` }} />
      </div>

      <ol className="mt-6 space-y-2">
        {course.modules.map((m, i) => {
          const open = current && i === currentModule;
          const left = m.lessons.filter((l) => !l.done).reduce((a, l) => a + (l.minutes || season1.courses.missingDurationMin), 0);
          return (
            <li key={m.name}>
              <details open={open} className="group">
                <summary className="flex cursor-pointer list-none items-baseline gap-3 rounded-[6px] py-1 pr-2 hover:bg-[var(--hover)]">
                  <span className="w-7 shrink-0 text-right font-roman text-lead font-bold num">{i + 1}</span>
                  <span className={`min-w-0 flex-1 text-body ${open ? 'font-bold' : 'font-medium'}`}>{m.name}</span>
                  <span className="shrink-0 text-small text-muted num">
                    {m.completed ? 'concluído' : `${m.done} de ${m.total}, faltam ${minutesLabel(left)}`}
                  </span>
                </summary>
                <ol className="mb-3 ml-10 mt-1 space-y-1">
                  {m.lessons.map((l) => {
                    const isNext = next?.id === l.id && next.courseSlug === course.slug;
                    return (
                      <li key={l.id} className="flex items-start gap-2.5 text-small">
                        <span
                          className={`mt-[5px] h-2.5 w-2.5 shrink-0 rounded-[1px] border-[1.5px] border-ink ${l.done ? 'bg-ink' : ''}`}
                          aria-hidden="true"
                        />
                        <a
                          href={season1.courses.lessonUrl(course.slug, l.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`min-w-0 flex-1 rounded-[2px] hover:underline ${isNext ? 'font-bold' : ''} ${
                            l.done ? 'text-muted' : ''
                          }`}
                        >
                          <span className="sr-only">{l.done ? 'Concluída: ' : 'Pendente: '}</span>
                          {lessonName(l.title)}
                          {isNext ? ', a próxima' : ''}
                          <span className="sr-only"> (abre numa aba nova)</span>
                        </a>
                        <span className="shrink-0 text-muted num">{minutesLabel(l.minutes)}</span>
                      </li>
                    );
                  })}
                </ol>
              </details>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export default function CursosPage() {
  const state = getSampleState();
  return (
    <div className="mx-auto w-full max-w-[1776px] px-4 pb-16 pt-4 md:px-8 desk:px-12 desk:pt-5">
      <header className="flex items-start justify-between gap-6">
        <div>
          <Link href="/" className="font-gothic text-[2.5rem] leading-10 font-extrabold">
            Forja
          </Link>
          <p className="mt-0.5 text-small font-medium text-muted">Temporada 1: {season1.name}</p>
        </div>
        <Link href="/" className="btn btn-quiet">
          Voltar ao painel
        </Link>
      </header>
      <main className="mt-8">
        <h1 className="font-gothic text-[2.5rem] leading-10 font-extrabold">Cursos</h1>
        <p className="mt-2 max-w-[72ch] text-lead">{summary(state)}</p>
        <div className="mt-10 grid grid-cols-1 gap-x-12 gap-y-14 lg:grid-cols-3">
          {state.courses.map((c, i) => (
            <CourseMap key={c.slug} course={c} position={i + 1} state={state} />
          ))}
        </div>
      </main>
    </div>
  );
}
