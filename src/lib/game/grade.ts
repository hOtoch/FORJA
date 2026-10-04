// Nota da temporada: prevista (sobre o que já fechou) e final (data-model.md, "Nota").

import { seasonWeeks } from '@/lib/time';
import type { DayInfo, GameState, GradeLetter, SeasonConfig } from '@/lib/types';
import { tallyWeek } from './weeks';

const EPS = 1e-9;

export function letterFor(pct: number, config: SeasonConfig): GradeLetter {
  if (pct + EPS >= config.grade.S) return 'S';
  if (pct + EPS >= config.grade.A) return 'A';
  if (pct + EPS >= config.grade.B) return 'B';
  return 'C';
}

/**
 * Nota sobre os dias e semanas que já fecharam antes de `asOf` (o "hoje" da conta).
 * - estudo = dias não-folga cumpridos (dia de escudo não conta) ÷ dias não-folga fechados;
 * - academia = Σ min(treinos, meta) ÷ Σ metas das semanas fechadas;
 * - cardio = Σ min(cardioEfetivo, meta) ÷ Σ metas das semanas fechadas.
 * Hábito sem nada fechado fica fora da média; sem nada fechado, `letter` é null.
 * Com a temporada inteira fechada, os denominadores são 80 − folgas, 46 e 57.
 */
export function computeGrade(days: DayInfo[], config: SeasonConfig, asOf: string, isFinal: boolean): GameState['grade'] {
  let studyDays = 0;
  let studyMet = 0;
  for (const d of days) {
    if (d.date >= asOf || d.breakKind) continue;
    studyDays += 1;
    if (d.studyMet && !d.shieldUsed) studyMet += 1;
  }

  let gymDone = 0;
  let gymGoal = 0;
  let cardioDone = 0;
  let cardioGoal = 0;
  for (const w of seasonWeeks(config)) {
    if (w.end >= asOf) continue;
    const t = tallyWeek(w.index, w.isFinal, days, config);
    gymDone += Math.min(t.gym, t.gymTarget);
    gymGoal += t.gymTarget;
    cardioDone += Math.min(t.cardioEffective, t.cardioTarget);
    cardioGoal += t.cardioTarget;
  }

  const parts: number[] = [];
  const pct = (done: number, goal: number) => {
    if (goal <= 0) return 0;
    const p = (done / goal) * 100;
    parts.push(p);
    return p;
  };
  const studyPct = pct(studyMet, studyDays);
  const gymPct = pct(gymDone, gymGoal);
  const cardioPct = pct(cardioDone, cardioGoal);
  const totalPct = parts.length ? parts.reduce((a, b) => a + b, 0) / parts.length : 0;

  return {
    studyPct,
    gymPct,
    cardioPct,
    totalPct,
    letter: parts.length ? letterFor(totalPct, config) : null,
    isFinal,
  };
}
