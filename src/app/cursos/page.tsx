import type { Metadata } from 'next';
import { Header } from '@/components/Header';
import { ToastProvider } from '@/components/feedback';
import { courseBySlug, lessonName, lessonTitleById, minutesLabel, projDate } from '@/components/format';
import { MedalIcon } from '@/components/icons';
import { season } from '@/config/season';
import { loadDashboard } from '@/lib/load-state';
import { longDate } from '@/lib/time';
import type { CourseProgress, ForjaRecord, GameState, StudyRecord } from '@/lib/types';

export const metadata: Metadata = { title: 'Cursos do Forja' };

function summary(state: GameState): string {
  const end = state.queueProjectedEnd;
  if (!end) return 'Ainda não dá para prever quando a fila acaba.';
  if (state.queueEndsBeforeSeason)
    return `No seu ritmo, a fila acaba em ${projDate(end)}, antes do fim da temporada. Escolha o próximo curso.`;
  return `No seu ritmo, a fila acaba em ${projDate(end)}.`;
}

function CourseMap({ course, position, state }: { course: CourseProgress; position: number; state: GameState }) {
  const current = course.slug === state.currentCourseSlug;
  const next = state.nextLesson;
  const leftMin = course.totalMinutes - course.doneMinutes;
  const currentModule = course.modules.findIndex((m) => !m.completed);
  const pct = course.totalMinutes > 0 ? (course.doneMinutes / course.totalMinutes) * 100 : 0;
  const headingId = `curso-${course.slug}`;

  return (
    <section aria-labelledby={headingId} className="card">
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
        {course.completed ? '' : course.projectedEnd ? `Previsão: até ${projDate(course.projectedEnd)}.` : 'Sem previsão.'}
      </p>
      <div className="rail mt-3" aria-hidden="true">
        <span style={{ width: `${pct}%` }} />
      </div>

      <ol className="mt-6 space-y-2">
        {course.modules.map((m, i) => {
          const open = current && i === currentModule;
          const left = m.lessons.filter((l) => !l.done).reduce((a, l) => a + (l.minutes || season.courses.missingDurationMin), 0);
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
                          href={season.courses.lessonUrl(course.slug, l.id)}
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

/** Diário de aprendizado: os resumos escritos ao encerrar cada estudo, do mais novo ao mais velho. */
function Journal({ state, records }: { state: GameState; records: ForjaRecord[] }) {
  const entries = records
    .filter((r): r is StudyRecord => r.kind === 'study' && Boolean(r.data.summary))
    .sort((a, b) => b.day.localeCompare(a.day) || b.createdAt.localeCompare(a.createdAt));
  return (
    <section aria-labelledby="diario-titulo" className="card mt-8">
      <div className="card-head">
        <h2 id="diario-titulo" className="card-title">
          Diário de aprendizado
        </h2>
        <span className="card-meta num">
          {entries.length === 0 ? 'nenhum resumo ainda' : `${entries.length} ${entries.length === 1 ? 'resumo' : 'resumos'}`}
        </span>
      </div>
      {entries.length === 0 ? (
        <p className="text-body text-muted">
          Cada estudo encerrado pede um resumo do que você aprendeu. Eles ficam aqui, prontos para virar post no LinkedIn.
        </p>
      ) : (
        <ol className="space-y-4">
          {entries.map((r) => {
            const course = courseBySlug(state, r.data.courseSlug);
            const lessons = r.data.lessonIds.map((id) => lessonTitleById(state, id)).filter(Boolean);
            return (
              <li key={r.id} className="border-l-2 border-line pl-4">
                <p className="text-small text-muted num">
                  {longDate(r.day)} · {course?.name ?? r.data.courseSlug} · {r.data.minutes} min
                  {lessons.length > 0 ? ` · ${lessons.join('; ')}` : ''}
                </p>
                <p className="mt-1 max-w-[80ch] whitespace-pre-line text-body">{r.data.summary}</p>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

export default async function CursosPage() {
  const { state, records } = await loadDashboard();
  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 pb-16 pt-3 md:px-8">
      <ToastProvider>
        <Header />
      </ToastProvider>
      <main className="mt-8">
        <h1 className="font-gothic text-[2.25rem] leading-10 font-extrabold">Mapa dos cursos</h1>
        <p className="mt-2 max-w-[72ch] text-lead">{summary(state)}</p>
        <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
          {state.courses.map((c, i) => (
            <CourseMap key={c.slug} course={c} position={i + 1} state={state} />
          ))}
        </div>
        <Journal state={state} records={records} />
      </main>
    </div>
  );
}
