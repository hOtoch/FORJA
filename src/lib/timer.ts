// ESQUELETO DA FUNDAÇÃO. Transições puras do timer (data-model.md, "Timer em andamento").
// A frente A implementa os corpos; a frente B usa estas funções nas Server Actions.

import type { SeasonConfig, StudyRecord, TimerState, TimerView } from './types';

type TimerCfg = SeasonConfig['timer'];

const NI = () => {
  throw new Error('timer: ainda não implementado.');
};

/** Tempo creditado agora (o que passa de lastConfirmAt + presença fica pendente), limitado ao teto. */
export function timerCreditedMs(_t: TimerState, _now: Date, _cfg: TimerCfg): number {
  return NI();
}

/** runningSince != null && now > lastConfirmAt + presenceMinutes */
export function timerAwaitingPresence(_t: TimerState, _now: Date, _cfg: TimerCfg): boolean {
  return NI();
}

/** Tempo pendente de decisão (depois do limite de presença). */
export function timerPendingMs(_t: TimerState, _now: Date, _cfg: TimerCfg): number {
  return NI();
}

export function timerView(_t: TimerState, _now: Date, _cfg: TimerCfg): TimerView {
  return NI();
}

export function timerStart(_courseSlug: string, _pomodoro: boolean, _now: Date): TimerState {
  return NI();
}

export function timerPause(_t: TimerState, _now: Date, _cfg: TimerCfg): TimerState {
  return NI();
}

export function timerResume(_t: TimerState, _now: Date): TimerState {
  return NI();
}

export function timerConfirmPresence(_t: TimerState, _countGap: boolean, _now: Date, _cfg: TimerCfg): TimerState {
  return NI();
}

/**
 * Encerra a sessão: minutos = floor(creditado / 60s), limitado ao teto; dia = gameDay(startedAt).
 * Devolve null se os minutos forem 0.
 */
export function timerStop(
  _t: TimerState,
  _lessonIds: number[],
  _countGap: boolean,
  _now: Date,
  _config: SeasonConfig,
  _makeId: () => string,
): StudyRecord | null {
  return NI();
}
