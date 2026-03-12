import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getGRAccess, getGRLicenses } from '@/app/actions/gr';
import GRLicensesClient from './GRLicensesClient';

export const dynamic = 'force-dynamic';

export default async function GRLicensesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const hasAccess = await getGRAccess();
  if (!hasAccess) redirect('/dashboard');

  const { data: licenses, error } = await getGRLicenses();

  return <GRLicensesClient licenses={licenses} error={error} />;
}
