import { describe, expect, it } from 'vitest';
import { season1 } from '@/config/season1';
import type { ForjaRecord, RescueChallengeConfig, RescueRecord, SeasonConfig } from '@/lib/types';
import { rescueAmount, rescueDraw } from './rescue';
import { at, cardio, dayOf, game, gym, perfectWeek, study, studyRange, superCardio } from './test-helpers';

// semana 3: segunda 19/10 a domingo 25/10, sem folgas; a 4 vai de 26/10 a 01/11
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
  superCardio('2026-10-23'),
];

describe('compensação de horas na semana', () => {
  it('2h num dia cobrem o dia sem estudo e o chefe cai', () => {
    const records = [
      ...studyRange(W3.start, '2026-10-21'),
      // 22/10 sem estudo
      study('2026-10-23', 120),
      ...studyRange('2026-10-24', W3.end),
      ...week3Training(),
    ];
    const g = game(records, at('2026-10-26'));
    expect(dayOf(g, '2026-10-22').dayRedeemed).toBe(true);
    expect(g.weeks[2]).toMatchObject({
      daysMet: 7,
      daysRedeemed: 1,
      minutesOwed: 0,
      shieldDays: 0,
      bossDefeated: true,
      bossRescued: false,
    });
  });

  it('dia salvo por escudo e depois compensado não impede o chefe', () => {
    const records = [
      ...studyRange('2026-10-05', '2026-10-21'),
      // 22/10 sem estudo: o escudo protege a sequência
      study('2026-10-23', 120),
      ...studyRange('2026-10-24', W3.end),
      ...week3Training(),
    ];
    const g = game(records, at('2026-10-26'));
    expect(dayOf(g, '2026-10-22')).toMatchObject({ shieldUsed: true, dayRedeemed: true });
    expect(g.weeks[2]).toMatchObject({ shieldDays: 0, daysMet: 7, bossDefeated: true });
  });

  it('minutos a mais de vários dias somam; o que não fecha um dia fica devendo', () => {
    const records = [
      study('2026-10-19', 80),
      study('2026-10-20', 80),
      study('2026-10-21', 30), // faltam 30, cobertos pelos 40 a mais
      // 22/10: faltam 60, sobram só 10
      ...studyRange('2026-10-23', W3.end),
    ];
    const g = game(records, at('2026-10-26'));
    expect(dayOf(g, '2026-10-21').dayRedeemed).toBe(true);
    expect(dayOf(g, '2026-10-22').dayRedeemed).toBe(false);
    expect(g.weeks[2]).toMatchObject({ daysMet: 6, minutesOwed: 50, surplusMinutes: 0 });
  });

  it('hoje não é compensado, mas o que passa da meta hoje já cobre ontem', () => {
    const records = [study('2026-10-19', 60), study('2026-10-21', 120)];
    const g = game(records, at('2026-10-21', '20:00'));
    expect(dayOf(g, '2026-10-20').dayRedeemed).toBe(true);
    const early = game([study('2026-10-19', 120)], at('2026-10-20', '09:00'));
    expect(dayOf(early, '2026-10-20').dayRedeemed).toBe(false);
  });

  it('não vale entre semanas', () => {
    const records = [study('2026-10-18', 180), ...studyRange('2026-10-20', W3.end)];
    const g = game(records, at('2026-10-26'));
    expect(dayOf(g, '2026-10-19').dayRedeemed).toBe(false);
  });

  it('a sequência continua contando só os dias cumpridos de fato', () => {
    const records = [study('2026-10-19', 60), study('2026-10-21', 120)];
    const g = game(records, at('2026-10-22'));
    expect(dayOf(g, '2026-10-20')).toMatchObject({ dayMet: false, dayRedeemed: true, heat: 0 });
  });
});

/** Temporada com um só desafio de resgate, para o teste saber qual vai cair. */
const only = (challenge: RescueChallengeConfig): SeasonConfig => ({ ...season1, rescue: { challenges: [challenge] } });

const rescueDone = (day: string, weekIndex: number): RescueRecord => ({
  id: `resgate-${weekIndex}`,
  seasonId: 's1',
  kind: 'rescue',
  day,
  createdAt: `${day}T15:00:00.000Z`,
  data: { weekIndex },
});

/** Semana 3 perdida: falta um treino. */
function lostWeek3(): ForjaRecord[] {
  const records = perfectWeek(3);
  records.splice(records.findIndex((r) => r.kind === 'gym'), 1);
  return records;
}

describe('evento de resgate', () => {
  it('cai num dia da semana seguinte, sempre o mesmo', () => {
    const a = rescueDraw(3, season1);
    const b = rescueDraw(3, season1);
    expect(a).toEqual(b);
    expect(a!.day >= '2026-10-26' && a!.day <= '2026-11-01').toBe(true);
    expect(season1.rescue.challenges.map((c) => c.id)).toContain(a!.challenge.id);
  });

  it('não pula folga planejada e não existe para a semana final', () => {
    for (let i = 1; i <= 11; i++) {
      const draw = rescueDraw(i, season1);
      expect(draw).not.toBeNull();
      expect(season1.plannedBreaks).not.toContain(draw!.day);
    }
    expect(rescueDraw(12, season1)).toBeNull();
  });

  it('só aparece depois que a semana fecha com o chefe de pé', () => {
    expect(game(lostWeek3(), at('2026-10-25', '20:00')).weeks[2].rescue).toBeNull();
    const g = game(lostWeek3(), at('2026-10-26'));
    expect(g.weeks[2].bossDefeated).toBe(false);
    expect(g.weeks[2].rescue).not.toBeNull();
    expect(g.rescue?.weekIndex).toBe(3);
    expect(game(perfectWeek(3), at('2026-10-26')).weeks[2].rescue).toBeNull();
  });

  it('estudo extra: 2h no dia do evento derrota o chefe e paga XP e Fundo', () => {
    const config = only({ id: 'e', title: 'Estudar {n} min a mais', description: '', kind: 'block-minutes', block: 'estudo', base: 60, step: 0 });
    const day = rescueDraw(3, config)!.day;
    const before = game(lostWeek3(), at(day), config);
    expect(before.rescue).toMatchObject({ state: 'active', progress: 0, target: 120, title: 'Estudar 60 min a mais' });
    expect(before.status.reasons.some((r) => r.includes('Evento de resgate hoje'))).toBe(true);

    const after = game([...lostWeek3(), study(day, 120)], at(day, '22:00'), config);
    expect(after.weeks[2]).toMatchObject({ bossDefeated: true, bossRescued: true });
    expect(after.weeks[2].fundCents - before.weeks[2].fundCents).toBe(season1.fund.bossCents);
    expect(after.xp.total - before.xp.total).toBeGreaterThanOrEqual(season1.xp.boss);
  });

  it('1h de cardio: soma os cardios do dia', () => {
    const config = only({ id: 'c', title: '{n} min de cardio', description: '', kind: 'cardio-minutes', base: 60, step: 0 });
    const day = rescueDraw(3, config)!.day;
    const g = game([...lostWeek3(), cardio(day, 'eliptico', 30), cardio(day, 'outro', 30)], at(day), config);
    expect(g.weeks[2].bossRescued).toBe(true);
  });

  it('nenhum desafio é rotina: o cardio pede mais que o supercardio de 1h', () => {
    const kinds = season1.rescue.challenges.map((c) => c.kind);
    expect(kinds).not.toContain('gym-cardio');
    for (const c of season1.rescue.challenges) {
      if (c.kind === 'cardio-minutes') expect(rescueAmount(c, 1)).toBeGreaterThan(season1.cardio.superMinutes);
    }
  });

  it('cardio do nível: 60 min não bastam quando o nível pede mais', () => {
    const config = only({ id: 'c', title: '{n} min de cardio', description: '', kind: 'cardio-minutes', base: 90, step: 6 });
    const day = rescueDraw(3, config)!.day;
    // semana 3: 90 + 2 × 6 = 102 min
    const short = game([...lostWeek3(), superCardio(day)], at(day), config);
    expect(short.rescue).toMatchObject({ amount: 102, state: 'active', progressLabel: '60 de 102 min' });
    const full = game([...lostWeek3(), superCardio(day), cardio(day, 'outro', 42)], at(day), config);
    expect(full.weeks[2].bossRescued).toBe(true);
  });

  it('fica mais difícil a cada semana do mapa, até o teto', () => {
    const byId = (id: string) => season1.rescue.challenges.find((c) => c.id === id)!;
    for (const c of season1.rescue.challenges) {
      const amounts = Array.from({ length: 11 }, (_, i) => rescueAmount(c, i + 1));
      for (let i = 1; i < amounts.length; i++) expect(amounts[i]).toBeGreaterThanOrEqual(amounts[i - 1]);
      expect(amounts[10]).toBeGreaterThan(amounts[0]);
    }
    expect(rescueAmount(byId('prospeccao'), 1)).toBe(20);
    expect(rescueAmount(byId('prospeccao'), 11)).toBe(60);
    expect(rescueAmount(byId('estudo-extra'), 1)).toBe(60);
    expect(rescueAmount(byId('estudo-extra'), 11)).toBe(180);
  });

  it('o evento mostra o nível e a quantidade no texto', () => {
    const config = only({ id: 'p', title: 'Prospectar {n} clientes', description: 'Aborde {n}.', kind: 'manual', base: 20, step: 4 });
    const day = rescueDraw(3, config)!.day;
    const g = game(lostWeek3(), at(day), config);
    expect(g.rescue).toMatchObject({ level: 3, tier: 'fácil', amount: 28, title: 'Prospectar 28 clientes', description: 'Aborde 28.' });
  });

  it('desafio manual: vale com o "Concluí" no dia do evento', () => {
    const config = only({ id: 'p', title: 'Prospectar {n} clientes', description: '', kind: 'manual', base: 20, step: 4 });
    const day = rescueDraw(3, config)!.day;
    const g = game([...lostWeek3(), rescueDone(day, 3)], at(day), config);
    expect(g.rescue).toMatchObject({ state: 'done', recordId: 'resgate-3' });
    expect(g.weeks[2].bossDefeated).toBe(true);
  });

  it('passou o dia sem cumprir: o chefe fica de pé', () => {
    const config = only({ id: 'p', title: 'Prospectar {n} clientes', description: '', kind: 'manual', base: 20, step: 4 });
    const g = game(lostWeek3(), at('2026-11-02'), config);
    expect(g.weeks[2].rescue?.state).toBe('missed');
    expect(g.weeks[2].bossDefeated).toBe(false);
  });

  it('antes do dia, o evento fica para depois', () => {
    const config = only({ id: 'p', title: 'Prospectar {n} clientes', description: '', kind: 'manual', base: 20, step: 4 });
    const day = rescueDraw(3, config)!.day;
    if (day > '2026-10-26') expect(game(lostWeek3(), at('2026-10-26'), config).rescue?.state).toBe('upcoming');
  });
});
