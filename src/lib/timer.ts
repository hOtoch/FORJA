// Transições puras do timer (data-model.md, "Timer em andamento").
// A frente B usa estas funções nas Server Actions; nada aqui toca em banco ou relógio.

import { gameDay } from './time';
import type { SeasonConfig, StudyRecord, TimerState, TimerView } from './types';

type TimerCfg = SeasonConfig['timer'];

const MINUTE = 60_000;

const ms = (iso: string) => Date.parse(iso);
const presenceMs = (cfg: TimerCfg) => cfg.presenceMinutes * MINUTE;
const capMs = (cfg: TimerCfg) => cfg.capMinutes * MINUTE;

/** Instante até onde a presença atual cobre: lastConfirmAt + presença. */
function presenceLimit(t: TimerState, cfg: TimerCfg): number {
  return ms(t.lastConfirmAt) + presenceMs(cfg);
}

/** Tempo creditado agora (o que passa de lastConfirmAt + presença fica pendente), limitado ao teto. */
export function timerCreditedMs(t: TimerState, now: Date, cfg: TimerCfg): number {
  let credited = t.accumulatedMs;
  if (t.runningSince) {
    const until = Math.min(now.getTime(), presenceLimit(t, cfg));
    credited += Math.max(0, until - ms(t.runningSince));
  }
  return Math.max(0, Math.min(credited, capMs(cfg)));
}

/** runningSince != null && now > lastConfirmAt + presenceMinutes */
export function timerAwaitingPresence(t: TimerState, now: Date, cfg: TimerCfg): boolean {
  return t.runningSince != null && now.getTime() > presenceLimit(t, cfg);
}

/**
 * Tempo pendente de decisão (depois do limite de presença). É o que "Contar N min" somaria,
 * já respeitando o teto da sessão.
 */
export function timerPendingMs(t: TimerState, now: Date, cfg: TimerCfg): number {
  if (!t.runningSince || !timerAwaitingPresence(t, now, cfg)) return 0;
  const from = Math.max(ms(t.runningSince), presenceLimit(t, cfg));
  const raw = Math.max(0, now.getTime() - from);
  const room = Math.max(0, capMs(cfg) - timerCreditedMs(t, now, cfg));
  return Math.min(raw, room);
}

export function timerView(t: TimerState, now: Date, cfg: TimerCfg): TimerView {
  const creditedMs = timerCreditedMs(t, now, cfg);
  return {
    ...t,
    creditedMs,
    awaitingPresence: timerAwaitingPresence(t, now, cfg),
    pendingMs: timerPendingMs(t, now, cfg),
    capped: creditedMs >= capMs(cfg),
  };
}

export function timerStart(courseSlug: string, pomodoro: boolean, now: Date): TimerState {
  const iso = now.toISOString();
  return {
    courseSlug,
    startedAt: iso,
    accumulatedMs: 0,
    runningSince: iso,
    lastConfirmAt: iso,
    pomodoro,
  };
}

/** Credita o trecho em andamento (com o limite de presença e o teto) e pausa. */
export function timerPause(t: TimerState, now: Date, cfg: TimerCfg): TimerState {
  if (!t.runningSince) return t;
  return { ...t, accumulatedMs: timerCreditedMs(t, now, cfg), runningSince: null };
}

/** Retoma um timer pausado. Se já estiver correndo, não muda nada (não perde o trecho atual). */
export function timerResume(t: TimerState, now: Date): TimerState {
  if (t.runningSince) return t;
  const iso = now.toISOString();
  return { ...t, runningSince: iso, lastConfirmAt: iso };
}

/**
 * Responde ao "Ainda estudando?".
 * - Aguardando presença: `countGap` credita tudo desde `runningSince`; senão, só até o limite de
 *   presença. Depois, `runningSince = lastConfirmAt = now`.
 * - Não aguardando: só renova `lastConfirmAt`.
 */
export function timerConfirmPresence(t: TimerState, countGap: boolean, now: Date, cfg: TimerCfg): TimerState {
  const iso = now.toISOString();
  if (!t.runningSince || !timerAwaitingPresence(t, now, cfg)) {
    return { ...t, lastConfirmAt: iso };
  }
  const accumulatedMs = countGap
    ? Math.min(capMs(cfg), t.accumulatedMs + Math.max(0, now.getTime() - ms(t.runningSince)))
    : timerCreditedMs(t, now, cfg);
  return { ...t, accumulatedMs, runningSince: iso, lastConfirmAt: iso };
}

/**
 * Encerra a sessão: minutos = floor(creditado / 60s), limitado ao teto; dia = gameDay(startedAt).
 * Devolve null se os minutos forem 0.
 */
export function timerStop(
  t: TimerState,
  lessonIds: number[],
  countGap: boolean,
  now: Date,
  config: SeasonConfig,
  makeId: () => string,
): StudyRecord | null {
  const cfg = config.timer;
  const settled = countGap && timerAwaitingPresence(t, now, cfg) ? timerConfirmPresence(t, true, now, cfg) : t;
  const minutes = Math.min(Math.floor(timerCreditedMs(settled, now, cfg) / MINUTE), cfg.capMinutes);
  if (minutes <= 0) return null;
  const iso = now.toISOString();
  return {
    id: makeId(),
    seasonId: config.id,
    kind: 'study',
    day: gameDay(t.startedAt, config.timeZone, config.dayStartHour),
    createdAt: iso,
    data: {
      courseSlug: t.courseSlug,
      minutes,
      source: 'timer',
      startedAt: t.startedAt,
      endedAt: iso,
      lessonIds: [...lessonIds],
    },
  };
}
