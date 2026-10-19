// As semanas: metas, contadores, chefe e quanto cada uma rende para o Fundo.

import { seasonWeeks } from '@/lib/time';
import type { DayInfo, ForjaRecord, SeasonConfig, WeekCounter, WeekInfo } from '@/lib/types';
import { dayCountsForWeek, redeemWeek } from './days';
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
  daysRequired: number;
  /**
   * Dias não-folga que contam como cumpridos: com a meta (dia salvo por escudo não conta) ou
   * compensados por minutos a mais em outros dias da semana.
   */
  daysMet: number;
  daysRedeemed: number;
  minutesOwed: number;
  owedByBlock: Record<string, number>;
  surplusMinutes: number;
  /** Contadores da semana; todos precisam bater a meta para o chefe cair. */
  counters: WeekCounter[];
  /** Dias salvos por escudo e não compensados depois. */
  shieldDays: number;
  gym: number;
  cardio: number;
  hasSuper: boolean;
  /** Sem supercardio numa semana que o exige, só contam até `cardioMaxWithoutSuper` cardios. */
  cardioEffective: number;
  bossDefeated: boolean;
}

/**
 * Contadores da semana contra a meta. Semana parcial (a primeira ou a final) pede a parte
 * proporcional aos dias que tem, arredondada para cima.
 */
export function weekCounters(weekDays: DayInfo[], config: SeasonConfig): WeekCounter[] {
  const share = Math.min(1, weekDays.length / 7);
  return config.counters.map((c) => ({
    id: c.id,
    count: weekDays.reduce((s, d) => s + (d.counts[c.id] ?? 0), 0),
    target: Math.ceil(c.weekTarget * share),
  }));
}

/** Conta os dias da semana `weekIndex` e decide o chefe. */
export function tallyWeek(weekIndex: number, isFinal: boolean, days: DayInfo[], config: SeasonConfig): WeekTally {
  const targets = weekTargets(isFinal, config);
  let daysRequired = 0;
  let daysMet = 0;
  let daysRedeemed = 0;
  let shieldDays = 0;
  let gym = 0;
  let cardio = 0;
  let superCardio = 0;
  const weekDays = days.filter((d) => d.weekIndex === weekIndex);
  for (const d of weekDays) {
    if (!d.breakKind) {
      daysRequired += 1;
      if (dayCountsForWeek(d)) daysMet += 1;
      if (d.dayRedeemed) daysRedeemed += 1;
    }
    if (d.shieldUsed && !d.dayRedeemed) shieldDays += 1;
    gym += d.gym;
    cardio += d.cardio;
    superCardio += d.superCardio;
  }
  const hasSuper = superCardio > 0;
  const superOk = hasSuper || !targets.superRequired;
  const cardioEffective = superOk ? cardio : Math.min(cardio, config.goals.cardioMaxWithoutSuper);
  const counters = weekCounters(weekDays, config);
  const bossDefeated =
    daysMet === daysRequired &&
    shieldDays === 0 &&
    gym >= targets.gymTarget &&
    cardioEffective >= targets.cardioTarget &&
    superOk &&
    counters.every((c) => c.count >= c.target);
  const { owedByBlock, owedMinutes, surplusMinutes } = redeemWeek(weekDays);
  return {
    ...targets,
    daysRequired,
    daysMet,
    daysRedeemed,
    minutesOwed: owedMinutes,
    owedByBlock,
    surplusMinutes,
    counters,
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
    f.studyDayCents * tally.daysMet +
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
      daysRequired: t.daysRequired,
      daysMet: t.daysMet,
      daysRedeemed: t.daysRedeemed,
      minutesOwed: t.minutesOwed,
      owedByBlock: t.owedByBlock,
      counters: t.counters,
      surplusMinutes: t.surplusMinutes,
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
