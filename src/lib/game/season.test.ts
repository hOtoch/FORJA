import { describe, expect, it } from 'vitest';
import { season1 } from '@/config/season1';
import { timerStart } from '@/lib/timer';
import type { ForjaRecord } from '@/lib/types';
import { at, dayOf, deposit, game, perfectSeason } from './test-helpers';

describe('temporada perfeita', () => {
  const g = game(perfectSeason(60), at('2026-12-24'));

  it('fecha a temporada', () => {
    expect(g).toMatchObject({ today: '2026-12-24', phase: 'after', dayIndex: null, currentWeek: null, todayInfo: null });
    expect(g.weeks.every((w) => w.isClosed)).toBe(true);
  });

  it('o Fundo dá exatamente R$ 1.500', () => {
    expect(g.fund.earnedCents).toBe(150000);
    expect(g.fund.perfectCents).toBe(150000);
    expect(g.fund.pending).toHaveLength(12);
    expect(g.fund.pending.reduce((s, p) => s + p.amountCents, 0)).toBe(150000);
  });

  it('a nota final é S', () => {
    expect(g.grade).toEqual({ studyPct: 100, gymPct: 100, cardioPct: 100, totalPct: 100, letter: 'S', isFinal: true });
  });

  it('derrota os 12 chefes', () => {
    expect(g.weeks.filter((w) => w.bossDefeated)).toHaveLength(12);
  });

  it('mantém a sequência inteira e os escudos', () => {
    expect(g.streak).toEqual({ current: 76, best: 76, shields: 2 });
    expect(g.days.some((d) => d.shieldUsed)).toBe(false);
  });

  it('soma o XP esperado', () => {
    // estudo 76 × 60, treinos 46 × 60, cardios 11 × (4 × 20 + 60) + 2 × 20, chefes 12 × 100
    expect(g.xp.total).toBe(4560 + 2760 + 1580 + 1200);
    expect(g.xp).toMatchObject({ level: 13, title: 'Mestre ferreiro' });
  });

  it('abre os 5 baús', () => {
    expect(g.chests.map((c) => [c.id, c.state, c.openedOn])).toEqual([
      [1, 'opened', '2026-10-11'],
      [2, 'opened', '2026-10-29'],
      [3, 'opened', '2026-11-13'],
      [4, 'opened', '2026-11-27'],
      [5, 'opened', '2026-12-23'],
    ]);
  });

  it('com 2 horas de estudo por dia passa do nível 15', () => {
    const h = game(perfectSeason(120), at('2026-12-24'));
    expect(h.xp.level).toBeGreaterThanOrEqual(15);
    expect(h.xp.title).toBe('Lenda da forja');
    expect(h.fund.earnedCents).toBe(150000);
  });
});

describe('temporada com falhas', () => {
  // perfeita, menos: 2 dias seguidos sem estudo na semana 4 (28 e 29/10), 1 dia isolado na semana 7
  // (18/11), 2 treinos a menos na semana 9 e o supercardio trocado por cardio comum na semana 10
  const records: ForjaRecord[] = perfectSeason(60)
    .filter((r) => !(r.kind === 'study' && ['2026-10-28', '2026-10-29', '2026-11-18'].includes(r.day)))
    .filter((r) => !(r.kind === 'gym' && (r.day === '2026-11-30' || r.day === '2026-12-01')))
    .map((r) =>
      r.kind === 'cardio' && r.day === '2026-12-07' ? { ...r, data: { ...r.data, modality: 'esteira', minutes: 30, isSuper: false } } : r,
    );
  records.push(deposit('2026-10-12', 1, 12000));

  const g = game(records, at('2026-12-24'));

  it('usa o escudo no primeiro dia e quebra no segundo', () => {
    expect(dayOf(g, '2026-10-28').shieldUsed).toBe(true);
    expect(dayOf(g, '2026-10-29').shieldUsed).toBe(false);
    expect(dayOf(g, '2026-11-18').shieldUsed).toBe(true);
  });

  it('perde os chefes das semanas com falha', () => {
    const lost = g.weeks.filter((w) => !w.bossDefeated).map((w) => w.index);
    expect(lost).toEqual([4, 7, 9, 10]);
  });

  it('calcula a sequência a partir da quebra', () => {
    // a sequência recomeça em 30/10 e vai até 23/12 (escudo em 18/11 mantém)
    const studyDaysFrom30 = g.days.filter((d) => d.date >= '2026-10-30' && !d.breakKind && d.date !== '2026-11-18').length;
    expect(g.streak.current).toBe(studyDaysFrom30);
    expect(g.streak.best).toBe(studyDaysFrom30);
  });

  it('desconta o Fundo e a nota', () => {
    // −3 dias de estudo (R$ 15), −2 treinos (R$ 20), −1 cardio sem super na semana 10 (R$ 5), −4 chefes (R$ 120)
    expect(g.fund.earnedCents).toBe(150000 - 1500 - 2000 - 500 - 12000);
    expect(g.fund.depositedCents).toBe(12000);
    expect(g.fund.pending.map((p) => p.weekIndex)).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(g.grade.studyPct).toBeCloseTo((73 / 76) * 100, 10);
    expect(g.grade.gymPct).toBeCloseTo((44 / 46) * 100, 10);
    expect(g.grade.cardioPct).toBeCloseTo((56 / 57) * 100, 10);
    expect(g.grade.letter).toBe('S');
  });

  it('a soma dos dias bate com o Fundo e com o XP', () => {
    expect(g.days.reduce((s, d) => s + d.fundCents, 0)).toBe(g.fund.earnedCents);
    expect(g.days.reduce((s, d) => s + d.xp, 0)).toBe(g.xp.total);
  });
});

describe('estado no meio da temporada', () => {
  it('monta o painel com timer em andamento', () => {
    const now = at('2026-10-21', '15:00');
    const timer = timerStart('desenvolvimento-assistido-por-ia', false, at('2026-10-21', '14:30'));
    const g = game(perfectSeason(60).filter((r) => r.day < '2026-10-21'), now, season1, timer);
    expect(g).toMatchObject({ today: '2026-10-21', phase: 'active', dayIndex: 17 });
    expect(g.currentWeek?.index).toBe(3);
    expect(g.todayInfo?.date).toBe('2026-10-21');
    expect(g.timer).toMatchObject({ creditedMs: 30 * 60_000, awaitingPresence: false, pendingMs: 0, capped: false });
    expect(g.status.studyDone).toBe(false);
    expect(g.now).toBe(now.toISOString());
  });

  it('sem timer, timer é null', () => {
    expect(game([], at('2026-10-21')).timer).toBeNull();
  });
});
