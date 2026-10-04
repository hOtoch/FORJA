import { describe, expect, it } from 'vitest';
import { season1 } from '@/config/season1';
import {
  timerAwaitingPresence,
  timerConfirmPresence,
  timerCreditedMs,
  timerPause,
  timerPendingMs,
  timerResume,
  timerStart,
  timerStop,
  timerView,
} from './timer';

const cfg = season1.timer;
const MIN = 60_000;
const at = (iso: string) => new Date(iso);
const plus = (base: string, minutes: number) => new Date(Date.parse(base) + minutes * MIN);
const T0 = '2026-10-12T14:00:00-03:00';
const ids = () => 'id-fixo';

describe('timer: início e contagem', () => {
  it('começa correndo, com início, retomada e confirmação no mesmo instante', () => {
    const t = timerStart('desenvolvimento-assistido-por-ia', false, at(T0));
    expect(t.accumulatedMs).toBe(0);
    expect(t.runningSince).toBe(t.startedAt);
    expect(t.lastConfirmAt).toBe(t.startedAt);
    expect(t.pomodoro).toBe(false);
    expect(timerCreditedMs(t, plus(T0, 30), cfg)).toBe(30 * MIN);
  });

  it('para de creditar aos 50 min sem confirmação e o resto fica pendente', () => {
    const t = timerStart('x', false, at(T0));
    const now = plus(T0, 70);
    expect(timerAwaitingPresence(t, plus(T0, 50), cfg)).toBe(false);
    expect(timerAwaitingPresence(t, now, cfg)).toBe(true);
    expect(timerCreditedMs(t, now, cfg)).toBe(50 * MIN);
    expect(timerPendingMs(t, now, cfg)).toBe(20 * MIN);
    const view = timerView(t, now, cfg);
    expect(view).toMatchObject({ creditedMs: 50 * MIN, awaitingPresence: true, pendingMs: 20 * MIN, capped: false });
  });
});

describe('timer: presença', () => {
  it('confirmando com countGap credita o intervalo inteiro', () => {
    const t = timerStart('x', false, at(T0));
    const c = timerConfirmPresence(t, true, plus(T0, 70), cfg);
    expect(c.accumulatedMs).toBe(70 * MIN);
    expect(c.runningSince).toBe(plus(T0, 70).toISOString());
    expect(c.lastConfirmAt).toBe(plus(T0, 70).toISOString());
    expect(timerCreditedMs(c, plus(T0, 80), cfg)).toBe(80 * MIN);
  });

  it('confirmando sem countGap credita só até o limite de 50 min', () => {
    const t = timerStart('x', false, at(T0));
    const c = timerConfirmPresence(t, false, plus(T0, 70), cfg);
    expect(c.accumulatedMs).toBe(50 * MIN);
    expect(timerCreditedMs(c, plus(T0, 80), cfg)).toBe(60 * MIN);
    expect(timerAwaitingPresence(c, plus(T0, 80), cfg)).toBe(false);
  });

  it('confirmar antes do limite só renova a última confirmação', () => {
    const t = timerStart('x', false, at(T0));
    const c = timerConfirmPresence(t, false, plus(T0, 40), cfg);
    expect(c.accumulatedMs).toBe(0);
    expect(c.runningSince).toBe(t.runningSince);
    expect(c.lastConfirmAt).toBe(plus(T0, 40).toISOString());
    // a nova presença vale até 40 + 50 = 90 min
    expect(timerCreditedMs(c, plus(T0, 85), cfg)).toBe(85 * MIN);
    expect(timerCreditedMs(c, plus(T0, 100), cfg)).toBe(90 * MIN);
  });
});

describe('timer: pausa e retomada', () => {
  it('pausa credita o trecho e não conta o tempo parado', () => {
    const t = timerStart('x', true, at(T0));
    const p = timerPause(t, plus(T0, 25), cfg);
    expect(p.runningSince).toBeNull();
    expect(p.accumulatedMs).toBe(25 * MIN);
    expect(timerCreditedMs(p, plus(T0, 30), cfg)).toBe(25 * MIN);
    expect(timerAwaitingPresence(p, plus(T0, 200), cfg)).toBe(false);

    const r = timerResume(p, plus(T0, 30));
    expect(r.runningSince).toBe(plus(T0, 30).toISOString());
    expect(r.lastConfirmAt).toBe(plus(T0, 30).toISOString());
    expect(timerCreditedMs(r, plus(T0, 55), cfg)).toBe(50 * MIN);
  });

  it('pausa depois do limite de presença só credita até o limite', () => {
    const t = timerStart('x', false, at(T0));
    const p = timerPause(t, plus(T0, 90), cfg);
    expect(p.accumulatedMs).toBe(50 * MIN);
  });

  it('pausar pausado e retomar correndo não mudam nada', () => {
    const t = timerStart('x', false, at(T0));
    expect(timerResume(t, plus(T0, 10))).toBe(t);
    const p = timerPause(t, plus(T0, 10), cfg);
    expect(timerPause(p, plus(T0, 20), cfg)).toBe(p);
  });
});

describe('timer: teto de 3 horas', () => {
  it('não credita além de 180 min', () => {
    let t = timerStart('x', false, at(T0));
    t = timerConfirmPresence(t, false, plus(T0, 45), cfg);
    t = timerConfirmPresence(t, false, plus(T0, 90), cfg);
    t = timerConfirmPresence(t, false, plus(T0, 135), cfg);
    t = timerConfirmPresence(t, false, plus(T0, 175), cfg);
    const view = timerView(t, plus(T0, 200), cfg);
    expect(view.creditedMs).toBe(180 * MIN);
    expect(view.capped).toBe(true);
  });

  it('countGap também respeita o teto', () => {
    const t = timerStart('x', false, at(T0));
    const now = plus(T0, 300);
    expect(timerPendingMs(t, now, cfg)).toBe(130 * MIN);
    const c = timerConfirmPresence(t, true, now, cfg);
    expect(c.accumulatedMs).toBe(180 * MIN);
  });
});

describe('timer: encerrar', () => {
  it('grava os minutos com floor, no dia em que a sessão começou', () => {
    const start = '2026-10-13T03:30:00-03:00'; // dia do jogo 12/10
    let t = timerStart('desenvolvimento-assistido-por-ia', false, at(start));
    t = timerConfirmPresence(t, false, plus(start, 45), cfg);
    const end = new Date(Date.parse(start) + 60 * MIN + 59_000); // 04:30:59
    const rec = timerStop(t, [991, 992], false, end, season1, ids);
    expect(rec).not.toBeNull();
    expect(rec).toMatchObject({
      id: 'id-fixo',
      seasonId: 's1',
      kind: 'study',
      day: '2026-10-12',
      createdAt: end.toISOString(),
      data: {
        courseSlug: 'desenvolvimento-assistido-por-ia',
        minutes: 60,
        source: 'timer',
        startedAt: t.startedAt,
        endedAt: end.toISOString(),
        lessonIds: [991, 992],
      },
    });
  });

  it('com countGap no encerramento conta o intervalo pendente', () => {
    const t = timerStart('x', false, at(T0));
    expect(timerStop(t, [], false, plus(T0, 80), season1, ids)?.data.minutes).toBe(50);
    expect(timerStop(t, [], true, plus(T0, 80), season1, ids)?.data.minutes).toBe(80);
  });

  it('limita a 180 min', () => {
    const t = timerStart('x', false, at(T0));
    expect(timerStop(t, [], true, plus(T0, 400), season1, ids)?.data.minutes).toBe(180);
  });

  it('sessão com menos de 1 minuto não grava nada', () => {
    const t = timerStart('x', false, at(T0));
    expect(timerStop(t, [], false, new Date(Date.parse(T0) + 59_000), season1, ids)).toBeNull();
  });
});
