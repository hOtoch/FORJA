'use client';

// Fundo Réveillon (revisão 2): bolsa de moedas, valor ganho contra o perfeito, o depósito
// pendente em destaque e os selos de cera das semanas depositadas.

import { useTransition } from 'react';
import { confirmDeposit } from '@/app/actions';
import { formatBRL } from '@/lib/cardio';
import type { GameState } from '@/lib/types';
import { PouchArt } from './art';
import { runAction, useToast } from './feedback';
import { WaxSealIcon } from './icons';
import { Meter } from './viz';

export function FundPanel({ state, onOpenClient }: { state: GameState; onOpenClient: () => void }) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const f = state.fund;
  const due = f.pending[0];
  const sealed = state.weeks.filter((w) => w.depositedCents !== null);

  function deposit(weekIndex: number) {
    startTransition(async () => {
      const r = await runAction(() => confirmDeposit(weekIndex), 'O depósito');
      if (!r.ok) toast(r.error, { tone: 'error' });
      else toast('Depósito confirmado', { seal: true });
    });
  }

  return (
    <section aria-labelledby="fundo-titulo" className="card">
      <div className="card-head">
        <h2 id="fundo-titulo" className="card-title">
          Fundo Réveillon
        </h2>
        <span className="card-meta">viagem de 28/12</span>
      </div>

      <div className="flex items-center gap-4">
        <PouchArt size={88} />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-baseline gap-x-2">
            <span className="figure text-[2rem] leading-9 text-money">{formatBRL(f.earnedCents)}</span>
            <span className="text-body text-muted num">de {formatBRL(f.perfectCents)}</span>
          </p>
          <div className="mt-2">
            <Meter
              value={f.earnedCents}
              max={f.perfectCents}
              color="var(--money)"
              label={`${formatBRL(f.earnedCents)} de ${formatBRL(f.perfectCents)} ganhos`}
            />
          </div>
          <p className="mt-1 text-small text-muted num">
            {formatBRL(f.depositedCents)} já no cofrinho
            {f.clientBonusCents > 0 ? `, ${formatBRL(f.clientBonusCents)} de clientes` : ''}
          </p>
        </div>
      </div>

      {due ? (
        <div className="tile mt-4 flex-wrap justify-between">
          <p className="text-body">
            Depositar <span className="font-bold text-money num">{formatBRL(due.amountCents)}</span>
            <span className="text-muted"> da semana {due.weekIndex}</span>
            {f.pending.length > 1 ? <span className="text-muted num"> (+{f.pending.length - 1})</span> : null}
          </p>
          <button type="button" className="btn btn-ink" disabled={pending} onClick={() => deposit(due.weekIndex)}>
            Marcar como depositado
          </button>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        {sealed.length > 0 ? (
          <ul className="flex flex-wrap items-center gap-x-1.5" aria-label="Semanas depositadas">
            {sealed.map((w) => (
              <li key={w.index} className="flex items-center gap-0.5 text-small font-bold num" title={`Semana ${w.index}`}>
                <WaxSealIcon size={20} />
                <span className="sr-only">Semana </span>
                {w.index}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-small text-muted">{due ? '' : 'Nenhum depósito pendente.'}</p>
        )}
        <button type="button" className="link text-small" onClick={onOpenClient}>
          Registrar cliente fechado
        </button>
      </div>
    </section>
  );
}
