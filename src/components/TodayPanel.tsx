'use client';

// "Hoje" e o timer (DESIGN.md, seção 6: "Hoje" e "Timer"): os blocos da rotina do dia, cada um
// com a sua meta e o botão para ligar o timer nele, e a academia e o cardio da semana.

import { useEffect, useRef, useState, useTransition } from 'react';
import { addGym, confirmPresence, pauseTimer, resumeTimer, startTimer } from '@/app/actions';
import { season } from '@/config/season';
import { gameDay, longDate } from '@/lib/time';
import type { ActionResult, GameState, NextLesson, TimerView } from '@/lib/types';
import { runAction, useToast } from './feedback';
import { blockName, clockParts, clockSpoken, courseBySlug, hoursLabel, joinPt, lessonName, minutesLabel, timeHM } from './format';
import { Sprite } from './pixel';
import { Meter, RingMeter } from './viz';
import { notifyPermission, playChime, systemNotify, unlockAlerts, type NotifyPermission } from './alerts';

const MIN = 60_000;
const PRESENCE_MS = season.timer.presenceMinutes * MIN;
const CAP_MS = season.timer.capMinutes * MIN;
const FOCUS_MS = season.timer.pomodoroFocus * MIN;
const BREAK_MS = season.timer.pomodoroBreak * MIN;
/** Até 2 min depois do aviso, "Sim, continuar" conta o intervalo inteiro. */
const QUICK_REPLY_MS = 2 * MIN;

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

function statusSentence(state: GameState): string {
  const d = state.todayInfo;
  if (state.phase === 'before')
    return `A temporada começa na ${longDate(season.start)}. Até lá, o foco vale XP.`;
  if (state.phase === 'after' || !d) return 'A temporada terminou. O foco de hoje vale XP.';
  if (d.breakKind) return 'Hoje é folga: descanse e planeje a semana. A sequência fica guardada até amanhã.';
  if (d.dayMet)
    return d.workMinutes >= d.goalMinutes + 60
      ? 'Todas as metas de hoje cumpridas, com 1h a mais. Esse extra compensa outro dia da semana.'
      : 'Todas as metas de hoje cumpridas. O que passar da meta compensa outro dia da semana.';
  if (state.yesterdayMissedUnprotected) return 'Ontem ficou sem a meta. Se hoje também ficar, a sequência quebra.';
  const open = d.blocks.filter((b) => !b.met);
  const left = open.reduce((s, b) => s + b.goal - b.minutes, 0);
  if (d.workMinutes === 0) return `Nada registrado hoje ainda. São ${hoursLabel(d.goalMinutes)} de foco pela frente.`;
  return `Faltam ${hoursLabel(left)} hoje: ${joinPt(open.map((b) => blockName(b.id)))}.`;
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
  const [permission, setPermission] = useState<NotifyPermission>('default');

  // Depois de recarregar a página, o som só volta a tocar com um clique: o primeiro clique em
  // qualquer lugar já o prepara (sem pedir permissão de notificação).
  useEffect(() => {
    const unlock = () => unlockAlerts(false);
    document.addEventListener('pointerdown', unlock, { once: true });
    const t = window.setTimeout(() => setPermission(notifyPermission()), 0);
    return () => {
      document.removeEventListener('pointerdown', unlock);
      window.clearTimeout(t);
    };
  }, []);

  // A aba mostra a pausa no título, para dar para ver de outra aba.
  useEffect(() => {
    if (breakUntil === null) return;
    const original = document.title.replace(/^(⏸|▶) [^·]+ · /, '');
    const id = window.setInterval(() => {
      document.title = Date.now() < breakUntil ? `⏸ Pausa · ${original}` : `▶ Volte ao foco · ${original}`;
    }, 1000);
    return () => {
      window.clearInterval(id);
      document.title = original;
    };
  }, [breakUntil]);

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
      const body = `${season.timer.pomodoroFocus} min de foco feitos. Descanse ${season.timer.pomodoroBreak} min.`;
      playChime('pause');
      systemNotify('Hora da pausa', body, 'forja-pomodoro');
      toast(`Hora da pausa: ${body}`);
    }

    const tick = () => {
      const client = Date.now();
      const server = base + (client - receivedAt);
      setClock({ server, client });
      if (timer) {
        const n = timerNumbers(timer, server);
        if (n.awaiting && notifiedFor.current !== timer.lastConfirmAt) {
          notifiedFor.current = timer.lastConfirmAt;
          playChime('attention');
          systemNotify('Ainda no foco?', 'O Forja parou de contar até você responder.', 'forja-presenca');
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
        playChime('focus');
        systemNotify('A pausa acabou', 'Hora de voltar ao foco.', 'forja-pomodoro');
        toast('A pausa acabou. Hora de voltar ao foco.');
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

  /** Liga o timer num bloco; no estudo, abre a próxima aula. */
  function startBlock(block: string) {
    unlockAlerts();
    const isStudy = block === 'estudo';
    if (isStudy && next) window.open(next.url, '_blank', 'noopener');
    const slug = isStudy
      ? (next?.courseSlug ?? state.currentCourseSlug ?? season.courses.queue[season.courses.queue.length - 1])
      : '';
    startTransition(async () => {
      const r = await runAction(() => startTimer(slug, pomodoro, block), 'A sessão');
      if (!r.ok) toast(r.error, { tone: 'error' });
      else if (isStudy && !next) toast('Timer ligado. A fila de cursos acabou, então não há próxima aula para abrir.');
    });
  }

  const todayMinutes = state.todayInfo?.workMinutes ?? 0;
  const todayGoal = state.todayInfo?.goalMinutes ?? 0;
  const todayBlocks = state.todayInfo?.blocks ?? [];
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
    const block = timer.block ?? 'estudo';
    const isStudy = block === 'estudo';
    const course = isStudy ? courseBySlug(state, timer.courseSlug) : undefined;
    const lesson = isStudy && next && next.courseSlug === timer.courseSlug ? next : null;
    const blockToday = todayBlocks.find((b) => b.id === block);
    const blockGoal = blockToday?.goal ?? 0;
    const sameDay = gameDay(timer.startedAt, season.timeZone, season.dayStartHour) === state.today;
    const sessionMin = Math.floor(n.credited / MIN);
    const breakLeft = breakUntil !== null && clock ? breakUntil - clock.client : null;
    const paused = !timer.runningSince;
    const gapMin = Math.floor(n.pending / MIN);
    const withSession = (sameDay ? (blockToday?.minutes ?? 0) : 0) + sessionMin;
    const ringMax = Math.max(blockGoal, 1);

    return (
      <section aria-labelledby="hoje-titulo" className="card">
        {head}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <RingMeter
            value={withSession}
            max={ringMax}
            size={156}
            stroke={14}
            label={`${blockName(block)}: ${withSession} de ${blockGoal} minutos hoje, contando esta sessão`}
          >
            <p
              role="timer"
              aria-label={`Sessão de ${blockName(block)}: ${clockSpoken(n.credited)}`}
              className="text-[2rem] font-bold leading-9 num"
            >
              <ClockDigits text={clockParts(n.credited)} />
            </p>
            <span className="text-small text-muted num">
              {paused ? 'pausado' : blockGoal > 0 ? `${withSession} de ${blockGoal} min` : `${withSession} min hoje`}
            </span>
          </RingMeter>
          <div className="min-w-0 flex-1">
            <p className="text-lead font-bold">
              {isStudy ? (course?.name ?? 'Estudo livre') : blockName(block)}
            </p>
            {isStudy ? (
              <p className="mt-0.5 flex items-center gap-2 text-body text-muted">
                <Sprite name="icone-livro" base={12} scale={2} />
                {lesson ? `Aula: ${lessonName(lesson.title)}` : 'Sem próxima aula na fila'}
              </p>
            ) : null}
            <p className="mt-1 text-small text-muted num">
              {sameDay ? 'A sessão soma no dia de hoje.' : 'Esta sessão conta para ontem, o dia em que começou.'}
              {timer.pomodoro && !paused && !n.awaiting
                ? ` Pomodoro: ${Math.floor((n.credited % FOCUS_MS) / MIN)} de ${season.timer.pomodoroFocus} min de foco.`
                : ''}
            </p>

            {n.capped ? (
              <div className="band mt-3" role="status">
                <p className="text-body">A sessão chegou ao limite de 3 horas. Encerre para salvar.</p>
              </div>
            ) : n.awaiting && n.pending < QUICK_REPLY_MS ? (
              <div className="band mt-3 flex flex-wrap items-center gap-x-4 gap-y-2" role="alert">
                <p className="text-lead font-medium">Ainda no foco?</p>
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
                <p className="text-body font-medium">O timer pausou às {timeHM(n.deadline)}. Esse intervalo foi foco?</p>
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
          max={Math.max(todayGoal, 1)}
          size={156}
          stroke={14}
          label={`${todayMinutes} de ${todayGoal} minutos de foco hoje`}
        >
          <span className="figure text-[2.25rem] leading-10">{hoursLabel(todayMinutes)}</span>
          <span className="text-small text-muted num">{todayGoal > 0 ? `de ${hoursLabel(todayGoal)}` : 'sem meta hoje'}</span>
          {state.todayInfo?.dayMet && todayGoal > 0 ? (
            <span className="mt-0.5 text-micro font-bold text-ink">metas cumpridas</span>
          ) : null}
        </RingMeter>

        <div className="min-w-0 flex-1">
          <p className="text-lead font-medium">{statusSentence(state)}</p>
          <label className="mt-3 inline-flex cursor-pointer items-center gap-2 text-small text-muted">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[var(--text)]"
              checked={pomodoro}
              onChange={(e) => {
                setPomodoro(e.target.checked);
                if (e.target.checked) {
                  unlockAlerts();
                  playChime('focus');
                  // a resposta ao pedido de permissão chega depois do clique
                  window.setTimeout(() => setPermission(notifyPermission()), 4000);
                }
              }}
            />
            Pomodoro (25 min de foco e 5 de pausa)
          </label>
          {pomodoro ? (
            <p className="mt-1 text-small text-muted">
              {permission === 'granted'
                ? 'No fim do foco e da pausa, toca um sino e chega uma notificação.'
                : permission === 'denied'
                  ? 'Notificações bloqueadas neste navegador: o aviso será o sino e o título da aba. Para liberar, use o cadeado ao lado do endereço.'
                  : 'No fim do foco e da pausa, toca um sino. Permita as notificações para receber o aviso também fora da aba.'}
            </p>
          ) : null}
        </div>
      </div>

      <ul className="mt-5 space-y-2" aria-label="Blocos de hoje">
        {season.blocks.map((cfg) => {
          const b = todayBlocks.find((x) => x.id === cfg.id);
          const minutes = b?.minutes ?? 0;
          const goal = b?.goal ?? 0;
          const done = goal > 0 && minutes >= goal;
          return (
            <li key={cfg.id} className="tile flex-wrap">
              <Sprite name={cfg.icon} base={12} scale={2} style={{ opacity: done || goal === 0 ? 1 : 0.7 }} />
              <div className="min-w-[10rem] flex-1">
                <p className="flex items-baseline justify-between gap-2 text-body">
                  <span className="font-bold">{cfg.name}</span>
                  <span className="text-small text-muted num">
                    {goal > 0 ? `${hoursLabel(minutes)} de ${hoursLabel(goal)}` : minutes > 0 ? hoursLabel(minutes) : 'livre hoje'}
                    {done ? ' ✓' : ''}
                  </span>
                </p>
                {goal > 0 ? (
                  <div className="mt-1.5">
                    <Meter value={Math.min(minutes, goal)} max={goal} size="sm" label={`${cfg.name}: ${minutes} de ${goal} min`} />
                  </div>
                ) : null}
                {cfg.id === 'estudo' ? (
                  <p className="mt-1 truncate text-small text-muted">
                    {next ? (
                      <>
                        Próxima aula: <span className="font-medium text-ink">{lessonName(next.title)}</span>{' '}
                        <span className="num">({minutesLabel(next.minutes)})</span>
                      </>
                    ) : (
                      'A fila de cursos acabou. O timer conta mesmo assim.'
                    )}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                className={`btn ml-auto ${done ? 'btn-outline' : 'btn-primary'}`}
                disabled={pending}
                onClick={() => startBlock(cfg.id)}
                aria-label={`Iniciar timer de ${cfg.name}`}
              >
                Iniciar
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="tile flex-wrap">
          <Sprite name="icone-martelo" base={12} scale={3} style={{ opacity: gymToday > 0 ? 1 : 0.45 }} />
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
          <Sprite name="icone-coracao" base={12} scale={3} style={{ opacity: cardioToday > 0 ? 1 : 0.45 }} />
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
