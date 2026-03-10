import { getGRTaskDetail, getGREntities } from '@/app/actions/gr';
import { createServiceClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import TaskDetailClient from './TaskDetailClient';

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const detail = await getGRTaskDetail(id);
  if (!detail) notFound();

  const service = await createServiceClient();
  const { task, steps } = detail;

  // Batch lookup employees
  const empIds = [...new Set([task.assigned_to, task.requested_by, ...steps.map((s: any) => s.actor_id)].filter(Boolean))];
  const [{ data: employees }, entities] = await Promise.all([
    empIds.length > 0
      ? service.from('employees').select('id, full_name_ar, full_name_en').in('id', empIds)
      : Promise.resolve({ data: [] as any[] }),
    getGREntities(),
  ]);

  const empMap = new Map((employees || []).map((e: any) => [e.id, e]));
  const entity = entities.find((e: any) => e.id === task.entity_id) ?? null;

  return (
    <TaskDetailClient
      task={task}
      steps={steps}
      entity={entity}
      empMap={Object.fromEntries(empMap)}
    />
  );
}
