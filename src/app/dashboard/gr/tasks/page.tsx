import { getGRTasks, getGREntities } from '@/app/actions/gr';
import { createServiceClient } from '@/lib/supabase/server';
import TasksClient from './TasksClient';
export default async function GRTasksPage() {
  const [tasks, entities] = await Promise.all([getGRTasks(), getGREntities()]);
  const service = await createServiceClient();
  const { data: employees } = await service.from('employees').select('id, full_name_ar, employee_code').eq('is_active', true);
  return <TasksClient tasks={tasks} entities={entities} employees={employees || []} />;
}
