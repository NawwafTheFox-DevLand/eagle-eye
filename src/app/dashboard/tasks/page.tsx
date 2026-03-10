import { createServiceClient } from '@/lib/supabase/server';
import { getSessionEmployee } from '@/app/actions/requests';
import { redirect } from 'next/navigation';
import TasksClient, { type TaskItem } from './TasksClient';

export default async function MyTasksPage() {
  const [service, employee] = await Promise.all([
    createServiceClient(),
    getSessionEmployee(),
  ]);

  if (!employee) redirect('/login');

  const ACTIVE_STATUSES = ['in_progress', 'assigned_to_employee'];

  // ── 1. Active tasks assigned to this employee ─────────────────────
  const [{ data: activeReqs }, { data: completedReqs }] = await Promise.all([
    service.from('requests')
      .select('id, request_number, subject, request_type, status, priority, created_at, requester_id, origin_company_id, destination_dept_id, assigned_to')
      .eq('assigned_to', employee.id)
      .in('status', ACTIVE_STATUSES)
      .order('created_at', { ascending: false }),
    service.from('requests')
      .select('id, request_number, subject, request_type, status, priority, created_at, requester_id, origin_company_id, destination_dept_id, assigned_to')
      .eq('assigned_to', employee.id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  const allReqs = [...(activeReqs || []), ...(completedReqs || [])];

  if (allReqs.length === 0) {
    return <TasksClient activeTasks={[]} completedTasks={[]} currentEmployeeId={employee.id} />;
  }

  // ── 2. Batch-fetch requester names and companies ──────────────────
  const requesterIds = [...new Set(allReqs.map(r => r.requester_id).filter(Boolean))];
  const companyIds   = [...new Set(allReqs.map(r => r.origin_company_id).filter(Boolean))];
  const requestIds   = allReqs.map(r => r.id);

  const [{ data: requesters }, { data: companies }, { data: assignActions }] = await Promise.all([
    requesterIds.length > 0
      ? service.from('employees').select('id, full_name_ar, full_name_en').in('id', requesterIds)
      : Promise.resolve({ data: [] as any[] }),
    companyIds.length > 0
      ? service.from('companies').select('id, name_ar, name_en').in('id', companyIds)
      : Promise.resolve({ data: [] as any[] }),
    // Find who assigned / auto-assigned each request
    service.from('request_actions')
      .select('request_id, action, actor_id, created_at')
      .in('request_id', requestIds)
      .in('action', ['assigned_to_employee', 'auto_assigned'])
      .order('created_at', { ascending: false }),
  ]);

  // ── 3. Fetch actor names for assign actions ───────────────────────
  const actorIds = [...new Set((assignActions || []).map(a => a.actor_id).filter(Boolean))];
  const { data: actors } = actorIds.length > 0
    ? await service.from('employees').select('id, full_name_ar, full_name_en').in('id', actorIds)
    : { data: [] as any[] };

  // ── 4. Build lookup maps ──────────────────────────────────────────
  const empMap    = new Map((requesters || []).map(e => [e.id, e]));
  const coMap     = new Map((companies  || []).map(c => [c.id, c]));
  const actorMap  = new Map((actors     || []).map(a => [a.id, a]));

  // Latest assign action per request
  const assignMap = new Map<string, { action: string; actor_id: string; created_at: string }>();
  (assignActions || []).forEach(a => {
    if (!assignMap.has(a.request_id)) assignMap.set(a.request_id, a);
  });

  // ── 5. Assemble TaskItems ─────────────────────────────────────────
  function buildTaskItem(req: any): TaskItem {
    const requester  = empMap.get(req.requester_id);
    const company    = coMap.get(req.origin_company_id);
    const assignEvt  = assignMap.get(req.id);
    const assignActor = assignEvt?.actor_id ? actorMap.get(assignEvt.actor_id) : null;
    const isAuto     = assignEvt?.action === 'auto_assigned';

    return {
      requestId:        req.id,
      requestNumber:    req.request_number,
      subject:          req.subject,
      requestType:      req.request_type,
      status:           req.status,
      priority:         req.priority,
      createdAt:        req.created_at,
      requesterNameAr:  requester?.full_name_ar  ?? '',
      requesterNameEn:  requester?.full_name_en  ?? null,
      companyNameAr:    company?.name_ar         ?? '',
      companyNameEn:    company?.name_en         ?? null,
      assignedByNameAr: isAuto ? '' : (assignActor?.full_name_ar ?? ''),
      assignedByNameEn: isAuto ? null : (assignActor?.full_name_en ?? null),
      assignedAt:       assignEvt?.created_at    ?? req.created_at,
      isAutoAssigned:   isAuto,
    };
  }

  const activeTasks    = (activeReqs    || []).map(buildTaskItem);
  const completedTasks = (completedReqs || []).map(buildTaskItem);

  return <TasksClient activeTasks={activeTasks} completedTasks={completedTasks} currentEmployeeId={employee.id} />;
}
