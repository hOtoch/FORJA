'use client';

// Campo "O que você aprendeu?": obrigatório ao encerrar ou registrar estudo.

import { SUMMARY_MAX, SUMMARY_MIN } from '@/lib/summary';

export function summaryReady(text: string): boolean {
  const n = text.trim().length;
  return n >= SUMMARY_MIN && n <= SUMMARY_MAX;
}

export function SummaryField({
  id,
  value,
  onChange,
  invalid,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  invalid?: boolean;
}) {
  const n = value.trim().length;
  const short = n < SUMMARY_MIN;
  return (
    <div>
      <label htmlFor={id} className="text-small font-bold">
        O que você aprendeu?
      </label>
      <textarea
        id={id}
        className="field mt-1.5 min-h-[7rem] resize-y py-2"
        maxLength={SUMMARY_MAX}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Em poucas frases: o conceito principal, um exemplo, uma dúvida que ficou. Isso vira pauta para o LinkedIn."
        aria-invalid={invalid || undefined}
        aria-describedby={`${id}-dica`}
        required
      />
      <p id={`${id}-dica`} className="mt-1 text-small text-muted num">
        {short ? `Escreva pelo menos ${SUMMARY_MIN} caracteres (faltam ${SUMMARY_MIN - n}).` : `${n} caracteres.`}
      </p>
    </div>
  );
}
