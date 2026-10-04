import { Dashboard } from '@/components/Dashboard';
import { loadDashboard } from '@/lib/load-state';

export default async function Home() {
  const { state, records } = await loadDashboard();
  return <Dashboard state={state} records={records} />;
}
