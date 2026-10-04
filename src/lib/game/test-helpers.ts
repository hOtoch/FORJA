// Construtores de registros com datas fixas para os testes do motor (não é usado pelo app).

import { season1 } from '@/config/season1';
import { isSuperCardio } from '@/lib/cardio';
import { addDays, seasonWeeks } from '@/lib/time';
import type {
  BreakRecord,
  CardioModality,
  CardioRecord,
  ClientRecord,
  DepositRecord,
  ForjaRecord,
  GameState,
  GymRecord,
  SeasonConfig,
  StudyRecord,
  TimerState,
} from '@/lib/types';
import { computeGameState } from './index';

let seq = 0;
const nextId = () => `r${String(++seq).padStart(5, '0')}`;
const created = (day: string) => `${day}T15:00:00.000Z`;

export const FIRST_COURSE = 'desenvolvimento-assistido-por-ia';

export function study(
  day: string,
  minutes: number,
  opts: { lessonIds?: number[]; courseSlug?: string } = {},
): StudyRecord {
  return {
    id: nextId(),
    seasonId: 's1',
    kind: 'study',
    day,
    createdAt: created(day),
    data: {
      courseSlug: opts.courseSlug ?? FIRST_COURSE,
      minutes,
      source: 'manual',
      lessonIds: opts.lessonIds ?? [],
    },
  };
}

export function gym(day: string): GymRecord {
  return { id: nextId(), seasonId: 's1', kind: 'gym', day, createdAt: created(day), data: {} };
}

export function cardio(day: string, modality: CardioModality = 'esteira', minutes = 30): CardioRecord {
  return {
    id: nextId(),
    seasonId: 's1',
    kind: 'cardio',
    day,
    createdAt: created(day),
    data: { modality, minutes, isSuper: isSuperCardio(modality, minutes, season1) },
  };
}

/** Supercardio: esteira de 60 min. */
export const superCardio = (day: string) => cardio(day, 'esteira', 60);

export function reserveBreak(day: string): BreakRecord {
  return { id: nextId(), seasonId: 's1', kind: 'break', day, createdAt: created(day), data: {} };
}

export function deposit(day: string, weekIndex: number, amountCents: number): DepositRecord {
  return { id: nextId(), seasonId: 's1', kind: 'deposit', day, createdAt: created(day), data: { weekIndex, amountCents } };
}

export function client(day: string, contractCents: number): ClientRecord {
  return {
    id: nextId(),
    seasonId: 's1',
    kind: 'client',
    day,
    createdAt: created(day),
    data: { contractCents, bonusCents: Math.round((contractCents * 5) / 100) },
  };
}

/** Instante em Brasília: at('2026-10-12') = 12:00 do dia 12/10. */
export const at = (day: string, time = '12:00') => new Date(`${day}T${time}:00-03:00`);

/** Estudo de `minutes` em cada dia de `from` até `to` (inclusive). */
export function studyRange(from: string, to: string, minutes = 60): StudyRecord[] {
  const out: StudyRecord[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(study(d, minutes));
  return out;
}

/** Uma semana cheia vencida: estudo em todos os dias não-folga, 4 treinos e 5 cardios (1 super). */
export function perfectWeek(weekIndex: number, config: SeasonConfig = season1, studyMinutes = 60): ForjaRecord[] {
  const w = seasonWeeks(config)[weekIndex - 1];
  const planned = new Set(config.plannedBreaks);
  const out: ForjaRecord[] = [];
  for (const d of w.days) if (!planned.has(d)) out.push(study(d, studyMinutes));
  const gyms = w.isFinal ? config.goals.finalWeek.gym : config.goals.gymPerWeek;
  const cardios = w.isFinal ? config.goals.finalWeek.cardio : config.goals.cardioPerWeek;
  for (let i = 0; i < gyms; i++) out.push(gym(w.days[i % w.days.length]));
  for (let i = 0; i < cardios; i++) {
    const day = w.days[i % w.days.length];
    out.push(i === 0 && !w.isFinal ? superCardio(day) : cardio(day));
  }
  return out;
}

/** A temporada perfeita: todas as 12 semanas vencidas, sem folga de reserva. */
export function perfectSeason(studyMinutes = 60, config: SeasonConfig = season1): ForjaRecord[] {
  return seasonWeeks(config).flatMap((w) => perfectWeek(w.index, config, studyMinutes));
}

export function game(
  records: ForjaRecord[],
  now: Date,
  config: SeasonConfig = season1,
  timer: TimerState | null = null,
): GameState {
  return computeGameState(records, timer, config, now);
}

export const dayOf = (g: GameState, date: string) => {
  const d = g.days.find((x) => x.date === date);
  if (!d) throw new Error(`dia ${date} fora da temporada`);
  return d;
};
