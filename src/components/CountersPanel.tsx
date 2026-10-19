'use client';

// Contadores da semana (candidaturas, contatos de prospecção, posts no LinkedIn): quanto foi feito
// hoje e na semana, contra a meta semanal que o chefe pede, com botões de soma rápida.

import { useTransition } from 'react';
import { addCount } from '@/app/actions';
import { season } from '@/config/season';
import type { GameState } from '@/lib/types';
import { runAction, useToast } from './feedback';
import { counterAmount } from './format';
import { Meter } from './viz';

export function CountersPanel({ state }: { state: GameState }) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const week = state.currentWeek;
  const today = state.todayInfo;
  if (season.counters.length === 0) return null;

  function add(counter: string, amount: number) {
    startTransition(async () => {
      const r = await runAction(() => addCount({ day: state.today, counter, amount }), 'O contador');
      if (!r.ok) toast(r.error, { tone: 'error' });
      else toast(`+${counterAmount(counter, amount)}`);
    });
  }

  return (
    <section aria-labelledby="contadores-titulo" className="card">
      <div className="card-head">
        <h2 id="contadores-titulo" className="card-title">
          Caçada da semana
        </h2>
        <span className="card-meta">o chefe pede as três metas</span>
      </div>
      <ul className="space-y-4">
        {season.counters.map((c) => {
          const w = week?.counters.find((x) => x.id === c.id);
          const count = w?.count ?? 0;
          const target = w?.target ?? c.weekTarget;
          const todayCount = today?.counts[c.id] ?? 0;
          const done = count >= target;
          return (
            <li key={c.id}>
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                <div className="min-w-0">
                  <p className="text-body font-bold">{c.name}</p>
                  <p className="text-small text-muted num">
                    {count} de {target} na semana{done ? ' ✓' : ''}
                    {todayCount > 0 ? `, ${todayCount} hoje` : ''}
                  </p>
                </div>
                <div className="flex gap-2">
                  {c.steps.map((n) => (
                    <button
                      key={n}
                      type="button"
                      className="btn btn-outline h-9 px-3 num"
                      disabled={pending || state.phase !== 'active'}
                      onClick={() => add(c.id, n)}
                      aria-label={`Somar ${counterAmount(c.id, n)}`}
                    >
                      +{n}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-2">
                <Meter
                  value={Math.min(count, target)}
                  max={Math.max(target, 1)}
                  size="sm"
                  color={done ? 'var(--money)' : undefined}
                  label={`${c.name}: ${count} de ${target} na semana`}
                />
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-small text-muted">
        Errou a conta? Abra o dia na barra da temporada e desfaça o registro.
      </p>
    </section>
  );
}
