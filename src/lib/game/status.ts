// Status do dia para o painel e para o lembrete das 21h (/api/status).

import { daysBetween, weekdayOf } from '@/lib/time';
import type { DayInfo, GameState, SeasonConfig, WeekInfo } from '@/lib/types';
import type { Phase } from './days';

export interface StatusInput {
  config: SeasonConfig;
  phase: Phase;
  today: string;
  todayInfo: DayInfo | null;
  currentWeek: WeekInfo | null;
  yesterdayMissedUnprotected: boolean;
}

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

/**
 * - `studyDone`: hoje cumprido, hoje é folga ou fora da temporada;
 * - `weekAtRisk`: treinos que faltam >= dias restantes da semana (contando hoje), ou supercardio
 *   exigido e ainda não feito a partir de sábado;
 * - `reasons`: as frases que explicam cada ponto em aberto.
 */
export function computeStatus(input: StatusInput): GameState['status'] {
  const { config, phase, today, todayInfo, currentWeek } = input;
  const reasons: string[] = [];

  const studyDone = phase !== 'active' || !todayInfo || todayInfo.studyMet || todayInfo.breakKind !== null;
  if (!studyDone && todayInfo) {
    const left = config.goals.studyMinutes - todayInfo.studyMinutes;
    reasons.push(`${plural(left, 'Falta', 'Faltam')} ${left} min de estudo hoje.`);
    if (input.yesterdayMissedUnprotected) {
      reasons.push('Ontem ficou sem estudo. Se hoje também ficar, a sequência quebra.');
    }
  }

  let weekAtRisk = false;
  if (phase === 'active' && currentWeek) {
    const gymLeft = Math.max(0, currentWeek.gymTarget - currentWeek.gym);
    const daysLeft = daysBetween(today, currentWeek.end) + 1;
    if (gymLeft > 0 && gymLeft >= daysLeft) {
      weekAtRisk = true;
      reasons.push(
        `${plural(gymLeft, 'Falta', 'Faltam')} ${gymLeft} ${plural(gymLeft, 'treino', 'treinos')} e ` +
          `${plural(daysLeft, 'resta', 'restam')} ${daysLeft} ${plural(daysLeft, 'dia', 'dias')} na semana.`,
      );
    }
    if (currentWeek.superRequired && !currentWeek.hasSuper && weekdayOf(today) >= 6) {
      weekAtRisk = true;
      reasons.push('Falta o supercardio da semana.');
    }
  }

  return { studyDone, weekAtRisk, reasons };
}
