import { describe, expect, it } from 'vitest';
import { season1 } from '@/config/season1';
import { addDays, seasonDays } from '@/lib/time';
import type { ForjaRecord, GameState } from '@/lib/types';
import { at, cardio, game, gym, perfectSeason, perfectWeek, study, studyRange } from './test-helpers';

const chest = (g: GameState, id: number) => {
  const c = g.chests.find((x) => x.id === id);
  if (!c) throw new Error(`baú ${id} não existe`);
  return c;
};

/** Estudo de 60 min em todos os dias não-folga até `to`. */
const studyEveryDayUntil = (to: string): ForjaRecord[] =>
  seasonDays(season1)
    .filter((d) => d <= to && !season1.plannedBreaks.includes(d))
    .map((d) => study(d, 60));

describe('baús', () => {
  it('começam os 5 trancados, com condição e prêmio', () => {
    const g = game([], at('2026-10-05'));
    expect(g.chests).toHaveLength(5);
    for (const c of g.chests) {
      expect(c.state).toBe('locked');
      expect(c.openedOn).toBeNull();
      expect(c.condition).toBeTruthy();
      expect(c.prize).toBeTruthy();
    }
  });

  describe('baú 1: primeiro chefe', () => {
    it('abre na data de fim da primeira semana com chefe derrotado', () => {
      const g = game([...perfectWeek(3), ...perfectWeek(5)], at('2026-11-10'));
      expect(chest(g, 1)).toMatchObject({ state: 'opened', openedOn: '2026-10-25' });
    });

    it('chefe que cai antes do fim da semana (resto de folga) abre hoje', () => {
      const g = game(perfectWeek(1), at('2026-10-09', '20:00'));
      expect(g.currentWeek?.bossDefeated).toBe(true);
      expect(chest(g, 1)).toMatchObject({ state: 'opened', openedOn: '2026-10-09' });
      expect(chest(game(perfectWeek(1), at('2026-10-12')), 1).openedOn).toBe('2026-10-11');
    });

    it('fica trancado sem chefe derrotado', () => {
      expect(chest(game(studyRange('2026-10-05', '2026-10-20'), at('2026-10-27')), 1).state).toBe('locked');
    });
  });

  describe('baú 2: sequência de 21', () => {
    it('abre no dia em que a sequência chega a 21', () => {
      // 05 a 09/10 (5) + folgas + 14 a 29/10 (16) = 21
      const g = game(studyEveryDayUntil('2026-10-29'), at('2026-11-01'));
      expect(chest(g, 2)).toMatchObject({ state: 'opened', openedOn: '2026-10-29' });
    });

    it('com 20 fica trancado', () => {
      const g = game(studyEveryDayUntil('2026-10-28'), at('2026-10-29'));
      expect(g.streak.current).toBe(20);
      expect(chest(g, 2).state).toBe('locked');
    });

    it('conta hoje quando já cumprido', () => {
      const g = game(studyEveryDayUntil('2026-10-29'), at('2026-10-29', '22:00'));
      expect(chest(g, 2)).toMatchObject({ state: 'opened', openedOn: '2026-10-29' });
    });
  });

  describe('baú 3: nota prevista A ou melhor em 13/11', () => {
    const goodUntilMid = () => [1, 2, 3, 4, 5].flatMap((w) => perfectWeek(w)).concat(studyRange('2026-11-09', '2026-11-13'));

    it('fica trancado enquanto 13/11 não fechou', () => {
      expect(chest(game(goodUntilMid(), at('2026-11-13', '23:00')), 3).state).toBe('locked');
    });

    it('abre se a nota prevista até 13/11 for S ou A', () => {
      // a semana 6 está em andamento: nada depois de 13/11 muda o baú
      const g = game(goodUntilMid(), at('2026-11-20'));
      expect(chest(g, 3)).toMatchObject({ state: 'opened', openedOn: '2026-11-13' });
    });

    it('falha se a nota prevista até 13/11 for B ou C', () => {
      const g = game(studyEveryDayUntil('2026-11-13'), at('2026-11-14'));
      expect(chest(g, 3)).toMatchObject({ state: 'failed', openedOn: null });
    });
  });

  describe('baú 4: 50 horas de estudo', () => {
    it('abre no dia em que o estudo da temporada chega a 3.000 min', () => {
      const records = [study('2026-10-03', 600), ...studyRange('2026-10-05', '2026-11-30', 120)];
      const g = game(records, at('2026-12-01'));
      // 25 dias × 120 = 3.000; o estudo de 03/10 (fora da temporada) não conta
      expect(chest(g, 4)).toMatchObject({ state: 'opened', openedOn: addDays('2026-10-05', 24) });
    });

    it('com 2.999 min fica trancado', () => {
      const g = game([...studyRange('2026-10-05', '2026-10-28', 120), study('2026-10-29', 119)], at('2026-10-30'));
      expect(chest(g, 4).state).toBe('locked');
    });
  });

  describe('baú 5: nota final em 23/12', () => {
    it('fica trancado até 23/12 fechar', () => {
      expect(chest(game(perfectSeason(), at('2026-12-23', '23:00')), 5).state).toBe('locked');
    });

    it('com S abre com o prêmio de S', () => {
      const g = game(perfectSeason(), at('2026-12-24'));
      expect(chest(g, 5)).toMatchObject({
        state: 'opened',
        openedOn: '2026-12-23',
        prize: 'R$ 300 a mais para uma experiência no Réveillon',
      });
    });

    it('com A abre com o prêmio de A', () => {
      // sem cardio em 5 semanas: cardio = 32/57 → média ≈ 85,4
      const records = perfectSeason().filter((r) => !(r.kind === 'cardio' && r.day < '2026-11-09'));
      const g = game(records, at('2026-12-24'));
      expect(g.grade.letter).toBe('A');
      expect(chest(g, 5)).toMatchObject({ state: 'opened', prize: 'R$ 150 a mais para o Réveillon' });
    });

    it('com B ou C fica "failed" com a nota "Só o Fundo"', () => {
      const records = [...studyEveryDayUntil('2026-12-23'), gym('2026-10-05'), cardio('2026-10-05')];
      const g = game(records, at('2026-12-24'));
      expect(['B', 'C']).toContain(g.grade.letter);
      expect(chest(g, 5)).toMatchObject({ state: 'failed', openedOn: null, note: 'Só o Fundo' });
    });
  });
});
