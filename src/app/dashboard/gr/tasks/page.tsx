import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getGRAccess, getGRTasks } from '@/app/actions/gr';
import GRTasksClient from './GRTasksClient';

export const dynamic = 'force-dynamic';

export default async function GRTasksPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const hasAccess = await getGRAccess();
  if (!hasAccess) redirect('/dashboard');

  const { data: tasks, error } = await getGRTasks();

  // Batch-fetch assignee names
  const assigneeIds = [...new Set(tasks.map((t: any) => t.assigned_to).filter(Boolean))] as string[];
  const empMap: Record<string, any> = {};
  if (assigneeIds.length > 0) {
    const service = await createServiceClient();
    const { data: emps } = await service.from('employees')
      .select('id, full_name_ar, full_name_en').in('id', assigneeIds);
    for (const e of emps || []) empMap[e.id] = e;
  }

  return <GRTasksClient tasks={tasks} empMap={empMap} error={error} />;
}
