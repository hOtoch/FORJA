'use client';

// Cabeçalho: o nome, a temporada, o dia e o menu.

import Link from 'next/link';
import { logout } from '@/app/actions';
import { season1 } from '@/config/season1';
import { daysBetween, longDate } from '@/lib/time';
import type { GameState } from '@/lib/types';
import { useToast } from './feedback';

function seasonLine(state: GameState): string {
  const total = state.days.length;
  if (state.phase === 'before') {
    const left = daysBetween(state.today, season1.start);
    return `Começa na ${longDate(season1.start)}, ${left === 1 ? 'falta 1 dia' : `faltam ${left} dias`}`;
  }
  if (state.phase === 'after' || state.dayIndex === null) return 'Temporada encerrada em 23/12';
  const left = total - state.dayIndex + 1;
  return `Dia ${state.dayIndex} de ${total}, ${left === 1 ? 'último dia' : `faltam ${left}`}`;
}

function breakBlocker(state: GameState): string | null {
  if (state.phase !== 'active') return 'A temporada não está em andamento.';
  if (state.todayInfo?.breakKind) return 'Hoje já é folga.';
  if (state.breaks.reserveLeft <= 0) return 'Não restam folgas de reserva.';
  if (!state.breaks.canUseToday) return 'Hoje não dá para usar folga.';
  return null;
}

interface Props {
  state: GameState;
  onRegisterStudy: () => void;
  onUseBreak: () => void;
}

export function Header({ state, onRegisterStudy, onUseBreak }: Props) {
  const toast = useToast();
  const blocker = breakBlocker(state);

  return (
    <header className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-8">
      <div>
        <h1 className="font-gothic text-[2.5rem] leading-10 font-extrabold">Forja</h1>
        <p className="mt-0.5 text-small font-medium text-muted">
          Temporada 1: {season1.name}
        </p>
      </div>
      <div className="flex flex-col gap-1 md:items-end">
        <nav aria-label="Menu">
          <ul className="-mx-2.5 flex flex-wrap items-center gap-x-1 gap-y-0 md:mx-0 md:-mr-2.5 md:justify-end">
            <li>
              <button type="button" className="btn btn-quiet" onClick={onRegisterStudy}>
                Registrar estudo
              </button>
            </li>
            <li>
              <button
                type="button"
                className="btn btn-quiet"
                aria-disabled={blocker ? true : undefined}
                aria-describedby={blocker ? 'folga-motivo' : undefined}
                onClick={() => (blocker ? toast(blocker, { tone: 'error' }) : onUseBreak())}
              >
                Usar folga
                <span className="text-muted num">(restam {state.breaks.reserveLeft})</span>
              </button>
              {blocker ? (
                <span id="folga-motivo" className="sr-only">
                  {blocker}
                </span>
              ) : null}
            </li>
            <li>
              <Link href="/cursos" className="btn btn-quiet">
                Cursos
              </Link>
            </li>
            <li>
              <a href="/api/export" className="btn btn-quiet" download>
                Exportar dados
              </a>
            </li>
            <li>
              <form action={logout}>
                <button type="submit" className="btn btn-quiet">
                  Sair
                </button>
              </form>
            </li>
          </ul>
        </nav>
        <p className="text-small font-medium num md:pr-0">{seasonLine(state)}</p>
      </div>
    </header>
  );
}
