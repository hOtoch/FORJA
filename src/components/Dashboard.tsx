'use client';

// O painel (revisão 2 do DESIGN.md): cartões agrupados por pergunta. Primeiro o que fazer
// hoje e a semana; os contadores e as tarefas; depois a temporada; o personagem, o Fundo e a
// nota; o foco e os cursos; por fim os baús. Fundo e baús só aparecem se a temporada os usa.
// Depende só do GameState
// (e, opcionalmente, dos registros, para a gaveta listar sessões e oferecer "Desfazer").

import { useState } from 'react';
import { season } from '@/config/season';
import type { ForjaRecord, GameState } from '@/lib/types';
import { BossPanel } from './BossPanel';
import { CharacterPanel } from './CharacterPanel';
import { ChestsPanel } from './ChestsPanel';
import { CountersPanel } from './CountersPanel';
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
import { RescuePanel } from './RescuePanel';
import { SeasonCard } from './SeasonCard';
import { StudyChartCard } from './StudyChartCard';
import { TasksPanel } from './TasksPanel';
import { TodayPanel, type StopInfo } from './TodayPanel';

type DialogState =
  | { kind: 'study'; day: string; block?: string }
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
  // o registro manual abre no primeiro bloco que ainda falta hoje
  const sources = (season.sources ?? season.blocks).map((s) => s.id);
  const firstOpen = state.todayInfo?.blocks.find((b) => b.goal > 0 && !b.met)?.id;
  const openBlock = firstOpen && sources.includes(firstOpen) ? firstOpen : 'estudo';
  const fund = season.features.fund;

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 pb-10 pt-3 md:px-8">
      <Header
        state={state}
        onRegisterStudy={() => setDialog({ kind: 'study', day: state.today, block: openBlock })}
        onUseBreak={() => setDialog({ kind: 'break' })}
      />

      <main className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* 1. o que fazer hoje e a semana */}
        <div className="lg:col-span-7">
          <TodayPanel
            state={state}
            records={records}
            onOpenCardio={(day) => setDialog({ kind: 'cardio', day })}
            onStopSession={(info) => setDialog({ kind: 'stop', info })}
          />
        </div>
        <div className="flex flex-col gap-5 lg:col-span-5">
          <RescuePanel state={state} />
          <div className="flex-1">
            <BossPanel state={state} />
          </div>
        </div>

        {/* 2. os contadores da semana e as tarefas avulsas */}
        {season.counters.length > 0 ? (
          <div className="lg:col-span-5">
            <CountersPanel state={state} />
          </div>
        ) : null}
        <div className={season.counters.length > 0 ? 'lg:col-span-7' : 'lg:col-span-12'}>
          <TasksPanel state={state} />
        </div>

        {/* 3. a temporada inteira */}
        <div className="lg:col-span-12">
          <SeasonCard state={state} onSelectDay={setSelectedDate} />
        </div>

        {/* 4. o progresso do personagem */}
        <div className={fund ? 'lg:col-span-4' : 'lg:col-span-6'}>
          <CharacterPanel state={state} />
        </div>
        {fund ? (
          <div className="lg:col-span-4">
            <FundPanel state={state} onOpenClient={() => setDialog({ kind: 'client' })} />
          </div>
        ) : null}
        <div className={fund ? 'lg:col-span-4' : 'lg:col-span-6'}>
          <GradeMark state={state} />
        </div>

        {/* 5. foco e cursos */}
        <div className="lg:col-span-7">
          <StudyChartCard state={state} />
        </div>
        <div className="lg:col-span-5">
          <CoursesPanel state={state} />
        </div>

        {/* 6. recompensas */}
        {season.features.chests ? (
          <div className="lg:col-span-12">
            <ChestsPanel state={state} />
          </div>
        ) : null}
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

      <Dialog open={dialog?.kind === 'study'} onClose={close} title="Registrar tempo">
        {dialog?.kind === 'study' ? (
          <ManualStudyDialog state={state} initialDay={dialog.day} initialBlock={dialog.block} onClose={close} />
        ) : null}
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
