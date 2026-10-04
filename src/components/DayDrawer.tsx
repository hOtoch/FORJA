'use client';

// Gaveta do dia: abre pela direita ao clicar num segmento da barra.

import { useState, useTransition } from 'react';
import { addGym, deleteRecord } from '@/app/actions';
import { CARDIO_LABELS, formatBRL } from '@/lib/cardio';
import { addDays, longDate } from '@/lib/time';
import type { DayInfo, ForjaRecord, GameState } from '@/lib/types';
import { Dialog, runAction, useToast } from './feedback';
import { courseBySlug, fmtInt, heatReason, lessonTitleById, timeHM } from './format';

const SWATCH: Record<string, string> = {
  future: 'var(--heat-future)',
  '0': 'var(--heat-0)',
  '1': 'var(--heat-1)',
  '2': 'var(--heat-2)',
  '3': 'var(--heat-3)',
  '4': 'var(--heat-4)',
};

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

interface ContentProps {
  state: GameState;
  day: DayInfo;
  records?: ForjaRecord[];
  onRegisterStudy: (day: string) => void;
  onRegisterCardio: (day: string) => void;
}

/** A gaveta em si: um <dialog> modal que entra pela direita. */
export function DayDrawer({
  day,
  onClose,
  ...rest
}: Omit<ContentProps, 'day'> & { day: DayInfo | null; onClose: () => void }) {
  return (
    <Dialog variant="drawer" open={day !== null} onClose={onClose} title={day ? capitalize(longDate(day.date)) : ''}>
      {day ? <DayDrawerContent day={day} {...rest} /> : null}
    </Dialog>
  );
}

function DayDrawerContent({ state, day, records, onRegisterStudy, onRegisterCardio }: ContentProps) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [showRegister, setShowRegister] = useState(false);
  const [confirmUndo, setConfirmUndo] = useState<string | null>(null);

  const editable = day.date === state.today || day.date === addDays(state.today, -1);
  const dayRecords = (records ?? []).filter((r) => r.day === day.date);
  const studies = dayRecords.filter((r) => r.kind === 'study');
  const moves = dayRecords.filter((r) => r.kind === 'gym' || r.kind === 'cardio');
  const others = dayRecords.filter((r) => r.kind === 'client' || r.kind === 'deposit');
  const swatchKey = day.isFuture || day.heat === null ? 'future' : String(day.heat);

  function undo(id: string) {
    startTransition(async () => {
      const r = await runAction(() => deleteRecord(id), 'O desfazer');
      if (!r.ok) toast(r.error, { tone: 'error' });
      else toast('Registro desfeito');
      setConfirmUndo(null);
    });
  }

  function gym() {
    startTransition(async () => {
      const r = await runAction(() => addGym({ day: day.date }), 'O treino');
      if (!r.ok) toast(r.error, { tone: 'error' });
      else toast('Treino marcado');
    });
  }

  function undoButton(id: string) {
    if (!editable) return null;
    return confirmUndo === id ? (
      <button type="button" className="btn btn-outline h-8 px-3 text-small" disabled={pending} onClick={() => undo(id)}>
        Confirmar
      </button>
    ) : (
      <button type="button" className="btn btn-quiet h-8 px-2 text-small" onClick={() => setConfirmUndo(id)}>
        Desfazer
      </button>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-body text-muted num">
        Dia {day.index} de {state.days.length}, semana {day.weekIndex}
      </p>

      <section>
        <h3 className="text-body font-bold">Calor</h3>
        <div className="mt-2 flex items-start gap-3">
          <span
            className="mt-0.5 inline-block h-8 w-5 shrink-0 rounded-[2px] border-[3px] border-bar"
            style={{
              background: day.breakKind
                ? 'repeating-linear-gradient(135deg, var(--heat-0) 0 3px, var(--heat-future) 3px 7px)'
                : SWATCH[swatchKey],
              boxShadow: day.shieldUsed ? 'inset 0 3px 0 var(--bar-blue)' : undefined,
            }}
            aria-hidden="true"
          />
          <p className="text-body">{heatReason(day)}</p>
        </div>
      </section>

      {!day.isFuture ? (
        <section>
          <h3 className="text-body font-bold">Estudo</h3>
          <p className="mt-1 text-body num">
            {day.studyMinutes > 0 ? `${day.studyMinutes} min no dia` : 'Nenhum minuto de estudo.'}
          </p>
          {studies.length > 0 ? (
            <ul className="mt-2 space-y-2">
              {studies.map((r) => {
                if (r.kind !== 'study') return null;
                const d = r.data;
                const course = courseBySlug(state, d.courseSlug);
                const lessons = d.lessonIds.map((id) => lessonTitleById(state, id)).filter(Boolean);
                return (
                  <li key={r.id} className="flex items-start justify-between gap-3">
                    <div className="min-w-0 text-body">
                      <p className="num">
                        {d.source === 'timer' && d.startedAt && d.endedAt
                          ? `${timeHM(d.startedAt)} às ${timeHM(d.endedAt)}, ${d.minutes} min`
                          : `${d.minutes} min, registro manual`}
                      </p>
                      <p className="text-small text-muted">
                        {course?.name ?? d.courseSlug}
                        {lessons.length > 0
                          ? `. ${lessons.length === 1 ? 'Aula' : 'Aulas'}: ${lessons.join('; ')}`
                          : ''}
                      </p>
                    </div>
                    {undoButton(r.id)}
                  </li>
                );
              })}
            </ul>
          ) : null}
        </section>
      ) : null}

      {!day.isFuture ? (
        <section>
          <h3 className="text-body font-bold">Treino e cardio</h3>
          {moves.length > 0 ? (
            <ul className="mt-2 space-y-1.5">
              {moves.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 text-body">
                  <span className="num">
                    {r.kind === 'gym'
                      ? 'Treino de academia'
                      : r.kind === 'cardio'
                        ? `${CARDIO_LABELS[r.data.modality]}, ${r.data.minutes} min${r.data.isSuper ? ', supercardio' : ''}`
                        : ''}
                  </span>
                  {undoButton(r.id)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-body num">
              {day.gym === 0 && day.cardio === 0
                ? 'Nenhum treino nem cardio.'
                : [
                    day.gym > 0 ? `${day.gym} ${day.gym === 1 ? 'treino' : 'treinos'}` : null,
                    day.cardio > 0
                      ? `${day.cardio} ${day.cardio === 1 ? 'cardio' : 'cardios'}${day.superCardio > 0 ? ', com supercardio' : ''}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(' e ')}
            </p>
          )}
        </section>
      ) : null}

      {others.length > 0 ? (
        <section>
          <h3 className="text-body font-bold">Fundo</h3>
          <ul className="mt-2 space-y-1.5">
            {others.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 text-body num">
                <span>
                  {r.kind === 'client'
                    ? `Cliente fechado: bônus de ${formatBRL(r.data.bonusCents)}${r.data.note ? ` (${r.data.note})` : ''}`
                    : r.kind === 'deposit'
                      ? `Depósito da semana ${r.data.weekIndex}: ${formatBRL(r.data.amountCents)}`
                      : ''}
                </span>
                {r.kind === 'client' ? undoButton(r.id) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {!day.isFuture ? (
        <section>
          <h3 className="text-body font-bold">O dia rendeu</h3>
          <p className="mt-1 text-body num">
            {fmtInt(day.xp)} XP e <span className="text-money font-bold">{formatBRL(day.fundCents)}</span> no Fundo
          </p>
        </section>
      ) : null}

      {editable ? (
        <section>
          {showRegister ? (
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn btn-outline" onClick={() => onRegisterStudy(day.date)}>
                Registrar estudo
              </button>
              <button type="button" className="btn btn-outline" disabled={pending} onClick={gym}>
                Marcar treino
              </button>
              <button type="button" className="btn btn-outline" onClick={() => onRegisterCardio(day.date)}>
                Marcar cardio
              </button>
            </div>
          ) : (
            <button type="button" className="btn btn-ink" onClick={() => setShowRegister(true)}>
              Registrar para este dia
            </button>
          )}
        </section>
      ) : (
        <p className="text-small text-muted">Só dá para registrar hoje ou ontem.</p>
      )}
    </div>
  );
}
