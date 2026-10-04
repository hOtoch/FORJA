// Os 80 dias da temporada: estudo, treino, cardio, folga e calor (data-model.md, "Calor do dia").

import { isSuperCardio } from '@/lib/cardio';
import { daysBetween, seasonDays, seasonWeeks, weekdayOf } from '@/lib/time';
import type { DayInfo, ForjaRecord, Heat, SeasonConfig } from '@/lib/types';

export type Phase = 'before' | 'active' | 'after';

export function phaseOf(today: string, config: Pick<SeasonConfig, 'start' | 'end'>): Phase {
  if (today < config.start) return 'before';
  if (today > config.end) return 'after';
  return 'active';
}

/** 1..80 durante a temporada; null fora dela. */
export function dayIndexOf(today: string, config: Pick<SeasonConfig, 'start' | 'end'>): number | null {
  return phaseOf(today, config) === 'active' ? daysBetween(config.start, today) + 1 : null;
}

export function inSeason(day: string, config: Pick<SeasonConfig, 'start' | 'end'>): boolean {
  return day >= config.start && day <= config.end;
}

export interface DayTotals {
  studyMinutes: number;
  gym: number;
  cardio: number;
  superCardio: number;
}

const emptyTotals = (): DayTotals => ({ studyMinutes: 0, gym: 0, cardio: 0, superCardio: 0 });

/** Soma estudo, treinos e cardios por dia do jogo (dentro ou fora da temporada). */
export function totalsByDay(records: ForjaRecord[], config: SeasonConfig): Map<string, DayTotals> {
  const map = new Map<string, DayTotals>();
  const get = (day: string) => {
    let t = map.get(day);
    if (!t) {
      t = emptyTotals();
      map.set(day, t);
    }
    return t;
  };
  for (const r of records) {
    switch (r.kind) {
      case 'study':
        get(r.day).studyMinutes += Math.max(0, r.data.minutes);
        break;
      case 'gym':
        get(r.day).gym += 1;
        break;
      case 'cardio': {
        const t = get(r.day);
        t.cardio += 1;
        // supercardio pela regra (modalidade e minutos), não pelo que foi gravado
        if (isSuperCardio(r.data.modality, r.data.minutes, config)) t.superCardio += 1;
        break;
      }
      default:
        break;
    }
  }
  return map;
}

/** Dias de folga de reserva (BreakRecord) dentro da temporada que não são folga planejada. */
export function reserveBreakDays(records: ForjaRecord[], config: SeasonConfig): Set<string> {
  const planned = new Set(config.plannedBreaks);
  const out = new Set<string>();
  for (const r of records) {
    if (r.kind === 'break' && inSeason(r.day, config) && !planned.has(r.day)) out.add(r.day);
  }
  return out;
}

/**
 * Calor: null no futuro e em hoje/folga sem estudo; 0 = passou sem estudo; 1 = estudou menos que a
 * meta; 2 = cumpriu; 3 = cumpriu + 1 ponto; 4 = cumpriu + 2 ou mais pontos.
 * Pontos: estudo >= 120 min (o teto diário de XP), pelo menos 1 treino, pelo menos 1 cardio.
 */
export function dayHeat(
  d: Pick<DayInfo, 'isFuture' | 'isToday' | 'breakKind' | 'studyMinutes' | 'gym' | 'cardio'>,
  config: SeasonConfig,
): Heat | null {
  if (d.isFuture) return null;
  if (d.studyMinutes <= 0) return d.isToday || d.breakKind ? null : 0;
  if (d.studyMinutes < config.goals.studyMinutes) return 1;
  const points =
    (d.studyMinutes >= config.xp.studyDailyCap ? 1 : 0) + (d.gym > 0 ? 1 : 0) + (d.cardio > 0 ? 1 : 0);
  if (points >= 2) return 4;
  return points === 1 ? 3 : 2;
}

/**
 * DayInfo dos 80 dias. `shieldUsed`, `xp` e `fundCents` saem zerados aqui e são preenchidos
 * depois pelo motor (streak, xp e fund).
 */
export function buildDays(records: ForjaRecord[], config: SeasonConfig, today: string): DayInfo[] {
  const totals = totalsByDay(records, config);
  const planned = new Set(config.plannedBreaks);
  const reserve = reserveBreakDays(records, config);
  const weekOf = new Map<string, number>();
  for (const w of seasonWeeks(config)) for (const d of w.days) weekOf.set(d, w.index);

  return seasonDays(config).map((date, i) => {
    const t = totals.get(date) ?? emptyTotals();
    const breakKind: DayInfo['breakKind'] = planned.has(date) ? 'planned' : reserve.has(date) ? 'reserve' : null;
    const base = {
      date,
      index: i + 1,
      weekIndex: weekOf.get(date) ?? 0,
      weekday: weekdayOf(date),
      isFuture: date > today,
      isToday: date === today,
      breakKind,
      studyMinutes: t.studyMinutes,
      studyMet: t.studyMinutes >= config.goals.studyMinutes,
      shieldUsed: false,
      gym: t.gym,
      cardio: t.cardio,
      superCardio: t.superCardio,
      xp: 0,
      fundCents: 0,
    };
    return { ...base, heat: dayHeat(base, config) };
  });
}

/** Dia fechado = anterior a hoje. */
export const isClosedDay = (day: Pick<DayInfo, 'date'>, today: string) => day.date < today;
