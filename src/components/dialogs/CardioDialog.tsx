'use client';

// "Marcar cardio": modalidade e minutos. Diz antes de salvar se conta como supercardio.

import { useState, useTransition } from 'react';
import { addCardio } from '@/app/actions';
import { season1 } from '@/config/season1';
import { CARDIO_LABELS, isSuperCardio, validateCardio } from '@/lib/cardio';
import type { CardioModality, GameState } from '@/lib/types';
import { runAction, useToast } from '../feedback';
import { DayChoice } from './DayChoice';

const MODALITIES = Object.keys(CARDIO_LABELS) as CardioModality[];

export function CardioDialog({
  state,
  initialDay,
  onClose,
}: {
  state: GameState;
  initialDay: string;
  onClose: () => void;
}) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [day, setDay] = useState(initialDay);
  const [modality, setModality] = useState<CardioModality>('esteira');
  const [minutes, setMinutes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const min = minutes === '' ? NaN : Number(minutes);
  const isSuper = Number.isFinite(min) && isSuperCardio(modality, min, season1);
  const alwaysSuper = season1.cardio.alwaysSuper.includes(modality);

  function save() {
    const invalid = validateCardio(modality, min, season1);
    if (invalid) {
      setError(invalid);
      return;
    }
    if (!Number.isFinite(min) || min < 1) {
      setError('Informe os minutos.');
      return;
    }
    setError(null);
    startTransition(async () => {
      const r = await runAction(() => addCardio({ day, modality, minutes: Math.round(min) }), 'O cardio');
      if (!r.ok) {
        setError(r.error);
        return;
      }
      toast((r.data?.isSuper ?? isSuper) ? 'Supercardio marcado' : 'Cardio marcado');
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
      <DayChoice state={state} value={day} onChange={setDay} name="cardio-dia" />

      <fieldset>
        <legend className="text-small font-bold">Modalidade</legend>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {MODALITIES.map((m) => (
            <label key={m} className="choice text-body">
              <input
                type="radio"
                name="cardio-modalidade"
                checked={modality === m}
                onChange={() => {
                  setModality(m);
                  setError(null);
                }}
              />
              {CARDIO_LABELS[m]}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="cardio-minutos" className="text-small font-bold">
          Minutos
        </label>
        <input
          id="cardio-minutos"
          className="field mt-1.5 max-w-[10rem] num"
          type="number"
          inputMode="numeric"
          min={1}
          max={600}
          value={minutes}
          onChange={(e) => {
            setMinutes(e.target.value);
            setError(null);
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby="cardio-regra"
        />
        <p id="cardio-regra" className="mt-1 text-small text-muted">
          {alwaysSuper
            ? 'Pelada de qualquer duração conta como supercardio.'
            : `Cardio conta a partir de ${season1.cardio.minMinutes} min. Bicicleta, caminhada ou esteira com ${season1.cardio.superMinutes} min ou mais é supercardio.`}
        </p>
      </div>

      <p className="flex min-h-6 items-center gap-2 text-body font-medium" aria-live="polite">
        {isSuper ? (
          <>
            <span className="inline-block h-[10px] w-[10px] rotate-45 rounded-[1px] bg-ink" aria-hidden="true" />
            Isto conta como supercardio.
          </>
        ) : null}
      </p>

      {error ? (
        <p role="alert" className="band text-body font-medium">
          {error}
        </p>
      ) : null}

      <button type="submit" className="btn btn-ink" disabled={pending}>
        Marcar cardio
      </button>
    </form>
  );
}
