'use client';

// "Adicionar curso" (tela Cursos): nome, plataforma, link e a lista de aulas colada.
// O formato está em src/lib/course-import.ts; a prévia mostra quantas aulas e horas foram lidas.

import { useMemo, useState, useTransition } from 'react';
import { addCourse, deleteCourse } from '@/app/actions';
import { parseLessons } from '@/lib/course-import';
import { runAction, useToast } from './feedback';
import { hoursLabel } from './format';

const EXAMPLE = `# Fundamentos
O que é Cloud Computing | 12:34
Criando a conta - 20 min
# Segurança
IAM na prática (1h05)`;

export function AddCourseForm() {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [platform, setPlatform] = useState('');
  const [url, setUrl] = useState('');
  const [lessons, setLessons] = useState('');
  const [error, setError] = useState<string | null>(null);

  const preview = useMemo(() => {
    let id = 0;
    return parseLessons(lessons, () => ++id);
  }, [lessons]);

  function save() {
    setError(null);
    startTransition(async () => {
      const r = await runAction(() => addCourse({ name, platform, url, lessons }), 'O curso');
      if (!r.ok) {
        setError(r.error);
        return;
      }
      toast(`Curso adicionado: ${r.data?.lessons ?? preview.lessons} aulas`);
      setName('');
      setPlatform('');
      setUrl('');
      setLessons('');
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <button type="button" className="btn btn-ink" onClick={() => setOpen(true)}>
        Adicionar curso
      </button>
    );
  }

  return (
    <section aria-labelledby="novo-curso-titulo" className="card">
      <div className="card-head">
        <h2 id="novo-curso-titulo" className="card-title">
          Adicionar curso
        </h2>
        <button type="button" className="btn btn-quiet h-8 px-2 text-small" onClick={() => setOpen(false)}>
          Fechar
        </button>
      </div>
      <form
        noValidate
        className="grid grid-cols-1 gap-4 lg:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="curso-nome" className="text-small font-bold">
              Nome
            </label>
            <input id="curso-nome" className="field mt-1.5" maxLength={120} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[10rem_minmax(0,1fr)]">
            <div>
              <label htmlFor="curso-plataforma" className="text-small font-bold">
                Plataforma <span className="font-normal text-muted">(opcional)</span>
              </label>
              <input
                id="curso-plataforma"
                className="field mt-1.5"
                maxLength={40}
                placeholder="Udemy, Alura..."
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="curso-link" className="text-small font-bold">
                Link <span className="font-normal text-muted">(opcional)</span>
              </label>
              <input
                id="curso-link"
                className="field mt-1.5"
                type="url"
                placeholder="https://"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
          </div>
          <div className="text-small text-muted">
            <p className="font-bold text-ink">Como colar as aulas</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5">
              <li>Uma aula por linha. A duração é opcional, no fim: «| 12:34», «- 20 min» ou «(1h05)».</li>
              <li>Linhas com # começam um módulo. «Seção 1: Nome» também vale.</li>
              <li>Dá para colar a grade copiada da Udemy, com a duração na linha de baixo.</li>
            </ul>
            <p className="mt-2">
              Lido: <b className="num">{preview.lessons}</b> {preview.lessons === 1 ? 'aula' : 'aulas'} em{' '}
              <b className="num">{preview.modules.length}</b> {preview.modules.length === 1 ? 'módulo' : 'módulos'}
              {preview.minutes > 0 ? `, ${hoursLabel(preview.minutes)} de vídeo` : ''}.
            </p>
          </div>
          {error ? (
            <p role="alert" className="band text-body font-medium">
              {error}
            </p>
          ) : null}
          <button type="submit" className="btn btn-ink" disabled={pending || !name.trim() || preview.lessons === 0}>
            Salvar curso
          </button>
        </div>
        <div>
          <label htmlFor="curso-aulas" className="text-small font-bold">
            Aulas
          </label>
          <textarea
            id="curso-aulas"
            className="field mt-1.5 min-h-[18rem] resize-y py-2 font-mono text-small"
            placeholder={EXAMPLE}
            value={lessons}
            onChange={(e) => setLessons(e.target.value)}
          />
        </div>
      </form>
    </section>
  );
}

export function DeleteCourseButton({ slug, name }: { slug: string; name: string }) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState(false);
  if (!confirm) {
    return (
      <button type="button" className="btn btn-quiet h-8 px-2 text-small" onClick={() => setConfirm(true)}>
        Remover
      </button>
    );
  }
  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        className="btn btn-outline h-8 px-3 text-small"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const r = await runAction(() => deleteCourse(slug), 'A remoção');
            if (!r.ok) toast(r.error, { tone: 'error' });
            else toast(`${name} removido`);
            setConfirm(false);
          })
        }
      >
        Confirmar remoção
      </button>
      <button type="button" className="btn btn-quiet h-8 px-2 text-small" onClick={() => setConfirm(false)}>
        Cancelar
      </button>
    </span>
  );
}
