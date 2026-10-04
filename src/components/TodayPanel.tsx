'use client';

// "Hoje" e o timer de estudo (DESIGN.md, seção 6: "Hoje" e "Timer").

import { useEffect, useRef, useState, useTransition } from 'react';
import { addGym, confirmPresence, pauseTimer, resumeTimer, startTimer } from '@/app/actions';
import { season1 } from '@/config/season1';
import { gameDay, longDate } from '@/lib/time';
import type { ActionResult, GameState, NextLesson, TimerView } from '@/lib/types';
import { runAction, useToast } from './feedback';
import { clockParts, clockSpoken, courseBySlug, lessonName, minutesLabel, timeHM } from './format';

const MIN = 60_000;
const PRESENCE_MS = season1.timer.presenceMinutes * MIN;
const CAP_MS = season1.timer.capMinutes * MIN;
const FOCUS_MS = season1.timer.pomodoroFocus * MIN;
const BREAK_MS = season1.timer.pomodoroBreak * MIN;
/** Até 2 min depois do aviso, "Sim, continuar" conta o intervalo inteiro. */
const QUICK_REPLY_MS = 2 * MIN;
const GOAL = season1.goals.studyMinutes;

export interface StopInfo {
  creditedMs: number;
  /** Intervalo sem confirmação de presença que o usuário pode decidir contar. */
  pendingMs: number;
}

interface Props {
  state: GameState;
  onOpenCardio: (day: string) => void;
  onStopSession: (info: StopInfo) => void;
}

/** Tempo creditado, presença e teto, como em data-model.md ("Timer em andamento"). */
export function timerNumbers(t: TimerView, serverNow: number) {
  if (!t.runningSince) {
    const credited = Math.min(t.accumulatedMs, CAP_MS);
    return { credited, awaiting: false, pending: 0, deadline: null as number | null, capped: credited >= CAP_MS };
  }
  const since = Date.parse(t.runningSince);
  const deadline = Date.parse(t.lastConfirmAt) + PRESENCE_MS;
  const raw = t.accumulatedMs + Math.max(0, Math.min(serverNow, deadline) - since);
  const credited = Math.min(raw, CAP_MS);
  const awaiting = serverNow > deadline;
  const gapStart = Math.max(deadline, since);
  const pending = awaiting ? Math.min(Math.max(0, serverNow - gapStart), CAP_MS - credited) : 0;
  return { credited, awaiting, pending, deadline, capped: raw >= CAP_MS };
}

function systemNotify(title: string, body: string) {
  try {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const n = new Notification(title, { body, tag: 'forja-timer' });
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch {
    // notificações indisponíveis: a faixa na própria região basta
  }
}

function statusSentence(state: GameState): string {
  const d = state.todayInfo;
  if (state.phase === 'before')
    return `A temporada começa na ${longDate(season1.start)}. Até lá, o estudo vale XP.`;
  if (state.phase === 'after' || !d) return 'A temporada terminou. O estudo de hoje vale XP.';
  if (d.breakKind) return 'Hoje é folga. A sequência fica guardada até amanhã.';
  if (d.studyMet)
    return d.studyMinutes >= 120
      ? 'Meta de hoje cumprida, com 2h de estudo. O XP do estudo de hoje chegou ao teto.'
      : 'Meta de hoje cumprida. Cada minuto a mais vale XP até 2h.';
  if (state.yesterdayMissedUnprotected) return 'Ontem ficou sem estudo. Se hoje também ficar, a sequência quebra.';
  if (d.studyMinutes === 0)
    return state.nextLesson
      ? `Nenhum estudo hoje ainda. Comece pela aula ${lessonName(state.nextLesson.title)}.`
      : 'Nenhum estudo hoje ainda.';
  return `Faltam ${GOAL - d.studyMinutes} min para a meta de hoje.`;
}

/** Trilho de 12 marcas de 10 min: Brasa até 60, Palha de 60 a 120, traço na meta. */
function StudyRail({ minutes }: { minutes: number }) {
  const marks = Array.from({ length: 12 }, (_, i) => Math.max(0, Math.min(1, (minutes - i * 10) / 10)));
  return (
    <div className="flex items-center gap-4">
      <div className="relative flex w-full max-w-[420px] items-center pb-5" aria-hidden="true">
        {marks.map((fill, i) => (
          <span
            key={i}
            className={`relative h-3 flex-1 overflow-hidden rounded-[2px] bg-track ${i === 6 ? 'ml-[11px]' : i > 0 ? 'ml-[3px]' : ''}`}
          >
            <span
              className="absolute inset-y-0 left-0"
              style={{ width: `${fill * 100}%`, background: i < 6 ? 'var(--heat-2)' : 'var(--heat-3)' }}
            />
          </span>
        ))}
        <span className="absolute left-1/2 top-[-4px] h-5 w-[2px] -translate-x-1/2 bg-ink" />
        <span className="absolute left-1/2 top-[18px] -translate-x-1/2 text-micro font-medium text-muted">meta</span>
      </div>
      <p className="shrink-0 pb-5 text-body font-medium num">
        {minutes < GOAL ? `${minutes} de ${GOAL} min` : `${minutes} min de estudo`}
      </p>
    </div>
  );
}

/** Algarismos em largura fixa, para o tempo não tremer. */
function ClockDigits({ text }: { text: string }) {
  return (
    <>
      {text.split('').map((ch, i) => (
        <span key={i} className={`inline-block text-center ${ch === ':' ? 'w-[0.3em]' : 'w-[0.56em]'}`}>
          {ch}
        </span>
      ))}
    </>
  );
}

export function TodayPanel({ state, onOpenCardio, onStopSession }: Props) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [pomodoro, setPomodoro] = useState(false);
  const [clock, setClock] = useState<{ server: number; client: number } | null>(null);
  const [breakUntil, setBreakUntil] = useState<number | null>(null);
  const notifiedFor = useRef<string | null>(null);
  const breakNotifiedFor = useRef<number | null>(null);

  const timer = state.timer;
  const next: NextLesson | null = state.nextLesson;

  // Contagem local a partir do estado recebido: creditado + tempo desde que o estado chegou.
  useEffect(() => {
    if (!timer && breakUntil === null) return;
    const base = Date.parse(state.now);
    const receivedAt = Date.now();
    let focusBlock = timer ? Math.floor(timerNumbers(timer, base).credited / FOCUS_MS) : 0;

    async function pomodoroBreak() {
      const r = await runAction(() => pauseTimer(), 'A pausa');
      if (!r.ok) {
        toast(r.error, { tone: 'error' });
        return;
      }
      setBreakUntil(Date.now() + BREAK_MS);
      systemNotify('Hora da pausa', `${season1.timer.pomodoroFocus} min de foco feitos. Descanse ${season1.timer.pomodoroBreak} min.`);
    }

    const tick = () => {
      const client = Date.now();
      const server = base + (client - receivedAt);
      setClock({ server, client });
      if (timer) {
        const n = timerNumbers(timer, server);
        if (n.awaiting && notifiedFor.current !== timer.lastConfirmAt) {
          notifiedFor.current = timer.lastConfirmAt;
          systemNotify('Ainda estudando?', 'O Forja parou de contar até você responder.');
        }
        if (timer.pomodoro && timer.runningSince && !n.awaiting && !n.capped) {
          const block = Math.floor(n.credited / FOCUS_MS);
          if (block > focusBlock) {
            focusBlock = block;
            void pomodoroBreak();
          }
        }
      }
      if (breakUntil !== null && client >= breakUntil && breakNotifiedFor.current !== breakUntil) {
        breakNotifiedFor.current = breakUntil;
        systemNotify('A pausa acabou', 'Hora de voltar ao foco.');
      }
    };
    const first = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 250);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, [state.now, timer, breakUntil, toast]);

  function act<T>(call: () => Promise<ActionResult<T>>, what: string, success?: string) {
    startTransition(async () => {
      const r = await runAction(call, what);
      if (!r.ok) toast(r.error, { tone: 'error' });
      else if (success) toast(success);
    });
  }

  function studyNow() {
    try {
      if ('Notification' in window && Notification.permission === 'default') {
        void Notification.requestPermission().catch(() => {});
      }
    } catch {
      // sem notificações
    }
    if (next) window.open(next.url, '_blank', 'noopener');
    const slug = next?.courseSlug ?? state.currentCourseSlug ?? season1.courses.queue[season1.courses.queue.length - 1];
    startTransition(async () => {
      const r = await runAction(() => startTimer(slug, pomodoro), 'A sessão');
      if (!r.ok) toast(r.error, { tone: 'error' });
      else if (!next) toast('Timer ligado. A fila de cursos acabou, então não há próxima aula para abrir.');
    });
  }

  const title = `Hoje, ${longDate(state.today)}`;
  const todayMinutes = state.todayInfo?.studyMinutes ?? 0;

  if (timer) {
    const serverNow = Math.max(clock?.server ?? 0, Date.parse(state.now));
    const n = timerNumbers(timer, serverNow);
    const course = courseBySlug(state, timer.courseSlug);
    const lesson = next && next.courseSlug === timer.courseSlug ? next : null;
    const sameDay = gameDay(timer.startedAt, season1.timeZone, season1.dayStartHour) === state.today;
    const sessionMin = Math.floor(n.credited / MIN);
    const breakLeft = breakUntil !== null && clock ? breakUntil - clock.client : null;
    const paused = !timer.runningSince;
    const gapMin = Math.floor(n.pending / MIN);

    return (
      <section aria-labelledby="hoje-titulo" className="min-w-0">
        <h2 id="hoje-titulo" className="font-gothic text-title font-bold">
          {title}
        </h2>
        <div className="mt-3 flex flex-wrap items-end gap-x-10 gap-y-2">
          <p
            role="timer"
            aria-label={`Sessão de estudo: ${clockSpoken(n.credited)}`}
            className="font-roman text-display-xl font-extrabold num"
          >
            <ClockDigits text={clockParts(n.credited)} />
          </p>
          <div className="min-w-0 pb-2">
            <p className="text-body font-bold">{course?.name ?? 'Estudo livre'}</p>
            <p className="text-small text-muted">
              {lesson ? `Aula: ${lessonName(lesson.title)}` : 'Sem próxima aula na fila'}
            </p>
            <p className="text-small text-muted num">
              {sameDay
                ? `Hoje, com esta sessão: ${todayMinutes + sessionMin} min`
                : 'Esta sessão conta para ontem, o dia em que começou.'}
              {timer.pomodoro && !paused && !n.awaiting
                ? `. Pomodoro: ${Math.floor((n.credited % FOCUS_MS) / MIN)} de ${season1.timer.pomodoroFocus} min de foco`
                : ''}
            </p>
          </div>
        </div>

        {n.capped ? (
          <div className="band mt-3" role="status">
            <p className="text-body">A sessão chegou ao limite de 3 horas. Encerre para salvar.</p>
          </div>
        ) : n.awaiting && n.pending < QUICK_REPLY_MS ? (
          <div className="band mt-3 flex flex-wrap items-center gap-x-4 gap-y-2" role="alert">
            <p className="text-lead font-medium">Ainda estudando?</p>
            <button
              type="button"
              className="btn btn-ink"
              disabled={pending}
              onClick={() => act(() => confirmPresence(true), 'A confirmação')}
            >
              Sim, continuar
            </button>
          </div>
        ) : n.awaiting && n.deadline !== null ? (
          <div className="band mt-3 flex flex-wrap items-center gap-x-4 gap-y-2" role="alert">
            <p className="text-body font-medium">
              O timer pausou às {timeHM(n.deadline)}. Esse intervalo foi estudo?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn btn-ink num"
                disabled={pending}
                onClick={() => act(() => confirmPresence(true), 'A confirmação', `${gapMin} min contados`)}
              >
                Contar {gapMin} min
              </button>
              <button
                type="button"
                className="btn btn-outline"
                disabled={pending}
                onClick={() => act(() => confirmPresence(false), 'A confirmação')}
              >
                Não contar
              </button>
            </div>
          </div>
        ) : breakLeft !== null && paused ? (
          <div className="band mt-3 flex flex-wrap items-center gap-x-4 gap-y-2" role="status">
            <p className="text-body font-medium num">
              {breakLeft > 0 ? `Pausa do Pomodoro: ${clockParts(breakLeft)}` : 'A pausa acabou.'}
            </p>
            <button
              type="button"
              className="btn btn-ink"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const r = await runAction(() => resumeTimer(), 'A sessão');
                  if (!r.ok) toast(r.error, { tone: 'error' });
                  else setBreakUntil(null);
                })
              }
            >
              Voltar ao foco
            </button>
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-3">
          {n.capped || n.awaiting || (breakLeft !== null && paused) ? null : paused ? (
            <button
              type="button"
              className="btn btn-outline"
              disabled={pending}
              onClick={() => act(() => resumeTimer(), 'A sessão')}
            >
              Continuar
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-outline"
              disabled={pending}
              onClick={() => act(() => pauseTimer(), 'A pausa')}
            >
              Pausar
            </button>
          )}
          <button
            type="button"
            className="btn btn-outline font-bold"
            disabled={pending}
            onClick={() => onStopSession({ creditedMs: n.credited, pendingMs: n.pending })}
          >
            Encerrar sessão
          </button>
          {paused && !n.awaiting && breakLeft === null ? (
            <p className="self-center text-small text-muted">Sessão pausada.</p>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="hoje-titulo" className="min-w-0">
      <h2 id="hoje-titulo" className="font-gothic text-title font-bold">
        {title}
      </h2>
      <p className="mt-2 text-lead font-medium">{statusSentence(state)}</p>
      <div className="mt-4">
        <StudyRail minutes={todayMinutes} />
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-6 gap-y-3">
        <button type="button" className="btn btn-primary" disabled={pending} onClick={studyNow}>
          Estudar agora
        </button>
        <div className="min-w-0">
          <p className="text-body">
            {next ? (
              <>
                Próxima aula: <span className="font-bold">{lessonName(next.title)}</span>{' '}
                <span className="num">({minutesLabel(next.minutes)})</span>
              </>
            ) : (
              'A fila de cursos acabou. O timer conta mesmo assim.'
            )}
          </p>
          <label className="mt-1 inline-flex cursor-pointer items-center gap-2 text-small text-muted">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[var(--text)]"
              checked={pomodoro}
              onChange={(e) => setPomodoro(e.target.checked)}
            />
            Pomodoro: 25 min de foco e 5 de pausa
          </label>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          className="btn btn-outline"
          disabled={pending}
          onClick={() => act(() => addGym({ day: state.today }), 'O treino', 'Treino marcado')}
        >
          Marcar treino
        </button>
        <button
          type="button"
          className="btn btn-outline"
          onClick={() => onOpenCardio(state.today)}
        >
          Marcar cardio
        </button>
      </div>
    </section>
  );
}
