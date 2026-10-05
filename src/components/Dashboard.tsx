'use client';

// O painel (revisão 2 do DESIGN.md): cartões agrupados por pergunta. Primeiro o que fazer
// hoje e a semana; depois a temporada; o personagem, o Fundo e a nota; o estudo e os cursos;
// por fim os baús. Depende só do GameState
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
import { SeasonCard } from './SeasonCard';
import { StudyChartCard } from './StudyChartCard';
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
    <div className="mx-auto w-full max-w-[1440px] px-4 pb-10 pt-3 md:px-8">
      <Header
        state={state}
        onRegisterStudy={() => setDialog({ kind: 'study', day: state.today })}
        onUseBreak={() => setDialog({ kind: 'break' })}
      />

      <main className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* 1. o que fazer hoje e a semana */}
        <div className="lg:col-span-7">
          <TodayPanel
            state={state}
            onOpenCardio={(day) => setDialog({ kind: 'cardio', day })}
            onStopSession={(info) => setDialog({ kind: 'stop', info })}
          />
        </div>
        <div className="lg:col-span-5">
          <BossPanel state={state} />
        </div>

        {/* 2. a temporada inteira */}
        <div className="lg:col-span-12">
          <SeasonCard state={state} onSelectDay={setSelectedDate} />
        </div>

        {/* 3. o progresso do personagem */}
        <div className="lg:col-span-4">
          <CharacterPanel state={state} />
        </div>
        <div className="lg:col-span-4">
          <FundPanel state={state} onOpenClient={() => setDialog({ kind: 'client' })} />
        </div>
        <div className="lg:col-span-4">
          <GradeMark state={state} />
        </div>

        {/* 4. estudo e cursos */}
        <div className="lg:col-span-7">
          <StudyChartCard state={state} />
        </div>
        <div className="lg:col-span-5">
          <CoursesPanel state={state} />
        </div>

        {/* 5. recompensas */}
        <div className="lg:col-span-12">
          <ChestsPanel state={state} />
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
