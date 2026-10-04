// Os 5 baús (spec FR-036): trancados desde o início, abrem quando a condição é cumprida.

import { addDays } from '@/lib/time';
import type { ChestState, DayInfo, GradeLetter, SeasonConfig, WeekInfo } from '@/lib/types';
import { computeGrade } from './grade';

export interface ChestInput {
  config: SeasonConfig;
  today: string;
  /** Dias com `shieldUsed` preenchido. */
  days: DayInfo[];
  weeks: WeekInfo[];
  /** Sequência ao fim de cada dia (ver computeStreak). */
  streakTimeline: { date: string; streak: number }[];
}

const isGood = (letter: GradeLetter | null) => letter === 'S' || letter === 'A';

export function computeChests({ config, today, days, weeks, streakTimeline }: ChestInput): ChestState[] {
  return config.chests.map((c): ChestState => {
    const base = { id: c.id, condition: c.condition, prize: c.prize };
    const locked: ChestState = { ...base, state: 'locked', openedOn: null };
    const opened = (on: string, prize = c.prize): ChestState => ({ ...base, prize, state: 'opened', openedOn: on });

    switch (c.kind) {
      case 'first-boss': {
        const w = weeks.find((x) => x.bossDefeated);
        // abre na data de fim da semana; se o chefe caiu antes do fim (resto da semana de folga), hoje
        return w ? opened(w.end <= today ? w.end : today) : locked;
      }
      case 'streak': {
        const hit = streakTimeline.find((p) => p.streak >= (c.threshold ?? Infinity));
        return hit ? opened(hit.date) : locked;
      }
      case 'study-hours': {
        let acc = 0;
        for (const d of days) {
          if (d.isFuture) break;
          acc += d.studyMinutes;
          if (acc >= (c.threshold ?? Infinity)) return opened(d.date);
        }
        return locked;
      }
      case 'midpoint-grade': {
        if (!c.date || today <= c.date) return locked;
        const g = computeGrade(days, config, addDays(c.date, 1), false);
        return isGood(g.letter) ? opened(c.date) : { ...base, state: 'failed', openedOn: null };
      }
      case 'final-grade': {
        if (!c.date || today <= c.date) return locked;
        const g = computeGrade(days, config, addDays(c.date, 1), true);
        if (g.letter && isGood(g.letter)) return opened(c.date, c.prizes?.[g.letter] ?? c.prize);
        return { ...base, state: 'failed', openedOn: null, note: 'Só o Fundo' };
      }
      default:
        return locked;
    }
  });
}
