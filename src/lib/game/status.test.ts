import { describe, expect, it } from 'vitest';
import { at, game, gym, reserveBreak, study, studyRange, superCardio } from './test-helpers';

describe('status do dia', () => {
  it('estudo de hoje pendente: diz quanto falta', () => {
    const g = game([...studyRange('2026-10-14', '2026-10-15'), study('2026-10-16', 35)], at('2026-10-16', '21:00'));
    expect(g.status.studyDone).toBe(false);
    expect(g.status.reasons).toContain('Faltam 25 min de estudo hoje.');
  });

  it('estudo cumprido hoje', () => {
    const g = game([study('2026-10-16', 60)], at('2026-10-16', '21:00'));
    expect(g.status.studyDone).toBe(true);
    expect(g.status.reasons.some((r) => r.includes('estudo'))).toBe(false);
  });

  it('folga planejada ou de reserva conta como feito', () => {
    expect(game([], at('2026-10-11', '21:00')).status.studyDone).toBe(true);
    expect(game([reserveBreak('2026-10-20')], at('2026-10-20', '21:00')).status.studyDone).toBe(true);
  });

  it('fora da temporada não cobra nada', () => {
    expect(game([], at('2026-10-04', '21:00')).status).toEqual({ studyDone: true, weekAtRisk: false, reasons: [] });
    expect(game([], at('2026-12-24', '21:00')).status).toEqual({ studyDone: true, weekAtRisk: false, reasons: [] });
  });

  it('sábado com 2 treinos faltando: semana em risco', () => {
    const records = [study('2026-10-24', 60), gym('2026-10-19'), gym('2026-10-21'), superCardio('2026-10-20')];
    const g = game(records, at('2026-10-24', '21:00'));
    expect(g.status).toEqual({
      studyDone: true,
      weekAtRisk: true,
      reasons: ['Faltam 2 treinos e restam 2 dias na semana.'],
    });
  });

  it('sexta com 2 treinos faltando e 3 dias pela frente: sem risco', () => {
    const records = [study('2026-10-23', 60), gym('2026-10-19'), gym('2026-10-21')];
    expect(game(records, at('2026-10-23', '21:00')).status.weekAtRisk).toBe(false);
  });

  it('domingo com 1 treino faltando: frase no singular', () => {
    const records = [study('2026-10-25', 60), gym('2026-10-19'), gym('2026-10-20'), gym('2026-10-21'), superCardio('2026-10-20')];
    const g = game(records, at('2026-10-25', '21:00'));
    expect(g.status.reasons).toEqual(['Falta 1 treino e resta 1 dia na semana.']);
  });

  it('sem supercardio a partir de sábado: semana em risco', () => {
    const treinos = ['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22'].map((d) => gym(d));
    const friday = game([study('2026-10-23', 60), ...treinos], at('2026-10-23', '21:00'));
    expect(friday.status.weekAtRisk).toBe(false);
    const saturday = game([study('2026-10-24', 60), ...treinos], at('2026-10-24', '21:00'));
    expect(saturday.status).toEqual({ studyDone: true, weekAtRisk: true, reasons: ['Falta o supercardio da semana.'] });
  });

  it('na semana final o supercardio não é exigido', () => {
    const records = [study('2026-12-23', 60), gym('2026-12-21'), gym('2026-12-22')];
    expect(game(records, at('2026-12-23', '21:00')).status.weekAtRisk).toBe(false);
  });

  it('junta estudo e semana nas razões', () => {
    const g = game([study('2026-10-23', 60), gym('2026-10-19'), gym('2026-10-20')], at('2026-10-24', '21:00'));
    expect(g.status.studyDone).toBe(false);
    expect(g.status.weekAtRisk).toBe(true);
    expect(g.status.reasons).toEqual([
      'Faltam 60 min de estudo hoje.',
      'Faltam 2 treinos e restam 2 dias na semana.',
      'Falta o supercardio da semana.',
    ]);
  });
});
