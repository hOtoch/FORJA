import { describe, expect, it } from 'vitest';
import { season1 } from '@/config/season1';
import { seasonWeeks } from '@/lib/time';
import type { ForjaRecord } from '@/lib/types';
import { letterFor } from './grade';
import { at, cardio, game, gym, perfectSeason, perfectWeek, reserveBreak, study, studyRange } from './test-helpers';

const withoutStudyOn = (records: ForjaRecord[], day: string) =>
  records.filter((r) => !(r.kind === 'study' && r.day === day));

describe('faixas da nota', () => {
  it('S a partir de 95, A de 85, B de 70, C abaixo', () => {
    expect(letterFor(100, season1)).toBe('S');
    expect(letterFor(95, season1)).toBe('S');
    expect(letterFor(94.99, season1)).toBe('A');
    expect(letterFor(85, season1)).toBe('A');
    expect(letterFor(84.99, season1)).toBe('B');
    expect(letterFor(70, season1)).toBe('B');
    expect(letterFor(69.99, season1)).toBe('C');
    expect(letterFor(0, season1)).toBe('C');
  });
});

describe('nota prevista', () => {
  it('sem nada fechado não tem letra', () => {
    const g = game([study('2026-10-05', 90)], at('2026-10-05'));
    expect(g.grade).toEqual({ studyPct: 0, gymPct: 0, cardioPct: 0, totalPct: 0, letter: null, isFinal: false });
  });

  it('antes da temporada não tem letra', () => {
    expect(game([], at('2026-10-01')).grade.letter).toBeNull();
  });

  it('usa só os dias fechados; academia e cardio ficam fora sem semana fechada', () => {
    const g = game([study('2026-10-05', 60), study('2026-10-07', 60)], at('2026-10-07'));
    expect(g.grade).toMatchObject({ studyPct: 50, gymPct: 0, cardioPct: 0, totalPct: 50, letter: 'C', isFinal: false });
  });

  it('dia salvo por escudo não conta como cumprido', () => {
    const g = game(studyRange('2026-10-05', '2026-10-07'), at('2026-10-09'));
    expect(g.days.find((d) => d.date === '2026-10-08')?.shieldUsed).toBe(true);
    expect(g.grade.studyPct).toBe(75);
  });

  it('semana vencida fechada dá S', () => {
    const g = game(perfectWeek(1), at('2026-10-12'));
    expect(g.grade).toMatchObject({ studyPct: 100, gymPct: 100, cardioPct: 100, totalPct: 100, letter: 'S' });
  });

  it('semana sem supercardio conta no máximo 4 cardios', () => {
    const records = [
      ...perfectWeek(1),
      ...perfectWeek(2),
      ...perfectWeek(3).filter((r) => r.kind !== 'cardio'),
      ...['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24'].map((d) => cardio(d)),
    ];
    const g = game(records, at('2026-10-26'));
    // 5 + 5 + 4 (6 cardios sem super) de 15
    expect(g.grade.cardioPct).toBeCloseTo((14 / 15) * 100, 10);
    expect(g.grade.gymPct).toBe(100);
  });
});

describe('nota final', () => {
  it('usa os denominadores 76, 46 e 57', () => {
    // estudo em todos os dias menos 1, 2 treinos por semana (1 na final) e cardio completo
    const records: ForjaRecord[] = withoutStudyOn(
      perfectSeason().filter((r) => r.kind !== 'gym'),
      '2026-10-20',
    );
    for (const w of seasonWeeks(season1)) {
      records.push(gym(w.days[0]));
      if (!w.isFinal) records.push(gym(w.days[1]));
    }
    const g = game(records, at('2026-12-24'));
    expect(g.grade.isFinal).toBe(true);
    expect(g.grade.studyPct).toBeCloseTo((75 / 76) * 100, 10);
    expect(g.grade.gymPct).toBeCloseTo((23 / 46) * 100, 10);
    expect(g.grade.cardioPct).toBe(100);
    expect(g.grade.totalPct).toBeCloseTo(((75 / 76) * 100 + 50 + 100) / 3, 10);
    expect(g.grade.letter).toBe('B');
  });

  it('folga de reserva sai do denominador do estudo', () => {
    const records = [...withoutStudyOn(perfectSeason(), '2026-10-20'), reserveBreak('2026-10-20')];
    const g = game(records, at('2026-12-24'));
    expect(g.grade).toMatchObject({ studyPct: 100, gymPct: 100, cardioPct: 100, letter: 'S', isFinal: true });
  });

  it('dias de folga planejada não entram na nota mesmo com estudo', () => {
    const records = [...perfectSeason(), study('2026-10-10', 60)];
    expect(game(records, at('2026-12-24')).grade.studyPct).toBe(100);
  });
});
