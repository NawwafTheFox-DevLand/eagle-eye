'use server';

import { createClient, createServiceClient } from '@/lib/supabase/server';

async function getActorEmployee() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const service = await createServiceClient();
  const { data: employee } = await service
    .from('employees').select('id').eq('auth_user_id', user.id).single();
  return employee ? { service, employeeId: employee.id } : null;
}

export async function getRecentNotifications() {
  const ctx = await getActorEmployee();
  if (!ctx) return [];
  const { service, employeeId } = ctx;
  const { data } = await service
    .from('notifications')
    .select('id, type, title_ar, title_en, body_ar, body_en, is_read, created_at, action_url')
    .eq('recipient_id', employeeId)
    .order('created_at', { ascending: false })
    .limit(8);
  return data || [];
}

export async function markAllNotificationsRead() {
  const ctx = await getActorEmployee();
  if (!ctx) return;
  const { service, employeeId } = ctx;
  await service
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('recipient_id', employeeId)
    .eq('is_read', false);
}

export async function markNotificationRead(notificationId: string) {
  const ctx = await getActorEmployee();
  if (!ctx) return;
  const { service } = ctx;
  await service
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', notificationId);
}
