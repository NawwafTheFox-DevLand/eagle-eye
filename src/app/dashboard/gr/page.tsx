import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getGRStats, getGRAccess } from '@/app/actions/gr';
import GRDashboardClient from './GRDashboardClient';

export const dynamic = 'force-dynamic';

export default async function GRPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const hasAccess = await getGRAccess();
  if (!hasAccess) redirect('/dashboard');

  const stats = await getGRStats();

  return <GRDashboardClient stats={stats} />;
}
