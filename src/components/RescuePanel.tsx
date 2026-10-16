'use client';

// Evento de resgate: o chefe que escapou na semana passada volta num dia sorteado desta semana.
// Antes do dia, só o aviso (o desafio fica em segredo); no dia, o desafio e o progresso; os que
// não dá para medir pelos registros (prospecção, leitura) têm o botão "Concluí".

import { useTransition, type ReactNode } from 'react';
import { completeRescue, deleteRecord } from '@/app/actions';
import { season1 } from '@/config/season1';
import { formatBRL } from '@/lib/cardio';
import { longDate } from '@/lib/time';
import type { GameState, RescueEvent } from '@/lib/types';
import { bossOfWeek } from './bosses';
import { runAction, useToast } from './feedback';
import { Medallion, Sprite } from './pixel';
import { Meter } from './viz';

const PRIZE = `${season1.xp.boss} XP e ${formatBRL(season1.fund.bossCents)} no Fundo`;

function progressLabel(r: RescueEvent): string {
  switch (r.kind) {
    case 'study-minutes':
    case 'cardio-minutes':
      return `${Math.min(r.progress, r.target)} de ${r.target} min`;
    case 'gym-cardio':
      return `${r.progress} de 2`;
    case 'manual':
      return r.progress > 0 ? 'concluído' : 'a fazer';
  }
}

export function RescuePanel({ state }: { state: GameState }) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const r = state.rescue;
  // passou o dia sem cumprir: o painel some e o chefe fica de pé no mapa
  if (!r || r.state === 'missed') return null;

  const boss = bossOfWeek(r.weekIndex);
  const isToday = r.day === state.today;

  function done() {
    startTransition(async () => {
      const res = await runAction(() => completeRescue(), 'O resgate');
      if (!res.ok) toast(res.error, { tone: 'error' });
      else toast(`${boss.name} derrotado no resgate!`, { seal: true });
    });
  }

  function undo(id: string) {
    startTransition(async () => {
      const res = await runAction(() => deleteRecord(id), 'O desfazer');
      if (!res.ok) toast(res.error, { tone: 'error' });
    });
  }

  let body: ReactNode;
  if (r.state === 'upcoming') {
    body = (
      <p className="text-body">
        {boss.name} escapou na semana {r.weekIndex}. Em algum dia desta semana aparece um evento de resgate: cumpra
        o desafio daquele dia para derrotá-lo e ganhar {PRIZE}.
      </p>
    );
  } else if (r.state === 'done') {
    body = (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-body">
          <span className="font-bold">{r.title}</span>: feito. {boss.name} caiu no resgate e rendeu {PRIZE}.
        </p>
        {r.recordId && isToday ? (
          <button
            type="button"
            className="btn btn-outline h-8 px-3 text-small"
            disabled={pending}
            onClick={() => undo(r.recordId!)}
          >
            Desfazer
          </button>
        ) : null}
      </div>
    );
  } else {
    body = (
      <div className="band" style={{ borderLeftColor: 'var(--cta)' }} role="status">
        <p className="text-micro font-bold uppercase tracking-wide text-muted">Desafio de hoje</p>
        <p className="text-lead font-bold">{r.title}</p>
        <p className="text-body text-muted">{r.description}</p>
        <div className="mt-2 flex items-center gap-3">
          <div className="flex-1">
            <Meter value={r.progress} max={r.target} color="var(--cta)" label={`Progresso do resgate: ${progressLabel(r)}`} />
          </div>
          <span className="shrink-0 text-small font-bold num">{progressLabel(r)}</span>
        </div>
        {r.kind === 'manual' ? (
          <button type="button" className="btn btn-ink mt-3" disabled={pending} onClick={done}>
            Concluí o desafio
          </button>
        ) : (
          <p className="mt-2 text-small text-muted">Conta sozinho pelos registros de hoje. Vale até a virada do dia.</p>
        )}
      </div>
    );
  }

  return (
    <section aria-labelledby="resgate-titulo" className="card">
      <div className="card-head">
        <h2 id="resgate-titulo" className="card-title">
          Evento de resgate
        </h2>
        <span className="card-meta">{r.state === 'upcoming' ? 'esta semana' : longDate(r.day)}</span>
      </div>
      <div className="flex items-start gap-4">
        <Medallion size={64}>
          <Sprite name={boss.sprite} base={28} scale={2} faded={r.state === 'done'} />
        </Medallion>
        <div className="min-w-0 flex-1">{body}</div>
      </div>
    </section>
  );
}
