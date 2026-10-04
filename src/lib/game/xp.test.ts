import { describe, expect, it } from 'vitest';
import { season1 } from '@/config/season1';
import { at, cardio, dayOf, game, gym, perfectWeek, study, superCardio } from './test-helpers';
import { bossXpSplit, levelInfo } from './xp';

describe('XP', () => {
  it('150 min de estudo num dia rendem 120 XP de Inteligência (teto diário)', () => {
    const g = game([study('2026-10-06', 150)], at('2026-10-07'));
    expect(g.xp.byAttr).toEqual({ inteligencia: 120, forca: 0, vigor: 0 });
    expect(g.xp.total).toBe(120);
    expect(dayOf(g, '2026-10-06').xp).toBe(120);
  });

  it('o teto vale para o dia, somando as sessões', () => {
    const g = game([study('2026-10-06', 100), study('2026-10-06', 50), study('2026-10-07', 45)], at('2026-10-08'));
    expect(g.xp.byAttr.inteligencia).toBe(120 + 45);
  });

  it('treino 60 em Força; cardio 20 e supercardio 60 em Vigor', () => {
    const g = game(
      [gym('2026-10-06'), gym('2026-10-07'), cardio('2026-10-06'), superCardio('2026-10-07'), cardio('2026-10-07', 'pelada', 30)],
      at('2026-10-08'),
    );
    expect(g.xp.byAttr).toEqual({ inteligencia: 0, forca: 120, vigor: 20 + 60 + 60 });
  });

  it('registros fora da temporada também rendem XP', () => {
    const g = game([study('2026-10-03', 90), gym('2026-10-04')], at('2026-10-05'));
    expect(g.xp.total).toBe(150);
    expect(g.days.reduce((s, d) => s + d.xp, 0)).toBe(0);
  });

  it('o chefe rende 100 XP divididos em 34/33/33', () => {
    expect(bossXpSplit(season1)).toEqual({ inteligencia: 34, forca: 33, vigor: 33 });
    const g = game(perfectWeek(3), at('2026-10-26'));
    // 7 × 60 de estudo, 4 treinos, 4 cardios + 1 super, e o chefe no último dia da semana
    expect(g.xp.byAttr).toEqual({ inteligencia: 420 + 34, forca: 240 + 33, vigor: 80 + 60 + 33 });
    expect(dayOf(g, '2026-10-25').xp).toBe(60 + 100);
  });

  it('módulos concluídos antes da temporada não rendem XP', () => {
    const g = game([], at('2026-10-06'));
    expect(g.xp.total).toBe(0);
    expect(g.courses[0].modules[0].completed).toBe(true);
  });

  it('a soma do XP dos dias dá o total quando tudo é da temporada', () => {
    const g = game([...perfectWeek(3), study('2026-10-27', 30, { lessonIds: [991, 992] })], at('2026-10-28'));
    expect(g.days.reduce((s, d) => s + d.xp, 0)).toBe(g.xp.total);
  });
});

describe('nível e título', () => {
  it('0 XP é nível 0, Aprendiz da forja', () => {
    expect(levelInfo(0, season1)).toEqual({ level: 0, title: 'Aprendiz da forja', levelStartXp: 0, nextLevelXp: 100 });
  });

  it('100 XP é nível 1; 299 ainda é 1', () => {
    expect(levelInfo(100, season1).level).toBe(1);
    expect(levelInfo(299, season1).level).toBe(1);
  });

  it('300 XP é nível 2', () => {
    expect(levelInfo(300, season1)).toEqual({ level: 2, title: 'Aprendiz da forja', levelStartXp: 300, nextLevelXp: 600 });
  });

  it('1.200 XP é nível 4, Malhador', () => {
    expect(levelInfo(1200, season1)).toMatchObject({ level: 4, title: 'Malhador', levelStartXp: 1000, nextLevelXp: 1500 });
  });

  it('títulos seguem os níveis mínimos', () => {
    expect(levelInfo(50 * 6 * 7, season1).title).toBe('Ferreiro');
    expect(levelInfo(50 * 9 * 10, season1).title).toBe('Armeiro');
    expect(levelInfo(50 * 12 * 13, season1).title).toBe('Mestre ferreiro');
    expect(levelInfo(50 * 15 * 16, season1)).toMatchObject({ level: 15, title: 'Lenda da forja' });
  });
});
