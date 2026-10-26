// XP por atributo, nível e título (data-model.md, "XP").

import type { AttrName, ForjaRecord, GameState, SeasonConfig, Task, WeekInfo } from '@/lib/types';
import type { CourseEvent } from './courses';
import { blockMinutesOf, totalsByDay, type DayTotals } from './days';

export type AttrXp = Record<AttrName, number>;

const zero = (): AttrXp => ({ inteligencia: 0, influencia: 0, forca: 0, vigor: 0 });
const add = (a: AttrXp, b: AttrXp) => {
  a.inteligencia += b.inteligencia;
  a.influencia += b.influencia;
  a.forca += b.forca;
  a.vigor += b.vigor;
};
const sum = (a: AttrXp) => a.inteligencia + a.influencia + a.forca + a.vigor;

/** XP do chefe dividido entre os três atributos; o resto vai para Inteligência (100 → 34/33/33). */
export function bossXpSplit(config: SeasonConfig): AttrXp {
  const third = Math.floor(config.xp.boss / 3);
  return { inteligencia: config.xp.boss - 2 * third, influencia: 0, forca: third, vigor: third };
}

/**
 * Minutos dos blocos (até o teto diário, somando todos, na ordem da configuração), contadores,
 * treinos e cardios de um dia. Cada bloco e contador alimenta o seu atributo.
 */
export function activityXp(t: DayTotals, config: SeasonConfig): AttrXp {
  const x = config.xp;
  const out = zero();
  let room = x.workDailyCap;
  for (const b of config.blocks) {
    const xp = Math.min(blockMinutesOf(b, t.blockMinutes) * x.perWorkMinute, room);
    room -= xp;
    out[b.attr] += xp;
  }
  for (const c of config.counters) out[c.attr] += (t.counts[c.id] ?? 0) * c.xp;
  out.forca += t.gym * x.gym;
  out.vigor += (t.cardio - t.superCardio) * x.cardio + t.superCardio * x.superCardio;
  return out;
}

/** Nível = maior N com levelXp(N) <= total (mínimo 0); título do maior nível mínimo <= max(nível, 1). */
export function levelInfo(
  total: number,
  config: SeasonConfig,
): Pick<GameState['xp'], 'level' | 'title' | 'levelStartXp' | 'nextLevelXp'> {
  let level = 0;
  while (config.levelXp(level + 1) <= total) level += 1;
  const titleLevel = Math.max(level, 1);
  let title = config.titles[0]?.[1] ?? '';
  for (const [min, name] of config.titles) if (min <= titleLevel) title = name;
  return { level, title, levelStartXp: config.levelXp(level), nextLevelXp: config.levelXp(level + 1) };
}

export type XpState = GameState['xp'] & {
  /** XP total de cada dia (estudo, treino, cardio, módulos, cursos e o chefe no último dia da semana). */
  byDay: Map<string, number>;
};

/**
 * Soma o XP de todos os registros (inclusive os de fora da temporada), dos módulos e cursos
 * concluídos por registros e dos chefes derrotados.
 */
export function computeXp(
  records: ForjaRecord[],
  weeks: WeekInfo[],
  courseEvents: CourseEvent[],
  config: SeasonConfig,
  tasks: Task[] = [],
): XpState {
  const byAttr = zero();
  const byDay = new Map<string, number>();
  const credit = (day: string, xp: AttrXp) => {
    add(byAttr, xp);
    byDay.set(day, (byDay.get(day) ?? 0) + sum(xp));
  };

  for (const [day, t] of totalsByDay(records, config)) credit(day, activityXp(t, config));
  for (const e of courseEvents) {
    credit(e.day, { ...zero(), inteligencia: e.kind === 'module' ? config.xp.module : config.xp.course });
  }
  const boss = bossXpSplit(config);
  for (const w of weeks) if (w.bossDefeated) credit(w.end, boss);
  // tarefa concluída rende XP de Inteligência no dia em que foi concluída
  for (const t of tasks) if (t.doneDay) credit(t.doneDay, { ...zero(), inteligencia: config.xp.task });

  const total = sum(byAttr);
  return { total, byAttr, ...levelInfo(total, config), byDay };
}
