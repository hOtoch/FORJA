'use client';

// "Encerrar sessão": confirma até qual aula você chegou e salva (DESIGN.md, seção 6, Timer).

import { useState, useTransition } from 'react';
import { discardTimer, stopTimer } from '@/app/actions';
import type { GameState } from '@/lib/types';
import { runAction, useToast } from '../feedback';
import { courseBySlug, lessonName, minutesLabel, pendingLessons } from '../format';
import type { StopInfo } from '../TodayPanel';

const MIN = 60_000;

export function StopSessionDialog({
  state,
  info,
  onClose,
}: {
  state: GameState;
  info: StopInfo;
  onClose: () => void;
}) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const course = courseBySlug(state, state.timer?.courseSlug ?? state.currentCourseSlug);
  const options = pendingLessons(course).slice(0, 8);
  const [upTo, setUpTo] = useState<number | null>(options[0]?.id ?? null);
  const [countGap, setCountGap] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedIndex = upTo === null ? -1 : options.findIndex((o) => o.id === upTo);
  const lessonIds = options.slice(0, selectedIndex + 1).map((o) => o.id);
  const minutes = Math.floor((info.creditedMs + (countGap ? info.pendingMs : 0)) / MIN);
  const gapMin = Math.floor(info.pendingMs / MIN);

  function save() {
    setError(null);
    startTransition(async () => {
      const r = await runAction(() => stopTimer(lessonIds, countGap), 'A sessão');
      if (!r.ok) {
        setError(r.error);
        return;
      }
      const saved = r.data?.minutes ?? minutes;
      const last = selectedIndex >= 0 ? options[selectedIndex] : null;
      toast(last ? `Sessão salva: ${saved} min, até a aula ${lessonName(last.title)}` : `Sessão salva: ${saved} min`);
      onClose();
    });
  }

  function discard() {
    setError(null);
    startTransition(async () => {
      const r = await runAction(() => discardTimer(), 'O descarte');
      if (!r.ok) {
        setError(r.error);
        return;
      }
      toast('Sessão descartada');
      onClose();
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <p className="text-body num">
        {minutes} min nesta sessão{course ? `, em ${course.name}` : ''}.
      </p>
      {gapMin >= 1 ? (
        <label className="mt-3 flex cursor-pointer items-start gap-2 text-body">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 accent-[var(--text)]"
            checked={countGap}
            onChange={(e) => setCountGap(e.target.checked)}
          />
          <span className="num">Contar também os {gapMin} min em que o timer esperou resposta</span>
        </label>
      ) : null}

      <fieldset className="mt-4">
        <legend className="text-body font-bold">Até qual aula você chegou?</legend>
        {options.length === 0 ? (
          <p className="mt-2 text-body text-muted">Este curso não tem aulas pendentes.</p>
        ) : (
          <div className="mt-2 space-y-0.5">
            {options.map((o, i) => (
              <label
                key={o.id}
                className="flex cursor-pointer items-start gap-3 rounded-[6px] px-2 py-1.5 hover:bg-[var(--hover)]"
              >
                <input
                  type="radio"
                  name="ate-aula"
                  className="mt-1 h-4 w-4 accent-[var(--text)]"
                  checked={upTo === o.id}
                  onChange={() => setUpTo(o.id)}
                />
                <span className="min-w-0">
                  <span className={`block text-body ${i <= selectedIndex ? 'font-medium' : ''}`}>{lessonName(o.title)}</span>
                  <span className="block text-small text-muted">
                    Módulo {o.moduleNumber}, {minutesLabel(o.minutes)}
                    {i === 0 ? ', a próxima da fila' : ''}
                  </span>
                </span>
              </label>
            ))}
            <label className="flex cursor-pointer items-center gap-3 rounded-[6px] px-2 py-1.5 hover:bg-[var(--hover)]">
              <input
                type="radio"
                name="ate-aula"
                className="h-4 w-4 accent-[var(--text)]"
                checked={upTo === null}
                onChange={() => setUpTo(null)}
              />
              <span className="text-body">Nenhuma aula nova</span>
            </label>
          </div>
        )}
        <p className="mt-2 text-small text-muted">Marcar uma aula conclui também as anteriores.</p>
      </fieldset>

      {error ? (
        <p role="alert" className="band mt-4 text-body font-medium">
          {error}
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <button type="submit" className="btn btn-ink" disabled={pending}>
          Salvar sessão
        </button>
        {confirmDiscard ? (
          <span className="flex items-center gap-2">
            <span className="text-small text-muted">Os minutos se perdem.</span>
            <button type="button" className="btn btn-outline" disabled={pending} onClick={discard}>
              Sim, descartar
            </button>
          </span>
        ) : (
          <button type="button" className="btn btn-quiet" onClick={() => setConfirmDiscard(true)}>
            Descartar sessão
          </button>
        )}
      </div>
    </form>
  );
}
