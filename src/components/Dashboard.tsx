'use client';

// O painel (DESIGN.md, seção 5): cabeçalho, a barra no alto, "Hoje" ao lado do chefe
// e a faixa de baixo com personagem, nota, Fundo, cursos e baús. Depende só do GameState
// (e, opcionalmente, dos registros, para a gaveta listar sessões e oferecer "Desfazer").

import { useState } from 'react';
import type { ForjaRecord, GameState } from '@/lib/types';
import { BossPanel } from './BossPanel';
import { CharacterPanel } from './CharacterPanel';
import { ChestsPanel } from './ChestsPanel';
import { CoursesPanel } from './CoursesPanel';
import { DayDrawer } from './DayDrawer';
import { BreakDialog } from './dialogs/BreakDialog';
import { CardioDialog } from './dialogs/CardioDialog';
import { ClientDialog } from './dialogs/ClientDialog';
import { ManualStudyDialog } from './dialogs/ManualStudyDialog';
import { StopSessionDialog } from './dialogs/StopSessionDialog';
import { Dialog, ToastProvider } from './feedback';
import { FundPanel } from './FundPanel';
import { GradeMark } from './GradeMark';
import { Header } from './Header';
import { SeasonBar } from './SeasonBar';
import { TodayPanel, type StopInfo } from './TodayPanel';

type DialogState =
  | { kind: 'study'; day: string }
  | { kind: 'cardio'; day: string }
  | { kind: 'client' }
  | { kind: 'break' }
  | { kind: 'stop'; info: StopInfo }
  | null;

export function Dashboard({ state, records }: { state: GameState; records?: ForjaRecord[] }) {
  return (
    <ToastProvider>
      <DashboardBody state={state} records={records} />
    </ToastProvider>
  );
}

function DashboardBody({ state, records }: { state: GameState; records?: ForjaRecord[] }) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);
  const selectedDay = selectedDate ? (state.days.find((d) => d.date === selectedDate) ?? null) : null;
  const close = () => setDialog(null);

  return (
    <div className="mx-auto w-full max-w-[1776px] px-4 pb-6 pt-4 md:px-8 desk:px-12 desk:pb-4 desk:pt-5">
      <Header
        state={state}
        onRegisterStudy={() => setDialog({ kind: 'study', day: state.today })}
        onUseBreak={() => setDialog({ kind: 'break' })}
      />

      <main>
        <h2 className="sr-only">Barra da temporada</h2>
        <div className="mt-4 desk:mt-3">
          <SeasonBar state={state} onSelectDay={setSelectedDate} />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-x-12 gap-y-10 md:mt-3 md:grid-cols-2 lg:grid-cols-12">
          <div className="lg:col-span-7 desk:min-h-[15rem]">
            <TodayPanel
              state={state}
              onOpenCardio={(day) => setDialog({ kind: 'cardio', day })}
              onStopSession={(info) => setDialog({ kind: 'stop', info })}
            />
          </div>
          <div className="lg:col-span-5">
            <BossPanel state={state} />
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-x-8 gap-y-10 md:grid-cols-2 lg:grid-cols-6 desk:mt-8 desk:grid-cols-5">
          <div className="lg:col-span-2 desk:col-span-1">
            <CharacterPanel state={state} />
          </div>
          <div className="lg:col-span-2 desk:col-span-1">
            <GradeMark state={state} />
          </div>
          <div className="lg:col-span-2 desk:col-span-1">
            <FundPanel state={state} onOpenClient={() => setDialog({ kind: 'client' })} />
          </div>
          <div className="lg:col-span-3 desk:col-span-1">
            <CoursesPanel state={state} />
          </div>
          <div className="lg:col-span-3 desk:col-span-1">
            <ChestsPanel state={state} />
          </div>
        </div>
      </main>

      <DayDrawer
        state={state}
        day={selectedDay}
        records={records}
        onClose={() => setSelectedDate(null)}
        onRegisterStudy={(day) => {
          setSelectedDate(null);
          setDialog({ kind: 'study', day });
        }}
        onRegisterCardio={(day) => {
          setSelectedDate(null);
          setDialog({ kind: 'cardio', day });
        }}
      />

      <Dialog open={dialog?.kind === 'study'} onClose={close} title="Registrar estudo">
        {dialog?.kind === 'study' ? <ManualStudyDialog state={state} initialDay={dialog.day} onClose={close} /> : null}
      </Dialog>
      <Dialog open={dialog?.kind === 'cardio'} onClose={close} title="Marcar cardio">
        {dialog?.kind === 'cardio' ? <CardioDialog state={state} initialDay={dialog.day} onClose={close} /> : null}
      </Dialog>
      <Dialog open={dialog?.kind === 'client'} onClose={close} title="Cliente fechado">
        <ClientDialog onClose={close} />
      </Dialog>
      <Dialog open={dialog?.kind === 'break'} onClose={close} title="Usar folga">
        <BreakDialog state={state} onClose={close} />
      </Dialog>
      <Dialog open={dialog?.kind === 'stop'} onClose={close} title="Encerrar sessão">
        {dialog?.kind === 'stop' ? <StopSessionDialog state={state} info={dialog.info} onClose={close} /> : null}
      </Dialog>
    </div>
  );
}
