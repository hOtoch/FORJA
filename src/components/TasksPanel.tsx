'use client';

// Tarefas avulsas: o que precisa ser feito, mas não todo dia (atualizar o currículo, montar a
// landing do SaaS, responder um cliente). Cada tarefa concluída rende XP no dia em que fecha.

import { useState, useTransition } from 'react';
import { addTask, deleteTask, setTaskDone } from '@/app/actions';
import { season } from '@/config/season';
import { shortDate } from '@/lib/time';
import type { ActionResult, GameState, Task } from '@/lib/types';
import { runAction, useToast } from './feedback';
import { blockName } from './format';

const SHOW_DONE = 5;

export function TasksPanel({ state }: { state: GameState }) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState('');
  const [block, setBlock] = useState('');
  const [showAllDone, setShowAllDone] = useState(false);
  const { open, done } = state.tasks;
  const doneShown = showAllDone ? done : done.slice(0, SHOW_DONE);

  function act(call: () => Promise<ActionResult>, what: string, success?: string, after?: () => void) {
    startTransition(async () => {
      const r = await runAction(call, what);
      if (!r.ok) toast(r.error, { tone: 'error' });
      else {
        if (success) toast(success);
        after?.();
      }
    });
  }

  function create() {
    const t = title.trim();
    if (!t) return;
    act(() => addTask({ title: t, block: block || null }), 'A tarefa', undefined, () => setTitle(''));
  }

  function row(t: Task) {
    const isDone = t.doneDay !== null;
    return (
      <li key={t.id} className="group flex items-start gap-3 rounded-[6px] px-1 py-1.5 hover:bg-[var(--hover)]">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-[var(--text)]"
          checked={isDone}
          disabled={pending}
          onChange={(e) =>
            act(
              () => setTaskDone(t.id, e.target.checked),
              'A tarefa',
              e.target.checked ? `Tarefa concluída: +${season.xp.task} XP` : undefined,
            )
          }
          aria-label={isDone ? `Reabrir: ${t.title}` : `Concluir: ${t.title}`}
        />
        <span className="min-w-0 flex-1">
          <span className={`block break-words text-body ${isDone ? 'text-muted line-through' : ''}`}>{t.title}</span>
          {t.block || isDone ? (
            <span className="block text-small text-muted num">
              {[t.block ? blockName(t.block) : null, isDone && t.doneDay ? `feita em ${shortDate(t.doneDay)}` : null]
                .filter(Boolean)
                .join(' · ')}
            </span>
          ) : null}
        </span>
        <button
          type="button"
          className="btn btn-quiet h-7 px-2 text-small opacity-60 group-hover:opacity-100"
          disabled={pending}
          onClick={() => act(() => deleteTask(t.id), 'A tarefa')}
          aria-label={`Apagar: ${t.title}`}
        >
          Apagar
        </button>
      </li>
    );
  }

  return (
    <section aria-labelledby="tarefas-titulo" className="card">
      <div className="card-head">
        <h2 id="tarefas-titulo" className="card-title">
          Tarefas
        </h2>
        <span className="card-meta num">
          {open.length === 0 ? 'nada em aberto' : `${open.length} em aberto`} · +{season.xp.task} XP cada
        </span>
      </div>

      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          create();
        }}
      >
        <label htmlFor="tarefa-titulo" className="sr-only">
          Nova tarefa
        </label>
        <input
          id="tarefa-titulo"
          className="field min-w-[12rem] flex-1"
          maxLength={200}
          placeholder="Nova tarefa, ex.: atualizar o currículo"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <label htmlFor="tarefa-bloco" className="sr-only">
          Bloco
        </label>
        <select id="tarefa-bloco" className="field w-auto" value={block} onChange={(e) => setBlock(e.target.value)}>
          <option value="">Sem bloco</option>
          {season.blocks.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <button type="submit" className="btn btn-ink" disabled={pending || !title.trim()}>
          Adicionar
        </button>
      </form>

      {open.length > 0 ? (
        <ul className="mt-4 space-y-0.5">{open.map(row)}</ul>
      ) : (
        <p className="mt-4 text-body text-muted">Nenhuma tarefa em aberto. Anote aqui o que não cabe na rotina do dia.</p>
      )}

      {done.length > 0 ? (
        <div className="mt-4 border-t border-line pt-3">
          <p className="text-small font-bold text-muted">Concluídas</p>
          <ul className="mt-1 space-y-0.5">{doneShown.map(row)}</ul>
          {done.length > SHOW_DONE ? (
            <button type="button" className="link mt-1 text-small" onClick={() => setShowAllDone((v) => !v)}>
              {showAllDone ? 'Mostrar menos' : `Mostrar todas (${done.length})`}
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
