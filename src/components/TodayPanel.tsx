'use client';

// "Hoje" e o timer de estudo (DESIGN.md, seção 6: "Hoje" e "Timer").

import { useEffect, useRef, useState, useTransition } from 'react';
import { addGym, confirmPresence, pauseTimer, resumeTimer, startTimer } from '@/app/actions';
import { season1 } from '@/config/season1';
import { gameDay, longDate } from '@/lib/time';
import type { ActionResult, GameState, NextLesson, TimerView } from '@/lib/types';
import { runAction, useToast } from './feedback';
import { clockParts, clockSpoken, courseBySlug, lessonName, minutesLabel, timeHM } from './format';
import { BookIcon, HammerSolidIcon, HeartIcon } from './icons';
import { RingMeter } from './viz';

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

  const todayMinutes = state.todayInfo?.studyMinutes ?? 0;
  const week = state.currentWeek;
  const gymToday = state.todayInfo?.gym ?? 0;
  const cardioToday = state.todayInfo?.cardio ?? 0;
  const head = (
    <div className="card-head">
      <h2 id="hoje-titulo" className="card-title">
        Hoje
      </h2>
      <span className="card-meta">{longDate(state.today)}</span>
    </div>
  );

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
    const withSession = (sameDay ? todayMinutes : 0) + sessionMin;

    return (
      <section aria-labelledby="hoje-titulo" className="card">
        {head}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <RingMeter
            value={withSession}
            max={GOAL}
            size={156}
            stroke={14}
            label={`${withSession} de ${GOAL} minutos hoje, contando esta sessão`}
          >
            <p
              role="timer"
              aria-label={`Sessão de estudo: ${clockSpoken(n.credited)}`}
              className="text-[2rem] font-bold leading-9 num"
            >
              <ClockDigits text={clockParts(n.credited)} />
            </p>
            <span className="text-small text-muted num">{paused ? 'pausado' : `${withSession} de ${GOAL} min`}</span>
          </RingMeter>
          <div className="min-w-0 flex-1">
            <p className="text-lead font-bold">{course?.name ?? 'Estudo livre'}</p>
            <p className="mt-0.5 flex items-center gap-2 text-body text-muted">
              <BookIcon size={18} />
              {lesson ? `Aula: ${lessonName(lesson.title)}` : 'Sem próxima aula na fila'}
            </p>
            <p className="mt-1 text-small text-muted num">
              {sameDay ? 'A sessão soma no dia de hoje.' : 'Esta sessão conta para ontem, o dia em que começou.'}
              {timer.pomodoro && !paused && !n.awaiting
                ? ` Pomodoro: ${Math.floor((n.credited % FOCUS_MS) / MIN)} de ${season1.timer.pomodoroFocus} min de foco.`
                : ''}
            </p>

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
                <p className="text-body font-medium">O timer pausou às {timeHM(n.deadline)}. Esse intervalo foi estudo?</p>
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
                className="btn btn-ink"
                disabled={pending}
                onClick={() => onStopSession({ creditedMs: n.credited, pendingMs: n.pending })}
              >
                Encerrar sessão
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="hoje-titulo" className="card">
      {head}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <RingMeter
          value={todayMinutes}
          max={GOAL}
          size={156}
          stroke={14}
          label={`${todayMinutes} de ${GOAL} minutos de estudo hoje`}
        >
          <span className="figure text-[2.5rem] leading-10">{todayMinutes}</span>
          <span className="text-small text-muted num">de {GOAL} min</span>
          {todayMinutes >= GOAL ? (
            <span className="mt-0.5 text-micro font-bold text-ink">meta cumprida</span>
          ) : null}
        </RingMeter>

        <div className="min-w-0 flex-1">
          <p className="text-lead font-medium">{statusSentence(state)}</p>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3">
            <button type="button" className="btn btn-primary" disabled={pending} onClick={studyNow}>
              Estudar agora
            </button>
            <label className="inline-flex cursor-pointer items-center gap-2 text-small text-muted">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[var(--text)]"
                checked={pomodoro}
                onChange={(e) => setPomodoro(e.target.checked)}
              />
              Pomodoro (25 min de foco e 5 de pausa)
            </label>
          </div>
          <p className="mt-3 flex items-start gap-2 text-body">
            <span className="mt-0.5 text-muted" aria-hidden="true">
              <BookIcon size={18} />
            </span>
            <span className="min-w-0">
              {next ? (
                <>
                  <span className="text-muted">Próxima aula: </span>
                  <span className="font-bold">{lessonName(next.title)}</span>{' '}
                  <span className="text-muted num">({minutesLabel(next.minutes)})</span>
                </>
              ) : (
                'A fila de cursos acabou. O timer conta mesmo assim.'
              )}
            </span>
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="tile flex-wrap">
          <span className={gymToday > 0 ? 'text-ink' : 'text-muted'} aria-hidden="true">
            <HammerSolidIcon size={28} filled={gymToday > 0} />
          </span>
          <div className="min-w-[9.5rem] flex-1">
            <p className="text-body font-bold">Academia</p>
            <p className="text-small text-muted num">
              {week ? `${Math.min(week.gym, week.gymTarget)} de ${week.gymTarget} na semana` : 'Fora da temporada'}
              {gymToday > 0 ? ` (${gymToday} hoje)` : ''}
            </p>
          </div>
          <button
            type="button"
            className="btn btn-outline ml-auto"
            disabled={pending}
            onClick={() => act(() => addGym({ day: state.today }), 'O treino', 'Treino marcado')}
          >
            Marcar treino
          </button>
        </div>
        <div className="tile flex-wrap">
          <span className={cardioToday > 0 ? 'text-[var(--heat-1)]' : 'text-muted'} aria-hidden="true">
            <HeartIcon size={28} filled={cardioToday > 0} />
          </span>
          <div className="min-w-[9.5rem] flex-1">
            <p className="text-body font-bold">Cardio</p>
            <p className="text-small text-muted num">
              {week ? `${Math.min(week.cardio, week.cardioTarget)} de ${week.cardioTarget} na semana` : 'Fora da temporada'}
              {cardioToday > 0 ? ` (${cardioToday} hoje)` : ''}
            </p>
          </div>
          <button type="button" className="btn btn-outline ml-auto" onClick={() => onOpenCardio(state.today)}>
            Marcar cardio
          </button>
        </div>
      </div>
    </section>
  );
}
