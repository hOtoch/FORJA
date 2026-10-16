// Evento de resgate: o chefe que escapou numa semana ganha uma segunda chance num dia sorteado da
// semana seguinte. Cumprindo o desafio daquele dia, o chefe conta como derrotado (XP e Fundo; o
// escudo, não, porque ele só vem com a semana vencida nas metas).

import { seasonWeeks } from '@/lib/time';
import type { DayInfo, ForjaRecord, RescueChallengeConfig, RescueEvent, SeasonConfig } from '@/lib/types';

/** FNV-1a de 32 bits: o "sorteio" sai sempre igual para a mesma temporada e semana. */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Dia e desafio do resgate do chefe da semana `weekIndex`; null se não houver semana seguinte. */
export function rescueDraw(
  weekIndex: number,
  config: SeasonConfig,
): { day: string; challenge: RescueChallengeConfig } | null {
  const next = seasonWeeks(config).find((w) => w.index === weekIndex + 1);
  const challenges = config.rescue.challenges;
  if (!next || challenges.length === 0) return null;
  const planned = new Set(config.plannedBreaks);
  const open = next.days.filter((d) => !planned.has(d));
  const pool = open.length ? open : next.days;
  return {
    day: pool[hash(`${config.id}:resgate-dia:${weekIndex}`) % pool.length],
    challenge: challenges[hash(`${config.id}:resgate-desafio:${weekIndex}`) % challenges.length],
  };
}

function progressOf(
  c: RescueChallengeConfig,
  d: DayInfo | undefined,
  manualDone: boolean,
): { progress: number; target: number } {
  switch (c.kind) {
    case 'study-minutes':
      return { progress: d?.studyMinutes ?? 0, target: c.target ?? 0 };
    case 'cardio-minutes':
      return { progress: d?.cardioMinutes ?? 0, target: c.target ?? 0 };
    case 'gym-cardio':
      return { progress: (d && d.gym > 0 ? 1 : 0) + (d && d.cardio > 0 ? 1 : 0), target: 2 };
    case 'manual':
      return { progress: manualDone ? 1 : 0, target: 1 };
  }
}

/** O evento de resgate do chefe da semana `weekIndex`, que escapou. */
export function rescueEvent(
  weekIndex: number,
  days: DayInfo[],
  records: ForjaRecord[],
  config: SeasonConfig,
  today: string,
): RescueEvent | null {
  const draw = rescueDraw(weekIndex, config);
  if (!draw) return null;
  const { day, challenge } = draw;
  const manual = records.find((r) => r.kind === 'rescue' && r.data.weekIndex === weekIndex && r.day === day);
  const { progress, target } = progressOf(
    challenge,
    days.find((d) => d.date === day),
    Boolean(manual),
  );
  const done = target > 0 && progress >= target;
  return {
    weekIndex,
    day,
    challengeId: challenge.id,
    title: challenge.title,
    description: challenge.description,
    kind: challenge.kind,
    target,
    progress,
    state: done ? 'done' : today < day ? 'upcoming' : today === day ? 'active' : 'missed',
    recordId: manual?.id ?? null,
  };
}
