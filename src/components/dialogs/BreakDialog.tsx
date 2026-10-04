'use client';

// Confirmação de "Usar folga" (folga de reserva, só para hoje).

import { useTransition } from 'react';
import { takeBreak } from '@/app/actions';
import { shortDate } from '@/lib/time';
import type { GameState } from '@/lib/types';
import { runAction, useToast } from '../feedback';

export function BreakDialog({ state, onClose }: { state: GameState; onClose: () => void }) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const left = state.breaks.reserveLeft;

  function confirm() {
    startTransition(async () => {
      const r = await runAction(() => takeBreak(), 'A folga');
      if (!r.ok) {
        toast(r.error, { tone: 'error' });
        return;
      }
      toast('Folga marcada para hoje');
      onClose();
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-body">
        Hoje, {shortDate(state.today)}, vira folga: não mexe na sequência e não entra na nota nem no Fundo.
      </p>
      <p className="text-body num">
        {left === 1
          ? 'Esta é a última folga de reserva.'
          : `Restam ${left} folgas de reserva. Depois desta, ${left - 1}.`}
      </p>
      <div className="flex gap-3">
        <button type="button" className="btn btn-ink" disabled={pending} onClick={confirm}>
          Usar folga
        </button>
        <button type="button" className="btn btn-outline" onClick={onClose}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
