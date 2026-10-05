'use client';

// Cabeçalho (revisão 2): o nome, a navegação entre as telas e as ações de registro.
// Exportar e Sair ficam num menu, para não competir com o que se usa todo dia.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logout } from '@/app/actions';
import type { GameState } from '@/lib/types';
import { useToast } from './feedback';

function breakBlocker(state: GameState): string | null {
  if (state.phase !== 'active') return 'A temporada não está em andamento.';
  if (state.todayInfo?.breakKind) return 'Hoje já é folga.';
  if (state.breaks.reserveLeft <= 0) return 'Não restam folgas de reserva.';
  if (!state.breaks.canUseToday) return 'Hoje não dá para usar folga.';
  return null;
}

interface Props {
  state?: GameState;
  onRegisterStudy?: () => void;
  onUseBreak?: () => void;
}

export function Header({ state, onRegisterStudy, onUseBreak }: Props) {
  const toast = useToast();
  const path = usePathname();
  const blocker = state ? breakBlocker(state) : null;
  const tabs = [
    { href: '/', label: 'Painel' },
    { href: '/mapa', label: 'Mapa' },
    { href: '/cursos', label: 'Cursos' },
  ];

  return (
    <header className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3 border-b border-line pb-3">
      <div className="flex items-center gap-8">
        <Link href="/" className="font-gothic text-[2.25rem] leading-10 font-extrabold" aria-label="Forja, painel">
          Forja
        </Link>
        <nav aria-label="Telas">
          <ul className="flex items-center gap-1">
            {tabs.map((t) => {
              const active = path === t.href;
              return (
                <li key={t.href}>
                  <Link
                    href={t.href}
                    aria-current={active ? 'page' : undefined}
                    className={`btn btn-quiet ${active ? 'font-bold underline decoration-2 underline-offset-[10px]' : ''}`}
                  >
                    {t.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      <div className="flex items-center gap-2">
        {state && onUseBreak ? (
          <>
            <button
              type="button"
              className="btn btn-quiet"
              aria-disabled={blocker ? true : undefined}
              aria-describedby={blocker ? 'folga-motivo' : undefined}
              onClick={() => (blocker ? toast(blocker, { tone: 'error' }) : onUseBreak())}
            >
              Usar folga <span className="text-muted num">({state.breaks.reserveLeft})</span>
            </button>
            {blocker ? (
              <span id="folga-motivo" className="sr-only">
                {blocker}
              </span>
            ) : null}
          </>
        ) : null}
        {onRegisterStudy ? (
          <button type="button" className="btn btn-outline" onClick={onRegisterStudy}>
            Registrar estudo
          </button>
        ) : null}
        <details className="relative">
          <summary className="btn btn-quiet list-none [&::-webkit-details-marker]:hidden" aria-label="Mais opções">
            <span aria-hidden="true" className="text-lead leading-none">
              ⋯
            </span>
          </summary>
          <div className="absolute right-0 z-20 mt-1 w-44 rounded-[10px] border border-line bg-surface p-1 shadow-lg">
            <a href="/api/export" className="btn btn-quiet w-full justify-start" download>
              Exportar dados
            </a>
            <form action={logout}>
              <button type="submit" className="btn btn-quiet w-full justify-start">
                Sair
              </button>
            </form>
          </div>
        </details>
      </div>
    </header>
  );
}
