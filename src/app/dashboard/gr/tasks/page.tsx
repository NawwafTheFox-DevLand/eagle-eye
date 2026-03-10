import { getGRTasks, getGREntities } from '@/app/actions/gr';
import { createServiceClient } from '@/lib/supabase/server';
import { getSessionEmployee } from '@/app/actions/requests';
import TasksClient from './TasksClient';
export default async function GRTasksPage() {
  const [tasks, entities, employee] = await Promise.all([getGRTasks(), getGREntities(), getSessionEmployee()]);
  const service = await createServiceClient();
  const { data: employees } = await service.from('employees').select('id, full_name_ar, employee_code').eq('is_active', true);
  const roles = employee?.roles?.map((r: any) => r.role) || [];
  const isReadOnly = (roles.includes('super_admin') || roles.includes('ceo')) && !roles.includes('gr_employee') && !roles.includes('gr_manager');
  return <TasksClient tasks={tasks} entities={entities} employees={employees || []} isReadOnly={isReadOnly} />;
}
