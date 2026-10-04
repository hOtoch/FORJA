// Sequência de estudo e escudos (data-model.md, "Sequência e escudos").

import { seasonWeeks } from '@/lib/time';
import type { DayInfo, SeasonConfig } from '@/lib/types';
import { tallyWeek } from './weeks';

export interface StreakResult {
  /** Os mesmos dias, com `shieldUsed` preenchido. */
  days: DayInfo[];
  current: number;
  best: number;
  shields: number;
  /** O último dia fechado não-folga ficou sem a meta: se hoje também ficar, a sequência quebra. */
  yesterdayMissedUnprotected: boolean;
  /** Sequência ao fim de cada dia fechado e de hoje (se já cumpriu), em ordem. */
  timeline: { date: string; streak: number }[];
}

/**
 * Percorre os dias fechados (anteriores a hoje) em ordem:
 * - folga não mexe;
 * - meta cumprida soma 1;
 * - falha logo depois de outra falha (ignorando folgas) zera sem usar escudo;
 * - senão, com escudo, usa o escudo e a sequência se mantém; sem escudo, zera.
 * Ao fechar uma semana (não-final) com chefe derrotado, ganha 1 escudo (até o máximo).
 * Hoje só entra se já tiver cumprido a meta.
 */
export function computeStreak(input: DayInfo[], config: SeasonConfig, today: string): StreakResult {
  const days = input.map((d) => ({ ...d, shieldUsed: false }));
  const weekByEnd = new Map(seasonWeeks(config).map((w) => [w.end, w]));

  let current = 0;
  let best = 0;
  let shields = config.shields.initial;
  let prevFailed = false;
  const timeline: StreakResult['timeline'] = [];

  for (const d of days) {
    if (d.date >= today) break;
    if (!d.breakKind) {
      if (d.studyMet) {
        current += 1;
        prevFailed = false;
      } else {
        if (prevFailed) {
          current = 0;
        } else if (shields > 0) {
          shields -= 1;
          d.shieldUsed = true;
        } else {
          current = 0;
        }
        prevFailed = true;
      }
    }
    best = Math.max(best, current);
    timeline.push({ date: d.date, streak: current });

    const week = weekByEnd.get(d.date);
    if (week && !week.isFinal && tallyWeek(week.index, week.isFinal, days, config).bossDefeated) {
      shields = Math.min(config.shields.max, shields + 1);
    }
  }

  const todayDay = days.find((d) => d.date === today);
  if (todayDay && !todayDay.breakKind && todayDay.studyMet) {
    current += 1;
    best = Math.max(best, current);
    timeline.push({ date: today, streak: current });
  }

  return {
    days,
    current,
    best,
    shields,
    yesterdayMissedUnprotected: Boolean(todayDay) && prevFailed,
    timeline,
  };
}
