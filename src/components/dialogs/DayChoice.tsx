'use client';

// Escolha entre hoje e ontem, os únicos dias que aceitam registro.

import type { GameState } from '@/lib/types';
import { registrableDays, relativeDayLabel } from '../format';

export function DayChoice({
  state,
  value,
  onChange,
  name,
}: {
  state: GameState;
  value: string;
  onChange: (day: string) => void;
  name: string;
}) {
  return (
    <fieldset>
      <legend className="text-small font-bold">Dia</legend>
      <div className="mt-1.5 flex flex-wrap gap-2">
        {registrableDays(state).map((d) => (
          <label key={d} className="choice text-body num">
            <input type="radio" name={name} checked={value === d} onChange={() => onChange(d)} />
            {relativeDayLabel(state, d)}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
