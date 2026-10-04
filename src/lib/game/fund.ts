// Fundo Réveillon: quanto foi ganho, depositado e o que está pendente (data-model.md, "Fundo").

import type { DayInfo, ForjaRecord, GameState, SeasonConfig, WeekInfo } from '@/lib/types';
import { inSeason } from './days';
import { tallyWeek } from './weeks';

export function computeFund(weeks: WeekInfo[], records: ForjaRecord[], config: SeasonConfig): GameState['fund'] {
  let depositedCents = 0;
  let clientBonusCents = 0;
  for (const r of records) {
    if (r.kind === 'deposit') depositedCents += r.data.amountCents;
    if (r.kind === 'client' && inSeason(r.day, config)) clientBonusCents += r.data.bonusCents;
  }
  return {
    earnedCents: weeks.reduce((s, w) => s + w.fundCents, 0),
    depositedCents,
    perfectCents: config.fund.perfectCents,
    clientBonusCents,
    pending: weeks
      .filter((w) => w.isClosed && w.depositedCents === null && w.fundCents > 0)
      .map((w) => ({ weekIndex: w.index, amountCents: w.fundCents })),
  };
}

/**
 * Quanto cada dia rendeu, de forma que a soma dos dias de uma semana dê o `fundCents` dela:
 * dia cumprido (sem folga nem escudo), treinos e cardios na ordem em que aconteceram até a meta,
 * bônus de clientes do dia e o chefe no último dia da semana.
 */
export function dayFundCents(
  days: DayInfo[],
  weeks: WeekInfo[],
  records: ForjaRecord[],
  config: SeasonConfig,
): Map<string, number> {
  const f = config.fund;
  const bonusByDay = new Map<string, number>();
  for (const r of records) {
    if (r.kind === 'client') bonusByDay.set(r.day, (bonusByDay.get(r.day) ?? 0) + r.data.bonusCents);
  }

  const out = new Map<string, number>();
  for (const w of weeks) {
    const t = tallyWeek(w.index, w.isFinal, days, config);
    let gymLeft = t.gymTarget;
    let cardioLeft = Math.min(t.cardioEffective, t.cardioTarget);
    for (const d of days) {
      if (d.weekIndex !== w.index) continue;
      let cents = 0;
      if (!d.breakKind && d.studyMet && !d.shieldUsed) cents += f.studyDayCents;
      const g = Math.min(d.gym, gymLeft);
      gymLeft -= g;
      cents += g * f.gymCents;
      const c = Math.min(d.cardio, cardioLeft);
      cardioLeft -= c;
      cents += c * f.cardioCents;
      cents += bonusByDay.get(d.date) ?? 0;
      if (d.date === w.end && w.bossDefeated) cents += w.isFinal ? f.finalBossCents : f.bossCents;
      out.set(d.date, cents);
    }
  }
  return out;
}
