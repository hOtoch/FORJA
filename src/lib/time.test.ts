import { describe, expect, it } from 'vitest';
import { season1 } from '@/config/season1';
import { addDays, daysBetween, gameDay, longDate, seasonDays, seasonWeeks, weekdayOf } from './time';

describe('gameDay', () => {
  it('vira o dia às 04:00 de Brasília', () => {
    expect(gameDay('2026-10-06T03:59:00-03:00')).toBe('2026-10-05');
    expect(gameDay('2026-10-06T04:00:00-03:00')).toBe('2026-10-06');
    expect(gameDay('2026-10-05T23:30:00-03:00')).toBe('2026-10-05');
  });

  it('não depende do fuso da máquina', () => {
    // 2026-10-06 06:59 UTC = 03:59 em Brasília
    expect(gameDay('2026-10-06T06:59:00Z')).toBe('2026-10-05');
  });
});

describe('calendário da temporada', () => {
  it('tem 80 dias', () => {
    const days = seasonDays(season1);
    expect(days).toHaveLength(80);
    expect(days[0]).toBe('2026-10-05');
    expect(days[79]).toBe('2026-12-23');
  });

  it('tem 11 semanas cheias e uma final de 3 dias', () => {
    const weeks = seasonWeeks(season1);
    expect(weeks).toHaveLength(12);
    expect(weeks[0]).toMatchObject({ index: 1, start: '2026-10-05', end: '2026-10-11', isFinal: false });
    expect(weeks.slice(0, 11).every((w) => w.days.length === 7)).toBe(true);
    expect(weeks[11]).toMatchObject({ index: 12, start: '2026-12-21', end: '2026-12-23', isFinal: true });
  });
});

describe('utilitários de data', () => {
  it('soma dias atravessando meses', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(daysBetween('2026-10-05', '2026-12-23')).toBe(79);
  });

  it('dia da semana começa na segunda', () => {
    expect(weekdayOf('2026-10-05')).toBe(1);
    expect(weekdayOf('2026-10-11')).toBe(7);
  });

  it('escreve a data por extenso', () => {
    expect(longDate('2026-10-12')).toBe('segunda, 12 de outubro');
  });
});
