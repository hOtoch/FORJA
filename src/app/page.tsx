import { Dashboard } from '@/components/Dashboard';
import { getSampleRecords, getSampleState, getSampleStateWithTimer } from '@/lib/game/fixture';

// Até a integração (T062), o painel usa o GameState de exemplo.
// Para ver o timer: ?demo=timer, ?demo=presenca ou ?demo=pausado.
export default async function Home({ searchParams }: PageProps<'/'>) {
  const { demo } = await searchParams;
  const state =
    demo === 'timer'
      ? getSampleStateWithTimer('running')
      : demo === 'presenca'
        ? getSampleStateWithTimer('presence')
        : demo === 'pausado'
          ? getSampleStateWithTimer('paused')
          : getSampleState();
  return <Dashboard state={state} records={getSampleRecords()} />;
}
