import { describe, expect, it } from 'vitest';
import { at, cardio, dayOf, game, gym, study } from './test-helpers';

describe('dias da temporada', () => {
  it('são 80, numerados, com semana e dia da semana', () => {
    const g = game([], at('2026-10-20'));
    expect(g.days).toHaveLength(80);
    expect(g.days[0]).toMatchObject({ date: '2026-10-05', index: 1, weekIndex: 1, weekday: 1 });
    expect(g.days[6]).toMatchObject({ date: '2026-10-11', index: 7, weekIndex: 1, weekday: 7 });
    expect(g.days[79]).toMatchObject({ date: '2026-12-23', index: 80, weekIndex: 12, weekday: 3 });
  });

  it('marcam hoje e o futuro', () => {
    const g = game([], at('2026-10-20'));
    expect(dayOf(g, '2026-10-19')).toMatchObject({ isToday: false, isFuture: false });
    expect(dayOf(g, '2026-10-20')).toMatchObject({ isToday: true, isFuture: false });
    expect(dayOf(g, '2026-10-21')).toMatchObject({ isToday: false, isFuture: true });
    expect(g.todayInfo?.date).toBe('2026-10-20');
    expect(g.dayIndex).toBe(16);
    expect(g.phase).toBe('active');
  });

  it('somam o estudo do dia e cumprem a meta com 60 min ou mais', () => {
    const g = game(
      [study('2026-10-14', 30), study('2026-10-14', 40), study('2026-10-15', 59), study('2026-10-16', 60)],
      at('2026-10-20'),
    );
    expect(dayOf(g, '2026-10-14')).toMatchObject({ studyMinutes: 70, studyMet: true });
    expect(dayOf(g, '2026-10-15')).toMatchObject({ studyMinutes: 59, studyMet: false });
    expect(dayOf(g, '2026-10-16')).toMatchObject({ studyMinutes: 60, studyMet: true });
  });

  it('contam treinos, cardios e supercardios', () => {
    const g = game(
      [
        gym('2026-10-14'),
        gym('2026-10-14'),
        cardio('2026-10-14', 'bicicleta', 60),
        cardio('2026-10-14', 'caminhada', 59),
        cardio('2026-10-14', 'pelada', 10),
        cardio('2026-10-14', 'eliptico', 90),
      ],
      at('2026-10-20'),
    );
    expect(dayOf(g, '2026-10-14')).toMatchObject({ gym: 2, cardio: 4, superCardio: 2 });
  });

  it('o supercardio segue a regra de modalidade e minutos, não o que foi gravado', () => {
    const wrong = cardio('2026-10-14', 'outro', 120);
    const g = game([{ ...wrong, data: { ...wrong.data, isSuper: true } }], at('2026-10-20'));
    expect(dayOf(g, '2026-10-14').superCardio).toBe(0);
  });
});

describe('calor do dia', () => {
  const g = game(
    [
      study('2026-10-15', 30),
      study('2026-10-16', 60),
      study('2026-10-17', 60),
      gym('2026-10-17'),
      study('2026-10-18', 120),
      study('2026-10-19', 60),
      gym('2026-10-19'),
      cardio('2026-10-19'),
      study('2026-10-08', 150),
      cardio('2026-10-08'),
      gym('2026-10-20'),
      study('2026-10-11', 60),
    ],
    at('2026-10-20'),
  );

  it('0 = passou sem estudo', () => expect(dayOf(g, '2026-10-14').heat).toBe(0));
  it('1 = estudou menos de 60', () => expect(dayOf(g, '2026-10-15').heat).toBe(1));
  it('2 = cumpriu', () => expect(dayOf(g, '2026-10-16').heat).toBe(2));
  it('3 = cumpriu + treino', () => expect(dayOf(g, '2026-10-17').heat).toBe(3));
  it('3 = cumpriu com 120 min', () => expect(dayOf(g, '2026-10-18').heat).toBe(3));
  it('4 = cumpriu + treino + cardio', () => expect(dayOf(g, '2026-10-19').heat).toBe(4));
  it('4 = 120 min + cardio', () => expect(dayOf(g, '2026-10-08').heat).toBe(4));
  it('hoje sem estudo é null, mesmo com treino', () => expect(dayOf(g, '2026-10-20').heat).toBeNull());
  it('futuro é null', () => expect(dayOf(g, '2026-10-21').heat).toBeNull());
  it('folga sem estudo é null', () => expect(dayOf(g, '2026-10-10').heat).toBeNull());
  it('folga com estudo esquenta normalmente', () => {
    expect(dayOf(g, '2026-10-11')).toMatchObject({ breakKind: 'planned', heat: 2 });
  });

  it('hoje com estudo já tem calor', () => {
    const h = game([study('2026-10-20', 20)], at('2026-10-20'));
    expect(dayOf(h, '2026-10-20').heat).toBe(1);
  });
});

describe('virada do dia às 04:00', () => {
  it('03:59 ainda é o dia anterior', () => {
    const g = game([], at('2026-10-21', '03:59'));
    expect(g.today).toBe('2026-10-20');
    expect(g.todayInfo?.date).toBe('2026-10-20');
  });

  it('04:00 já é o dia novo', () => {
    const g = game([], at('2026-10-21', '04:00'));
    expect(g.today).toBe('2026-10-21');
  });
});

describe('fase da temporada', () => {
  it('antes de 05/10', () => {
    const g = game([], at('2026-10-04'));
    expect(g).toMatchObject({ phase: 'before', dayIndex: null, todayInfo: null, currentWeek: null });
  });

  it('depois de 23/12', () => {
    const g = game([], at('2026-12-24'));
    expect(g).toMatchObject({ phase: 'after', dayIndex: null, todayInfo: null, currentWeek: null });
    expect(g.days.every((d) => !d.isFuture)).toBe(true);
  });

  it('último dia é o 80', () => {
    expect(game([], at('2026-12-23')).dayIndex).toBe(80);
  });
});
