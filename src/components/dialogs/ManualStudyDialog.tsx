'use client';

// Registro manual de tempo: dia (hoje ou ontem), bloco da rotina e minutos. No estudo, também o
// curso e a última aula concluída; nos outros blocos, uma nota opcional.

import { useState, useTransition } from 'react';
import { addStudy, addWork } from '@/app/actions';
import { season } from '@/config/season';
import { timeSources } from '@/lib/game/days';
import type { GameState } from '@/lib/types';
import { runAction, useToast } from '../feedback';
import { blockName, courseBySlug, lessonName, pendingLessons } from '../format';
import { DayChoice } from './DayChoice';
import { SummaryField, summaryReady } from './SummaryField';

export function ManualStudyDialog({
  state,
  initialDay,
  initialBlock = 'estudo',
  onClose,
}: {
  state: GameState;
  initialDay: string;
  initialBlock?: string;
  onClose: () => void;
}) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [day, setDay] = useState(initialDay);
  const [block, setBlock] = useState(initialBlock);
  const [note, setNote] = useState('');
  const [summary, setSummary] = useState('');
  const isStudy = block === 'estudo';
  const [courseSlug, setCourseSlug] = useState(state.currentCourseSlug ?? state.courses[0]?.slug ?? '');
  const [minutes, setMinutes] = useState('');
  const [lastLesson, setLastLesson] = useState('');
  const [error, setError] = useState<string | null>(null);

  const lessons = pendingLessons(courseBySlug(state, courseSlug)).slice(0, 40);

  function save() {
    const min = Number(minutes);
    if (!Number.isFinite(min) || min < 1) {
      setError('Informe os minutos.');
      return;
    }
    if (isStudy && !summaryReady(summary)) {
      setError('Escreva o que você aprendeu antes de registrar.');
      return;
    }
    const upTo = lessons.findIndex((l) => String(l.id) === lastLesson);
    const lessonIds = lessons.slice(0, upTo + 1).map((l) => l.id);
    setError(null);
    startTransition(async () => {
      const r = await runAction(
        () =>
          isStudy
            ? addStudy({ day, courseSlug, minutes: Math.round(min), lessonIds, summary })
            : addWork({ day, block, minutes: Math.round(min), note }),
        'O registro',
      );
      if (!r.ok) {
        setError(r.error);
        return;
      }
      toast(`${blockName(block)}: ${Math.round(min)} min registrados`);
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
      <DayChoice state={state} value={day} onChange={setDay} name="estudo-dia" />

      <div>
        <label htmlFor="registro-bloco" className="text-small font-bold">
          Bloco
        </label>
        <select id="registro-bloco" className="field mt-1.5" value={block} onChange={(e) => setBlock(e.target.value)}>
          {timeSources(season).map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      {isStudy ? (
      <div>
        <label htmlFor="estudo-curso" className="text-small font-bold">
          Curso
        </label>
        <select
          id="estudo-curso"
          className="field mt-1.5"
          value={courseSlug}
          onChange={(e) => {
            setCourseSlug(e.target.value);
            setLastLesson('');
          }}
        >
          {state.courses.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      ) : null}

      <div>
        <label htmlFor="estudo-minutos" className="text-small font-bold">
          Minutos
        </label>
        <input
          id="estudo-minutos"
          className="field mt-1.5 max-w-[10rem] num"
          type="number"
          inputMode="numeric"
          min={1}
          max={600}
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
          aria-invalid={error === 'Informe os minutos.' || undefined}
          aria-describedby={error ? 'estudo-erro' : undefined}
        />
      </div>

      {isStudy ? (
      <div>
        <label htmlFor="estudo-aula" className="text-small font-bold">
          Última aula concluída
        </label>
        <select
          id="estudo-aula"
          className="field mt-1.5"
          value={lastLesson}
          onChange={(e) => setLastLesson(e.target.value)}
        >
          <option value="">Nenhuma aula concluída</option>
          {lessons.map((l) => (
            <option key={l.id} value={String(l.id)}>
              Módulo {l.moduleNumber}: {lessonName(l.title)}
            </option>
          ))}
        </select>
        <p className="mt-1 text-small text-muted">Marcar uma aula conclui também as anteriores.</p>
      </div>
      ) : null}

      {isStudy ? (
        <SummaryField id="estudo-resumo" value={summary} onChange={setSummary} invalid={error?.includes('aprendeu')} />
      ) : (
        <div>
          <label htmlFor="registro-nota" className="text-small font-bold">
            Nota <span className="font-normal text-muted">(opcional)</span>
          </label>
          <input
            id="registro-nota"
            className="field mt-1.5"
            maxLength={200}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ex.: 25 mensagens no Instagram para clínicas"
          />
        </div>
      )}

      {error ? (
        <p id="estudo-erro" role="alert" className="band text-body font-medium">
          {error}
        </p>
      ) : null}

      <button type="submit" className="btn btn-ink" disabled={pending}>
        Registrar {blockName(block).toLowerCase()}
      </button>
    </form>
  );
}
