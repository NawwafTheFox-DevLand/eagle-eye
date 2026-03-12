import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getGRAccess, getGRViolations } from '@/app/actions/gr';
import GRViolationsClient from './GRViolationsClient';

export const dynamic = 'force-dynamic';

export default async function GRViolationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const hasAccess = await getGRAccess();
  if (!hasAccess) redirect('/dashboard');

  const { data: violations, error } = await getGRViolations();

  return <GRViolationsClient violations={violations} error={error} />;
}
