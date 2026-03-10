import { createServiceClient } from '@/lib/supabase/server';
import { getSessionEmployee } from '@/app/actions/requests';
import NewRequestForm from './NewRequestForm';

export default async function NewRequestPage() {
  const [service, employee] = await Promise.all([
    createServiceClient(),
    getSessionEmployee(),
  ]);

  const { data: configs } = await service
    .from('request_type_configs')
    .select('*')
    .eq('is_active', true)
    .order('name_ar');

  const { data: companies } = await service
    .from('companies')
    .select('id, code, name_ar, name_en')
    .eq('is_active', true)
    .order('name_ar');

  const { data: departments } = await service
    .from('departments')
    .select('id, code, name_ar, name_en, company_id')
    .eq('is_active', true)
    .order('name_ar');

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">طلب جديد</h1>
        <p className="text-sm text-slate-500 mt-1">اختر نوع الطلب واملأ البيانات المطلوبة</p>
      </div>
      <NewRequestForm employee={employee} configs={configs || []} companies={companies || []} departments={departments || []} />
    </div>
  );
}
