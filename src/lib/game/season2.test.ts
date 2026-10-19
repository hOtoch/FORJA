import { describe, expect, it } from 'vitest';
import { season2 } from '@/config/season2';
import { addDays } from '@/lib/time';
import type { ForjaRecord, RescueChallengeConfig, SeasonConfig } from '@/lib/types';
import { rescueDraw } from './rescue';
import { at, cardio, count, dayOf, game, gym, study, superCardio, task, work } from './test-helpers';

// semana 1 da temporada 2: segunda 19/10 a domingo 25/10 (domingo é folga)
const MON = '2026-10-19';
const SAT = '2026-10-24';

/** Um dia útil cheio: todos os blocos na meta. */
function fullWeekday(day: string, extra: Partial<Record<string, number>> = {}): ForjaRecord[] {
  const m = (id: string, base: number) => base + (extra[id] ?? 0);
  return [
    work(day, 'prospeccao', m('prospeccao', 120)),
    work(day, 'vagas', m('vagas', 90)),
    { ...study(day, m('estudo', 120)), seasonId: 's2' },
    work(day, 'projeto', m('projeto', 120)),
    work(day, 'linkedin', m('linkedin', 30)),
  ];
}

function fullSaturday(day: string): ForjaRecord[] {
  return [work(day, 'projeto', 180), work(day, 'linkedin', 30)];
}

/** Treinos, cardios e contadores que vencem a semana 1. */
function week1Extras(): ForjaRecord[] {
  return [
    gym('2026-10-19'),
    gym('2026-10-20'),
    gym('2026-10-21'),
    gym('2026-10-22'),
    cardio('2026-10-19'),
    cardio('2026-10-20'),
    cardio('2026-10-21'),
    cardio('2026-10-22'),
    superCardio('2026-10-23'),
    count('2026-10-19', 'contatos', 100),
    count('2026-10-20', 'candidaturas', 20),
    count('2026-10-21', 'posts', 3),
  ];
}

function perfectWeek1(): ForjaRecord[] {
  const out: ForjaRecord[] = [];
  for (let d = MON; d < SAT; d = addDays(d, 1)) out.push(...fullWeekday(d));
  out.push(...fullSaturday(SAT), ...week1Extras());
  return out;
}

describe('temporada 2: rotina por blocos', () => {
  it('começa em 19/10, tem domingo de folga e 10 semanas', () => {
    const g = game([], at(MON), season2);
    expect(g.dayIndex).toBe(1);
    expect(g.weeks).toHaveLength(10);
    expect(g.weeks[9]).toMatchObject({ isFinal: true, start: '2026-12-21', end: '2026-12-23' });
    expect(dayOf(g, '2026-10-25').breakKind).toBe('planned');
    expect(g.weeks[0].daysRequired).toBe(6);
  });

  it('dia útil pede 8h somando os 5 blocos; sábado pede 3h30', () => {
    const g = game([], at(MON), season2);
    expect(dayOf(g, MON).goalMinutes).toBe(480);
    expect(dayOf(g, SAT).goalMinutes).toBe(210);
  });

  it('o dia só está cumprido com todos os blocos na meta', () => {
    const almost = fullWeekday(MON).filter((r) => !(r.kind === 'work' && r.data.block === 'linkedin'));
    const g = game(almost, at(MON, '22:00'), season2);
    expect(dayOf(g, MON)).toMatchObject({ dayMet: false, workMinutes: 450, heat: 1 });
    expect(g.status.reasons).toContain('Faltam 30 min de LinkedIn hoje.');
    const ok = game(fullWeekday(MON), at(MON, '22:00'), season2);
    expect(dayOf(ok, MON)).toMatchObject({ dayMet: true, heat: 2 });
  });

  it('compensa bloco a bloco: estudo a mais não cobre vagas', () => {
    const tue = addDays(MON, 1);
    const records = [
      ...fullWeekday(MON, { vagas: -90 }), // segunda sem vagas
      ...fullWeekday(tue, { estudo: 90 }), // terça com 90 min a mais de estudo
    ];
    const g = game(records, at(addDays(MON, 2)), season2);
    expect(dayOf(g, MON).dayRedeemed).toBe(false);
    expect(g.weeks[0].owedByBlock).toEqual({ vagas: 90 });

    const fixed = game([...records, work(addDays(MON, 2), 'vagas', 180)], at(addDays(MON, 2), '22:00'), season2);
    expect(dayOf(fixed, MON).dayRedeemed).toBe(true);
    expect(fixed.weeks[0].owedByBlock).toEqual({});
  });

  it('o chefe pede também os contadores da semana', () => {
    const g = game(perfectWeek1(), at('2026-10-26'), season2);
    expect(g.weeks[0]).toMatchObject({ daysMet: 6, bossDefeated: true });
    expect(g.weeks[0].counters).toEqual([
      { id: 'contatos', count: 100, target: 100 },
      { id: 'candidaturas', count: 20, target: 20 },
      { id: 'posts', count: 3, target: 3 },
    ]);
    const noPosts = perfectWeek1().filter((r) => !(r.kind === 'count' && r.data.counter === 'posts'));
    expect(game(noPosts, at('2026-10-26'), season2).weeks[0].bossDefeated).toBe(false);
  });

  it('a semana final, parcial, pede a parte proporcional dos contadores', () => {
    const g = game([], at('2026-12-21'), season2);
    expect(g.weeks[9].counters.map((c) => c.target)).toEqual([43, 9, 2]);
  });

  it('XP: blocos de prospecção, vagas e LinkedIn vão para Influência; contadores também', () => {
    const g = game([...fullWeekday(MON), count(MON, 'candidaturas', 2)], at(MON, '22:00'), season2);
    expect(g.xp.byAttr.inteligencia).toBe(240);
    expect(g.xp.byAttr.influencia).toBe(120 + 90 + 30 + 2 * 10);
  });

  it('o teto diário de XP soma todos os blocos', () => {
    const g = game(fullWeekday(MON, { projeto: 300 }), at(MON, '23:00'), season2);
    expect(g.xp.byAttr.inteligencia + g.xp.byAttr.influencia).toBe(season2.xp.workDailyCap);
  });

  it('tarefa concluída rende XP no dia em que foi feita', () => {
    const tasks = [task('Atualizar o currículo', MON), task('Montar a landing do SaaS')];
    const g = game([], at(MON, '20:00'), season2, null, tasks);
    expect(g.xp.total).toBe(season2.xp.task);
    expect(dayOf(g, MON).xp).toBe(season2.xp.task);
    expect(g.tasks.open.map((t) => t.title)).toEqual(['Montar a landing do SaaS']);
    expect(g.tasks.done).toHaveLength(1);
  });
});

describe('temporada 2: resgate por contador e por bloco', () => {
  const only = (challenge: RescueChallengeConfig): SeasonConfig => ({ ...season2, rescue: { challenges: [challenge] } });

  it('contador: soma o que foi registrado no dia do evento', () => {
    const config = only({ id: 'c', title: 'Enviar {n} candidaturas', description: '', kind: 'counter', counter: 'candidaturas', base: 8, step: 1 });
    const day = rescueDraw(1, config)!.day;
    const g = game([count(day, 'candidaturas', 5), count(day, 'candidaturas', 3)], at(day, '20:00'), config);
    expect(g.rescue).toMatchObject({ weekIndex: 1, amount: 8, progress: 8, state: 'done', title: 'Enviar 8 candidaturas' });
    expect(g.weeks[0]).toMatchObject({ bossDefeated: true, bossRescued: true });
  });

  it('bloco: pede a meta do bloco naquele dia mais o extra', () => {
    const config = only({ id: 'p', title: 'Projeto: {n} min a mais', description: 'Some {total} min.', kind: 'block-minutes', block: 'projeto', base: 60, step: 10 });
    const day = rescueDraw(1, config)!.day;
    const g = game([], at(day), config);
    const goal = dayOf(g, day).blocks.find((b) => b.id === 'projeto')!.goal;
    expect(g.rescue).toMatchObject({ target: goal + 60, description: `Some ${goal + 60} min.` });
  });
});
