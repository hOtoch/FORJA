'use client';

// Fundo Réveillon: valor em ouro velho, medidor, depósito pendente e selos de cera.

import { useTransition } from 'react';
import { confirmDeposit } from '@/app/actions';
import { formatBRL } from '@/lib/cardio';
import type { GameState } from '@/lib/types';
import { runAction, useToast } from './feedback';
import { WaxSealIcon } from './icons';

export function FundPanel({ state, onOpenClient }: { state: GameState; onOpenClient: () => void }) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const f = state.fund;
  const due = f.pending[0];
  const pct = f.perfectCents > 0 ? Math.min(100, (f.earnedCents / f.perfectCents) * 100) : 0;
  const sealed = state.weeks.filter((w) => w.depositedCents !== null);

  function deposit(weekIndex: number) {
    startTransition(async () => {
      const r = await runAction(() => confirmDeposit(weekIndex), 'O depósito');
      if (!r.ok) toast(r.error, { tone: 'error' });
      else toast('Depósito confirmado', { seal: true });
    });
  }

  return (
    <section aria-labelledby="fundo-titulo" className="min-w-0">
      <h2 id="fundo-titulo" className="flex h-10 items-end font-gothic text-title font-bold">
        Fundo Réveillon
      </h2>
      <p className="mt-3 flex flex-wrap items-baseline gap-x-2">
        <span className="font-roman text-display-m font-bold text-money num">{formatBRL(f.earnedCents)}</span>
        <span className="text-body text-muted num">de {formatBRL(f.perfectCents)}</span>
      </p>
      <div className="rail mt-2" aria-hidden="true">
        <span style={{ width: `${pct}%`, background: 'var(--money)' }} />
      </div>
      <p className="mt-2 text-small text-muted num">
        {formatBRL(f.depositedCents)} depositados
        {f.clientBonusCents > 0 ? `, com ${formatBRL(f.clientBonusCents)} de clientes` : ''}.
      </p>

      {due ? (
        <div className="mt-3">
          <p className="text-body">
            Depositar <span className="font-bold text-money num">{formatBRL(due.amountCents)}</span> da semana{' '}
            {due.weekIndex}
          </p>
          <button
            type="button"
            className="btn btn-outline mt-2"
            disabled={pending}
            onClick={() => deposit(due.weekIndex)}
          >
            Marcar como depositado
          </button>
          {f.pending.length > 1 ? (
            <p className="mt-1 text-small text-muted">
              Mais {f.pending.length - 1} {f.pending.length === 2 ? 'semana espera' : 'semanas esperam'} depósito.
            </p>
          ) : null}
        </div>
      ) : (
        <p className="mt-3 text-body">Nenhum depósito pendente.</p>
      )}

      {sealed.length > 0 ? (
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-small text-muted">Depósitos selados:</span>
          <ul className="flex flex-wrap items-center gap-x-2">
            {sealed.map((w) => (
              <li key={w.index} className="flex items-center gap-0.5 text-small font-medium num">
                <WaxSealIcon size={18} />
                <span className="sr-only">Semana </span>
                {w.index}
                <span className="sr-only">, {formatBRL(w.depositedCents ?? 0)} depositados</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <button type="button" className="link mt-2 text-small" onClick={onOpenClient}>
        Registrar cliente fechado
      </button>
    </section>
  );
}
