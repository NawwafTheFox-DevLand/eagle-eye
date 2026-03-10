import { createServiceClient } from '@/lib/supabase/server';
import SearchClient from './SearchClient';

export default async function SearchPage() {
  const service = await createServiceClient();
  const [{ data: companies }, { data: departments }] = await Promise.all([
    service.from('companies').select('id, name_ar, name_en').order('name_ar'),
    service.from('departments').select('id, name_ar, name_en').order('name_ar'),
  ]);
  return <SearchClient companies={companies || []} departments={departments || []} />;
}
