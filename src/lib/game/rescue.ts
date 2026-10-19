// Evento de resgate: o chefe que escapou numa semana ganha uma segunda chance num dia sorteado da
// semana seguinte. Cumprindo o desafio daquele dia, o chefe conta como derrotado (XP e Fundo; o
// escudo, não, porque ele só vem com a semana vencida nas metas). Quanto mais avançado no mapa,
// mais pesado o desafio.

import { seasonWeeks, weekdayOf } from '@/lib/time';
import type { DayInfo, ForjaRecord, RescueChallengeConfig, RescueEvent, SeasonConfig } from '@/lib/types';
import { blockGoal } from './days';

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

/** Quantidade pedida pelo desafio no chefe da semana `weekIndex`. */
export function rescueAmount(c: RescueChallengeConfig, weekIndex: number): number {
  const n = c.base + c.step * Math.max(0, weekIndex - 1);
  return Math.max(1, Math.round(c.max === undefined ? n : Math.min(n, c.max)));
}

/** Faixa de dificuldade pelo ponto do mapa (12 semanas: 1–3, 4–6, 7–9, 10–11). */
export function rescueTier(weekIndex: number): string {
  if (weekIndex <= 3) return 'fácil';
  if (weekIndex <= 6) return 'médio';
  if (weekIndex <= 9) return 'difícil';
  return 'lendário';
}

const fill = (text: string, n: number, total: number) =>
  text.replaceAll('{n}', String(n)).replaceAll('{total}', String(total));

/** Meta do bloco do desafio no dia do evento. */
function blockGoalOn(c: RescueChallengeConfig, day: string, config: SeasonConfig): number {
  const block = config.blocks.find((b) => b.id === c.block);
  return block ? blockGoal(block, weekdayOf(day)) : 0;
}

function progressOf(
  c: RescueChallengeConfig,
  amount: number,
  day: string,
  d: DayInfo | undefined,
  manualDone: boolean,
  config: SeasonConfig,
): { progress: number; target: number; label: string } {
  switch (c.kind) {
    case 'block-minutes': {
      const target = blockGoalOn(c, day, config) + amount;
      const progress = d?.blocks.find((b) => b.id === c.block)?.minutes ?? 0;
      return { progress, target, label: `${Math.min(progress, target)} de ${target} min` };
    }
    case 'counter': {
      const progress = d?.counts[c.counter ?? ''] ?? 0;
      return { progress, target: amount, label: `${Math.min(progress, amount)} de ${amount}` };
    }
    case 'cardio-minutes': {
      const progress = d?.cardioMinutes ?? 0;
      return { progress, target: amount, label: `${Math.min(progress, amount)} de ${amount} min` };
    }
    case 'manual':
      return { progress: manualDone ? 1 : 0, target: 1, label: manualDone ? 'concluído' : 'a fazer' };
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
  const amount = rescueAmount(challenge, weekIndex);
  const total = blockGoalOn(challenge, day, config) + amount;
  const { progress, target, label } = progressOf(
    challenge,
    amount,
    day,
    days.find((d) => d.date === day),
    Boolean(manual),
    config,
  );
  const done = target > 0 && progress >= target;
  return {
    weekIndex,
    day,
    challengeId: challenge.id,
    title: fill(challenge.title, amount, total),
    description: fill(challenge.description, amount, total),
    kind: challenge.kind,
    level: weekIndex,
    tier: rescueTier(weekIndex),
    amount,
    target,
    progress,
    progressLabel: label,
    state: done ? 'done' : today < day ? 'upcoming' : today === day ? 'active' : 'missed',
    recordId: manual?.id ?? null,
  };
}
