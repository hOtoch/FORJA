import { describe, expect, it } from 'vitest';
import { at, cardio, deposit, game, gym, perfectWeek, study, studyRange, superCardio } from './test-helpers';

// semana 3: segunda 19/10 a domingo 25/10, sem folgas
const W3 = { start: '2026-10-19', end: '2026-10-25' };
const week3Training = () => [
  gym('2026-10-19'),
  gym('2026-10-20'),
  gym('2026-10-21'),
  gym('2026-10-22'),
  cardio('2026-10-19'),
  cardio('2026-10-20'),
  cardio('2026-10-21'),
  cardio('2026-10-22'),
];

describe('semanas', () => {
  it('são 12, com metas 4/5 e supercardio, e 2/2 sem supercardio na final', () => {
    const g = game([], at('2026-10-20'));
    expect(g.weeks).toHaveLength(12);
    for (const w of g.weeks.slice(0, 11)) {
      expect(w).toMatchObject({ isFinal: false, gymTarget: 4, cardioTarget: 5, superRequired: true });
    }
    expect(g.weeks[11]).toMatchObject({
      index: 12,
      start: '2026-12-21',
      end: '2026-12-23',
      isFinal: true,
      gymTarget: 2,
      cardioTarget: 2,
      superRequired: false,
      studyDaysRequired: 3,
    });
  });

  it('a semana 1 tem 10 e 11/10 de folga e exige 5 dias de estudo; a 2 também', () => {
    const g = game([], at('2026-10-06'));
    expect(g.weeks[0]).toMatchObject({ start: '2026-10-05', end: '2026-10-11', studyDaysRequired: 5 });
    expect(g.weeks[1]).toMatchObject({ start: '2026-10-12', end: '2026-10-18', studyDaysRequired: 5 });
    expect(g.weeks[2].studyDaysRequired).toBe(7);
  });

  it('marca a semana atual e as fechadas', () => {
    const g = game([], at('2026-10-20'));
    expect(g.weeks.map((w) => w.isClosed).slice(0, 4)).toEqual([true, true, false, false]);
    expect(g.weeks.filter((w) => w.isCurrent).map((w) => w.index)).toEqual([3]);
    expect(g.currentWeek?.index).toBe(3);
  });

  it('chefe derrotado com estudo em todos os dias, 4 treinos e 5 cardios com supercardio', () => {
    const g = game(perfectWeek(3), at('2026-10-26'));
    expect(g.weeks[2]).toMatchObject({
      studyDaysMet: 7,
      shieldDays: 0,
      gym: 4,
      cardio: 5,
      hasSuper: true,
      bossDefeated: true,
      isClosed: true,
    });
  });

  it('chefe da semana 1 não exige estudo nas folgas', () => {
    const g = game(perfectWeek(1), at('2026-10-12'));
    expect(g.weeks[0]).toMatchObject({ studyDaysMet: 5, studyDaysRequired: 5, bossDefeated: true });
  });

  it('semana cheia sem supercardio conta no máximo 4 cardios e não derrota o chefe', () => {
    const records = [
      ...studyRange(W3.start, W3.end),
      ...week3Training(),
      cardio('2026-10-23'),
      cardio('2026-10-24'),
    ];
    const g = game(records, at('2026-10-26'));
    const w = g.weeks[2];
    expect(w).toMatchObject({ cardio: 6, hasSuper: false, bossDefeated: false });
    // 7 dias × 5 + 4 treinos × 10 + 4 cardios (teto sem super) × 5
    expect(w.fundCents).toBe(3500 + 4000 + 2000);
  });

  it('falta um dia de estudo: chefe não cai', () => {
    const records = [
      ...studyRange(W3.start, '2026-10-24'),
      ...week3Training(),
      superCardio('2026-10-23'),
    ];
    const g = game(records, at('2026-10-26'));
    expect(g.weeks[2]).toMatchObject({ studyDaysMet: 6, studyDaysRequired: 7, bossDefeated: false });
  });

  it('semana com um dia salvo por escudo não derrota o chefe', () => {
    const records = [
      ...studyRange('2026-10-05', '2026-10-20'),
      ...studyRange('2026-10-22', W3.end),
      ...week3Training(),
      superCardio('2026-10-23'),
    ];
    const g = game(records, at('2026-10-26'));
    const w = g.weeks[2];
    expect(w).toMatchObject({ studyDaysMet: 6, shieldDays: 1, gym: 4, cardio: 5, hasSuper: true });
    expect(w.bossDefeated).toBe(false);
  });

  it('supercardio pela modalidade e pelos minutos', () => {
    const base = [...studyRange(W3.start, W3.end), ...week3Training()];
    const withBike = game([...base, cardio('2026-10-23', 'bicicleta', 60)], at('2026-10-26')).weeks[2];
    expect(withBike).toMatchObject({ hasSuper: true, bossDefeated: true });
    const shortWalk = game([...base, cardio('2026-10-23', 'caminhada', 59)], at('2026-10-26')).weeks[2];
    expect(shortWalk).toMatchObject({ hasSuper: false, bossDefeated: false });
    const elliptical = game([...base, cardio('2026-10-23', 'eliptico', 90)], at('2026-10-26')).weeks[2];
    expect(elliptical.hasSuper).toBe(false);
    const pelada = game([...base, cardio('2026-10-23', 'pelada', 15)], at('2026-10-26')).weeks[2];
    expect(pelada).toMatchObject({ hasSuper: true, bossDefeated: true });
  });

  it('chefe final: 3 dias de estudo, 2 treinos e 2 cardios, sem supercardio, rende R$ 45', () => {
    const records = [
      ...studyRange('2026-12-21', '2026-12-23'),
      gym('2026-12-21'),
      gym('2026-12-22'),
      cardio('2026-12-21'),
      cardio('2026-12-22'),
    ];
    const w = game(records, at('2026-12-24')).weeks[11];
    expect(w).toMatchObject({ isFinal: true, hasSuper: false, bossDefeated: true, isClosed: true });
    expect(w.fundCents).toBe(3 * 500 + 2 * 1000 + 2 * 500 + 4500);
  });

  it('o chefe já aparece derrotado na semana atual quando tudo foi cumprido', () => {
    const records = [...perfectWeek(3)];
    const g = game(records, at('2026-10-25', '20:00'));
    expect(g.currentWeek).toMatchObject({ index: 3, isClosed: false, bossDefeated: true });
  });

  it('guarda o depósito confirmado da semana', () => {
    const g = game([study('2026-10-19', 60), deposit('2026-10-26', 3, 500)], at('2026-10-27'));
    expect(g.weeks[2]).toMatchObject({ fundCents: 500, depositedCents: 500 });
    expect(g.weeks[3].depositedCents).toBeNull();
  });
});
