import { describe, expect, it } from 'vitest';
import { season1 } from '@/config/season1';
import { clientBonusCents } from '@/lib/cardio';
import { at, cardio, client, dayOf, deposit, game, gym, perfectSeason, perfectWeek, study, studyRange, superCardio } from './test-helpers';

// semana 3 (19 a 25/10), sem folgas
const exampleWeek = () => [
  ...studyRange('2026-10-19', '2026-10-25'),
  ...['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23'].map((d) => gym(d)),
  superCardio('2026-10-19'),
  ...['2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24'].map((d) => cardio(d)),
];

describe('Fundo Réveillon', () => {
  it('semana com 7 dias de estudo, 5 treinos e 6 cardios com super pede R$ 130', () => {
    const g = game(exampleWeek(), at('2026-10-26', '04:00'));
    const w = g.weeks[2];
    expect(w.bossDefeated).toBe(true);
    expect(w.fundCents).toBe(3500 + 4000 + 2500 + 3000);
    expect(w.fundCents).toBe(13000);
    expect(g.fund.pending).toEqual([{ weekIndex: 3, amountCents: 13000 }]);
    expect(g.fund.earnedCents).toBe(13000);
  });

  it('antes das 04:00 de segunda a semana ainda não fechou', () => {
    const g = game(exampleWeek(), at('2026-10-26', '03:59'));
    expect(g.weeks[2].isClosed).toBe(false);
    expect(g.fund.pending).toEqual([]);
    expect(g.fund.earnedCents).toBe(13000);
  });

  it('depósito confirmado sai do pendente e soma no depositado', () => {
    const g = game([...exampleWeek(), deposit('2026-10-26', 3, 13000)], at('2026-10-27'));
    expect(g.fund.pending).toEqual([]);
    expect(g.fund.depositedCents).toBe(13000);
    expect(g.weeks[2].depositedCents).toBe(13000);
  });

  it('pendente lista só semanas fechadas, sem depósito e com valor', () => {
    const records = [...perfectWeek(1), ...perfectWeek(3), study('2026-10-26', 60), deposit('2026-10-12', 1, 1000)];
    const g = game(records, at('2026-10-27'));
    expect(g.fund.pending.map((p) => p.weekIndex)).toEqual([3]);
    // a semana 4 em andamento já entra no ganho
    expect(g.fund.earnedCents).toBe(g.weeks[0].fundCents + g.weeks[2].fundCents + 500);
  });

  it('excedentes, folgas e dias de escudo não rendem', () => {
    const records = [
      ...studyRange('2026-10-05', '2026-10-07'),
      study('2026-10-10', 120), // folga planejada
      study('2026-10-09', 60),
      ...['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10'].map((d) => gym(d)),
    ];
    const g = game(records, at('2026-10-12'));
    expect(dayOf(g, '2026-10-08').shieldUsed).toBe(true);
    // 4 dias cumpridos × R$ 5 + 4 treinos (o 5º e o 6º são excedentes) × R$ 10
    expect(g.weeks[0].fundCents).toBe(4 * 500 + 4 * 1000);
    expect(dayOf(g, '2026-10-10').fundCents).toBe(0);
    expect(dayOf(g, '2026-10-08').fundCents).toBe(1000);
  });

  it('cliente fechado soma 5% do contrato ao Fundo da semana', () => {
    expect(clientBonusCents(300000, season1)).toBe(15000);
    const g = game([client('2026-10-20', 300000)], at('2026-10-21'));
    expect(g.weeks[2].fundCents).toBe(15000);
    expect(g.fund.clientBonusCents).toBe(15000);
    expect(g.fund.earnedCents).toBe(15000);
    expect(dayOf(g, '2026-10-20').fundCents).toBe(15000);
  });

  it('cliente fora da temporada não entra no Fundo', () => {
    const g = game([client('2026-10-03', 300000)], at('2026-10-06'));
    expect(g.fund.clientBonusCents).toBe(0);
    expect(g.fund.earnedCents).toBe(0);
  });

  it('temporada perfeita dá exatamente R$ 1.500', () => {
    const g = game(perfectSeason(), at('2026-12-24'));
    expect(g.fund.earnedCents).toBe(150000);
    expect(g.fund.perfectCents).toBe(150000);
  });

  it('a soma do que cada dia rendeu dá o ganho das semanas', () => {
    const records = [...perfectSeason(), client('2026-11-03', 120000), gym('2026-11-04'), cardio('2026-11-05')];
    const g = game(records, at('2026-12-24'));
    expect(g.days.reduce((s, d) => s + d.fundCents, 0)).toBe(g.fund.earnedCents);
    expect(g.fund.earnedCents).toBe(150000 + 6000);
  });
});
