import { describe, expect, it } from 'vitest';
import { at, dayOf, game, perfectWeek, reserveBreak, study, studyRange } from './test-helpers';

describe('folgas planejadas', () => {
  it('10 a 13/10 são folga planejada', () => {
    const g = game([], at('2026-10-20'));
    expect(g.days.filter((d) => d.breakKind === 'planned').map((d) => d.date)).toEqual([
      '2026-10-10',
      '2026-10-11',
      '2026-10-12',
      '2026-10-13',
    ]);
  });

  it('não quebram nem somam a sequência e ficam fora da nota e do Fundo', () => {
    const g = game(studyRange('2026-10-05', '2026-10-09'), at('2026-10-14'));
    expect(g.streak.current).toBe(5);
    expect(g.grade.studyPct).toBe(100);
    for (const d of ['2026-10-10', '2026-10-11', '2026-10-12', '2026-10-13']) {
      expect(dayOf(g, d)).toMatchObject({ shieldUsed: false, fundCents: 0, heat: null });
    }
  });

  it('hoje de folga planejada não deixa usar folga de reserva', () => {
    const g = game([], at('2026-10-12'));
    expect(g.breaks).toEqual({ reserveUsed: 0, reserveLeft: 2, canUseToday: false });
  });
});

describe('folgas de reserva', () => {
  it('começa com 2 disponíveis', () => {
    expect(game([], at('2026-10-20')).breaks).toEqual({ reserveUsed: 0, reserveLeft: 2, canUseToday: true });
  });

  it('usar hoje marca o dia como folga e deixa 1', () => {
    const g = game([reserveBreak('2026-10-20')], at('2026-10-20'));
    expect(dayOf(g, '2026-10-20').breakKind).toBe('reserve');
    expect(g.breaks).toEqual({ reserveUsed: 1, reserveLeft: 1, canUseToday: false });
    expect(game([reserveBreak('2026-10-20')], at('2026-10-21')).breaks.canUseToday).toBe(true);
  });

  it('esgotadas, não dá para usar', () => {
    const g = game([reserveBreak('2026-10-20'), reserveBreak('2026-10-27')], at('2026-11-02'));
    expect(g.breaks).toEqual({ reserveUsed: 2, reserveLeft: 0, canUseToday: false });
  });

  it('fora da temporada não dá para usar', () => {
    expect(game([], at('2026-10-04')).breaks.canUseToday).toBe(false);
    expect(game([], at('2026-12-24')).breaks.canUseToday).toBe(false);
  });

  it('congela a sequência como a folga planejada', () => {
    const records = [...studyRange('2026-10-14', '2026-10-19'), reserveBreak('2026-10-20'), study('2026-10-21', 60)];
    const g = game(records, at('2026-10-22'));
    expect(dayOf(g, '2026-10-20').shieldUsed).toBe(false);
    // 05 a 09/10 sem estudo: o escudo vai em 05/10 e a sequência zera; depois 14 a 19 + 21
    expect(g.streak.current).toBe(7);
  });

  it('reduz os dias exigidos da semana e o chefe ainda pode cair', () => {
    const records = [
      ...perfectWeek(3).filter((r) => !(r.kind === 'study' && r.day === '2026-10-22')),
      reserveBreak('2026-10-22'),
    ];
    const g = game(records, at('2026-10-26'));
    expect(g.weeks[2]).toMatchObject({ studyDaysRequired: 6, studyDaysMet: 6, shieldDays: 0, bossDefeated: true });
    expect(g.weeks[2].fundCents).toBe(6 * 500 + 4000 + 2500 + 3000);
  });

  it('não conta folga de reserva fora da temporada', () => {
    expect(game([reserveBreak('2026-10-03')], at('2026-10-06')).breaks.reserveUsed).toBe(0);
  });
});
