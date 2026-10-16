// As 12 semanas: metas, chefe e quanto cada uma rende para o Fundo.

import { seasonWeeks } from '@/lib/time';
import type { DayInfo, ForjaRecord, SeasonConfig, WeekInfo } from '@/lib/types';
import { redeemStudy, studyCountsForWeek } from './days';
import { rescueEvent } from './rescue';

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
  /**
   * Dias não-folga que contam como cumpridos: com a meta (dia salvo por escudo não conta) ou
   * compensados por minutos a mais em outros dias da semana.
   */
  studyDaysMet: number;
  studyDaysRedeemed: number;
  studyMinutesOwed: number;
  studySurplusMinutes: number;
  /** Dias salvos por escudo e não compensados depois. */
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
  let studyDaysRedeemed = 0;
  let shieldDays = 0;
  let gym = 0;
  let cardio = 0;
  let superCardio = 0;
  const weekDays = days.filter((d) => d.weekIndex === weekIndex);
  for (const d of weekDays) {
    if (!d.breakKind) {
      studyDaysRequired += 1;
      if (studyCountsForWeek(d)) studyDaysMet += 1;
      if (d.studyRedeemed) studyDaysRedeemed += 1;
    }
    if (d.shieldUsed && !d.studyRedeemed) shieldDays += 1;
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
  const { owedMinutes, surplusMinutes } = redeemStudy(weekDays, config);
  return {
    ...targets,
    studyDaysRequired,
    studyDaysMet,
    studyDaysRedeemed,
    studyMinutesOwed: owedMinutes,
    studySurplusMinutes: surplusMinutes,
    shieldDays,
    gym,
    cardio,
    hasSuper,
    cardioEffective,
    bossDefeated,
  };
}

/** Quanto a semana rende: dias cumpridos, treinos e cardios até a meta, chefe e bônus de clientes. */
export function weekFundCents(
  tally: WeekTally,
  isFinal: boolean,
  clientBonusCents: number,
  config: SeasonConfig,
  bossDefeated = tally.bossDefeated,
): number {
  const f = config.fund;
  return (
    f.studyDayCents * tally.studyDaysMet +
    f.gymCents * Math.min(tally.gym, tally.gymTarget) +
    f.cardioCents * Math.min(tally.cardioEffective, tally.cardioTarget) +
    (bossDefeated ? (isFinal ? f.finalBossCents : f.bossCents) : 0) +
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
    // chefe que escapou numa semana fechada (não a final) ganha o evento de resgate
    const rescue =
      !t.bossDefeated && !w.isFinal && today > w.end ? rescueEvent(w.index, days, records, config, today) : null;
    const bossRescued = rescue?.state === 'done';
    const bossDefeated = t.bossDefeated || bossRescued;
    return {
      index: w.index,
      start: w.start,
      end: w.end,
      isFinal: w.isFinal,
      isClosed: today > w.end,
      isCurrent: today >= w.start && today <= w.end,
      studyDaysRequired: t.studyDaysRequired,
      studyDaysMet: t.studyDaysMet,
      studyDaysRedeemed: t.studyDaysRedeemed,
      studyMinutesOwed: t.studyMinutesOwed,
      studySurplusMinutes: t.studySurplusMinutes,
      shieldDays: t.shieldDays,
      gym: t.gym,
      gymTarget: t.gymTarget,
      cardio: t.cardio,
      cardioTarget: t.cardioTarget,
      hasSuper: t.hasSuper,
      superRequired: t.superRequired,
      bossDefeated,
      bossRescued,
      rescue,
      fundCents: weekFundCents(t, w.isFinal, clientBonusBetween(records, w.start, w.end), config, bossDefeated),
      depositedCents: depositedForWeek(records, w.index),
    };
  });
}
