import { describe, expect, it } from 'vitest';
import { season1 } from '@/config/season1';
import type { SeasonConfig } from '@/lib/types';
import { at, dayOf, game, perfectSeason, perfectWeek, study, studyRange } from './test-helpers';

const twoShields: SeasonConfig = { ...season1, shields: { initial: 2, max: 2 } };

describe('sequência e escudos', () => {
  it('começa com 1 escudo e sequência zerada', () => {
    const g = game([], at('2026-10-05'));
    expect(g.streak).toEqual({ current: 0, best: 0, shields: 1 });
    expect(g.yesterdayMissedUnprotected).toBe(false);
  });

  it('usa o escudo numa falha isolada e avisa que hoje não pode falhar', () => {
    const g = game(studyRange('2026-10-05', '2026-10-07'), at('2026-10-09'));
    expect(dayOf(g, '2026-10-08').shieldUsed).toBe(true);
    expect(g.streak).toEqual({ current: 3, best: 3, shields: 0 });
    expect(g.yesterdayMissedUnprotected).toBe(true);
    expect(g.status.reasons).toContain('Ontem ficou sem estudo. Se hoje também ficar, a sequência quebra.');
  });

  it('depois do escudo, a sequência continua somando', () => {
    const records = [...studyRange('2026-10-05', '2026-10-07'), study('2026-10-09', 60)];
    const g = game(records, at('2026-10-14'));
    expect(g.streak.current).toBe(4);
    expect(g.yesterdayMissedUnprotected).toBe(false);
  });

  it('segunda falha seguida quebra a sequência mesmo havendo escudo', () => {
    const g = game(studyRange('2026-10-05', '2026-10-07'), at('2026-10-10'), twoShields);
    expect(dayOf(g, '2026-10-08').shieldUsed).toBe(true);
    expect(dayOf(g, '2026-10-09').shieldUsed).toBe(false);
    expect(g.streak).toEqual({ current: 0, best: 3, shields: 1 });
  });

  it('segunda falha seguida quebra com escudo ganho de chefe (config real)', () => {
    const records = [...perfectWeek(1), ...perfectWeek(2), study('2026-10-19', 60)];
    const g = game(records, at('2026-10-22'));
    expect(dayOf(g, '2026-10-20').shieldUsed).toBe(true);
    expect(dayOf(g, '2026-10-21').shieldUsed).toBe(false);
    expect(g.streak).toEqual({ current: 0, best: 11, shields: 1 });
  });

  it('falha sem escudo zera', () => {
    // 05/10 sem estudo gasta o escudo; 09/10 fica sem proteção
    const g = game(studyRange('2026-10-06', '2026-10-08'), at('2026-10-14'));
    expect(dayOf(g, '2026-10-05').shieldUsed).toBe(true);
    expect(dayOf(g, '2026-10-09').shieldUsed).toBe(false);
    expect(g.streak).toEqual({ current: 0, best: 3, shields: 0 });
  });

  it('folga congela a sequência: não quebra nem soma, mesmo com estudo', () => {
    const records = [...studyRange('2026-10-05', '2026-10-09'), study('2026-10-11', 90)];
    const g = game(records, at('2026-10-14'));
    expect(g.streak.current).toBe(5);
    expect(g.days.filter((d) => d.shieldUsed)).toHaveLength(0);
  });

  it('falhas separadas só por folgas contam como seguidas', () => {
    const g = game(studyRange('2026-10-05', '2026-10-08'), at('2026-10-15'), twoShields);
    expect(dayOf(g, '2026-10-09').shieldUsed).toBe(true);
    expect(dayOf(g, '2026-10-14').shieldUsed).toBe(false);
    expect(g.streak).toEqual({ current: 0, best: 4, shields: 1 });
  });

  it('hoje só entra na sequência depois de cumprido', () => {
    const before = game([...studyRange('2026-10-05', '2026-10-06'), study('2026-10-07', 30)], at('2026-10-07', '18:00'));
    expect(before.streak.current).toBe(2);
    expect(before.yesterdayMissedUnprotected).toBe(false);
    const after = game([...studyRange('2026-10-05', '2026-10-06'), study('2026-10-07', 60)], at('2026-10-07', '18:00'));
    expect(after.streak).toMatchObject({ current: 3, best: 3 });
  });

  it('chefe derrotado rende 1 escudo ao fechar a semana, até o máximo de 2', () => {
    // semana 1 com um dia salvo por escudo (sem chefe), semanas 2, 3 e 4 vencidas
    const week1 = perfectWeek(1).filter((r) => !(r.kind === 'study' && r.day === '2026-10-06'));
    const base = [...week1, ...perfectWeek(2)];
    expect(game(base, at('2026-10-12')).streak.shields).toBe(0);
    // durante o último dia da semana 2 o chefe já caiu, mas o escudo só vem quando ela fecha
    const sunday = game(base, at('2026-10-18', '20:00'));
    expect(sunday.currentWeek?.bossDefeated).toBe(true);
    expect(sunday.streak.shields).toBe(0);
    expect(game(base, at('2026-10-19')).streak.shields).toBe(1);
    const more = [...base, ...perfectWeek(3), ...perfectWeek(4)];
    expect(game(more, at('2026-10-26')).streak.shields).toBe(2);
    expect(game(more, at('2026-11-02')).streak.shields).toBe(2);
  });

  it('o chefe final não rende escudo', () => {
    const roomy: SeasonConfig = { ...season1, shields: { initial: 0, max: 99 } };
    const g = game(perfectSeason(60, roomy), at('2026-12-24'), roomy);
    expect(g.weeks.every((w) => w.bossDefeated)).toBe(true);
    expect(g.streak.shields).toBe(11);
  });

  it('melhor sequência fica guardada', () => {
    const records = [...studyRange('2026-10-05', '2026-10-09'), ...studyRange('2026-10-16', '2026-10-17')];
    const g = game(records, at('2026-10-18'));
    // 14/10 usa o escudo, 15/10 quebra
    expect(g.streak).toMatchObject({ current: 2, best: 5 });
  });
});
