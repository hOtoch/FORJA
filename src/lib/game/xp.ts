// XP por atributo, nível e título (data-model.md, "XP").

import type { ForjaRecord, GameState, SeasonConfig, WeekInfo } from '@/lib/types';
import type { CourseEvent } from './courses';
import { totalsByDay } from './days';

export interface AttrXp {
  inteligencia: number;
  forca: number;
  vigor: number;
}

const zero = (): AttrXp => ({ inteligencia: 0, forca: 0, vigor: 0 });
const add = (a: AttrXp, b: AttrXp) => {
  a.inteligencia += b.inteligencia;
  a.forca += b.forca;
  a.vigor += b.vigor;
};
const sum = (a: AttrXp) => a.inteligencia + a.forca + a.vigor;

/** XP do chefe dividido entre os três atributos; o resto vai para Inteligência (100 → 34/33/33). */
export function bossXpSplit(config: SeasonConfig): AttrXp {
  const third = Math.floor(config.xp.boss / 3);
  return { inteligencia: config.xp.boss - 2 * third, forca: third, vigor: third };
}

/** Estudo (até o teto diário), treinos e cardios de um dia. */
export function activityXp(
  t: { studyMinutes: number; gym: number; cardio: number; superCardio: number },
  config: SeasonConfig,
): AttrXp {
  const x = config.xp;
  return {
    inteligencia: Math.min(t.studyMinutes * x.perStudyMinute, x.studyDailyCap),
    forca: t.gym * x.gym,
    vigor: (t.cardio - t.superCardio) * x.cardio + t.superCardio * x.superCardio,
  };
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

  const total = sum(byAttr);
  return { total, byAttr, ...levelInfo(total, config), byDay };
}
