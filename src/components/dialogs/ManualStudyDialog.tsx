'use client';

// Registro manual de estudo: dia (hoje ou ontem), curso, minutos e última aula concluída.

import { useState, useTransition } from 'react';
import { addStudy } from '@/app/actions';
import type { GameState } from '@/lib/types';
import { runAction, useToast } from '../feedback';
import { courseBySlug, lessonName, pendingLessons } from '../format';
import { DayChoice } from './DayChoice';

export function ManualStudyDialog({
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
    const upTo = lessons.findIndex((l) => String(l.id) === lastLesson);
    const lessonIds = lessons.slice(0, upTo + 1).map((l) => l.id);
    setError(null);
    startTransition(async () => {
      const r = await runAction(
        () => addStudy({ day, courseSlug, minutes: Math.round(min), lessonIds }),
        'O estudo',
      );
      if (!r.ok) {
        setError(r.error);
        return;
      }
      toast(`Estudo registrado: ${Math.round(min)} min`);
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

      {error ? (
        <p id="estudo-erro" role="alert" className="band text-body font-medium">
          {error}
        </p>
      ) : null}

      <button type="submit" className="btn btn-ink" disabled={pending}>
        Registrar estudo
      </button>
    </form>
  );
}
