import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getGRAccess, getGRCommittees } from '@/app/actions/gr';
import GRCommitteesClient from './GRCommitteesClient';

export const dynamic = 'force-dynamic';

export default async function GRCommitteesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const hasAccess = await getGRAccess();
  if (!hasAccess) redirect('/dashboard');

  const { data: committees, error } = await getGRCommittees();

  return <GRCommitteesClient committees={committees} error={error} />;
}
