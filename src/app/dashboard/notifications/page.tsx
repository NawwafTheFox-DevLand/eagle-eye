import { createServiceClient } from '@/lib/supabase/server';
import { getSessionEmployee } from '@/app/actions/requests';
import { redirect } from 'next/navigation';
import NotificationsClient from './NotificationsClient';

export default async function NotificationsPage() {
  const [service, employee] = await Promise.all([
    createServiceClient(),
    getSessionEmployee(),
  ]);
  if (!employee) redirect('/login');

  const { data: notifications } = await service
    .from('notifications')
    .select('id, type, title_ar, title_en, body_ar, body_en, is_read, created_at, action_url')
    .eq('recipient_id', employee.id)
    .order('created_at', { ascending: false })
    .limit(100);

  // Mark all as read (fire & forget)
  service
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('recipient_id', employee.id)
    .eq('is_read', false)
    .then(() => {});

  return (
    <NotificationsClient
      notifications={notifications || []}
      employeeId={employee.id}
    />
  );
}
