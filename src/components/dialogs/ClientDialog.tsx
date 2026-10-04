'use client';

// "Registrar cliente fechado": valor do contrato e a prévia do bônus de 5% antes de salvar.

import { useState, useTransition } from 'react';
import { addClient } from '@/app/actions';
import { season1 } from '@/config/season1';
import { clientBonusCents, formatBRL } from '@/lib/cardio';
import { runAction, useToast } from '../feedback';

/** "3.000,50", "R$ 3000" ou "3000.5" → centavos; NaN se não der para ler. */
export function parseBRL(text: string): number {
  let s = text.replace(/R\$/gi, '').replace(/\s/g, '');
  if (s === '') return NaN;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : NaN;
}

export function ClientDialog({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const contractCents = parseBRL(value);
  const bonus = Number.isFinite(contractCents) ? clientBonusCents(contractCents, season1) : null;

  function save() {
    if (!Number.isFinite(contractCents)) {
      setError('Informe o valor do contrato.');
      return;
    }
    setError(null);
    startTransition(async () => {
      const r = await runAction(
        () => addClient({ contractCents, note: note.trim() || undefined }),
        'O cliente',
      );
      if (!r.ok) {
        setError(r.error);
        return;
      }
      toast(`Bônus de ${formatBRL(r.data?.bonusCents ?? bonus ?? 0)} somado ao Fundo`);
      onClose();
    });
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      className="space-y-4"
    >
      <div>
        <label htmlFor="cliente-valor" className="text-small font-bold">
          Valor do contrato
        </label>
        <input
          id="cliente-valor"
          className="field mt-1.5 max-w-[14rem] num"
          inputMode="decimal"
          placeholder="3.000,00"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          aria-invalid={error ? true : undefined}
        />
      </div>
      <div>
        <label htmlFor="cliente-nota" className="text-small font-bold">
          Observação (opcional)
        </label>
        <input
          id="cliente-nota"
          className="field mt-1.5"
          maxLength={120}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      <p className="min-h-6 text-body" aria-live="polite">
        {bonus !== null ? (
          <>
            Bônus de <span className="font-bold text-money num">{formatBRL(bonus)}</span> para o Fundo (
            {season1.fund.clientBonusPct}% do contrato).
          </>
        ) : (
          `O Fundo recebe ${season1.fund.clientBonusPct}% do valor do contrato.`
        )}
      </p>

      {error ? (
        <p role="alert" className="band text-body font-medium">
          {error}
        </p>
      ) : null}

      <button type="submit" className="btn btn-ink" disabled={pending}>
        Registrar cliente fechado
      </button>
    </form>
  );
}
