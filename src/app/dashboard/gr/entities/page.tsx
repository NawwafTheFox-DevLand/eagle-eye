import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getGRAccess, getGREntities } from '@/app/actions/gr';
import GREntitiesClient from './GREntitiesClient';

export const dynamic = 'force-dynamic';

export default async function GREntitiesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const hasAccess = await getGRAccess();
  if (!hasAccess) redirect('/dashboard');

  const { data: entities, error } = await getGREntities();

  return <GREntitiesClient entities={entities} error={error} />;
}
