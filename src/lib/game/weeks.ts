// As 12 semanas: metas, chefe e quanto cada uma rende para o Fundo.

import { seasonWeeks } from '@/lib/time';
import type { DayInfo, ForjaRecord, SeasonConfig, WeekInfo } from '@/lib/types';

export interface WeekTargets {
  gymTarget: number;
  cardioTarget: number;
  superRequired: boolean;
}

export function weekTargets(isFinal: boolean, config: SeasonConfig): WeekTargets {
  const g = config.goals;
  return isFinal
    ? { gymTarget: g.finalWeek.gym, cardioTarget: g.finalWeek.cardio, superRequired: g.finalWeek.requireSuper }
    : { gymTarget: g.gymPerWeek, cardioTarget: g.cardioPerWeek, superRequired: true };
}

export interface WeekTally extends WeekTargets {
  studyDaysRequired: number;
  /** Dias não-folga com a meta cumprida (dia salvo por escudo nunca está cumprido). */
  studyDaysMet: number;
  shieldDays: number;
  gym: number;
  cardio: number;
  hasSuper: boolean;
  /** Sem supercardio numa semana que o exige, só contam até `cardioMaxWithoutSuper` cardios. */
  cardioEffective: number;
  bossDefeated: boolean;
}

/** Conta os dias da semana `weekIndex` e decide o chefe. */
export function tallyWeek(weekIndex: number, isFinal: boolean, days: DayInfo[], config: SeasonConfig): WeekTally {
  const targets = weekTargets(isFinal, config);
  let studyDaysRequired = 0;
  let studyDaysMet = 0;
  let shieldDays = 0;
  let gym = 0;
  let cardio = 0;
  let superCardio = 0;
  for (const d of days) {
    if (d.weekIndex !== weekIndex) continue;
    if (!d.breakKind) {
      studyDaysRequired += 1;
      if (d.studyMet && !d.shieldUsed) studyDaysMet += 1;
    }
    if (d.shieldUsed) shieldDays += 1;
    gym += d.gym;
    cardio += d.cardio;
    superCardio += d.superCardio;
  }
  const hasSuper = superCardio > 0;
  const superOk = hasSuper || !targets.superRequired;
  const cardioEffective = superOk ? cardio : Math.min(cardio, config.goals.cardioMaxWithoutSuper);
  const bossDefeated =
    studyDaysMet === studyDaysRequired &&
    shieldDays === 0 &&
    gym >= targets.gymTarget &&
    cardioEffective >= targets.cardioTarget &&
    superOk;
  return {
    ...targets,
    studyDaysRequired,
    studyDaysMet,
    shieldDays,
    gym,
    cardio,
    hasSuper,
    cardioEffective,
    bossDefeated,
  };
}

/** Quanto a semana rende: dias cumpridos, treinos e cardios até a meta, chefe e bônus de clientes. */
export function weekFundCents(tally: WeekTally, isFinal: boolean, clientBonusCents: number, config: SeasonConfig): number {
  const f = config.fund;
  return (
    f.studyDayCents * tally.studyDaysMet +
    f.gymCents * Math.min(tally.gym, tally.gymTarget) +
    f.cardioCents * Math.min(tally.cardioEffective, tally.cardioTarget) +
    (tally.bossDefeated ? (isFinal ? f.finalBossCents : f.bossCents) : 0) +
    clientBonusCents
  );
}

/** Bônus de clientes (ClientRecord.bonusCents) com `day` entre `start` e `end`. */
export function clientBonusBetween(records: ForjaRecord[], start: string, end: string): number {
  let sum = 0;
  for (const r of records) if (r.kind === 'client' && r.day >= start && r.day <= end) sum += r.data.bonusCents;
  return sum;
}

/** Soma dos depósitos confirmados da semana, ou null se não houver. */
export function depositedForWeek(records: ForjaRecord[], weekIndex: number): number | null {
  let found = false;
  let sum = 0;
  for (const r of records) {
    if (r.kind === 'deposit' && r.data.weekIndex === weekIndex) {
      found = true;
      sum += r.data.amountCents;
    }
  }
  return found ? sum : null;
}

/** WeekInfo das 12 semanas. `days` precisa já ter `shieldUsed` preenchido. */
export function buildWeeks(days: DayInfo[], records: ForjaRecord[], config: SeasonConfig, today: string): WeekInfo[] {
  return seasonWeeks(config).map((w) => {
    const t = tallyWeek(w.index, w.isFinal, days, config);
    return {
      index: w.index,
      start: w.start,
      end: w.end,
      isFinal: w.isFinal,
      isClosed: today > w.end,
      isCurrent: today >= w.start && today <= w.end,
      studyDaysRequired: t.studyDaysRequired,
      studyDaysMet: t.studyDaysMet,
      shieldDays: t.shieldDays,
      gym: t.gym,
      gymTarget: t.gymTarget,
      cardio: t.cardio,
      cardioTarget: t.cardioTarget,
      hasSuper: t.hasSuper,
      superRequired: t.superRequired,
      bossDefeated: t.bossDefeated,
      fundCents: weekFundCents(t, w.isFinal, clientBonusBetween(records, w.start, w.end), config),
      depositedCents: depositedForWeek(records, w.index),
    };
  });
}
