import { createServiceClient } from '@/lib/supabase/server';
import { getSessionEmployee } from '@/app/actions/requests';
import { redirect } from 'next/navigation';
import NotificationsClient from './NotificationsClient';

export default async function NotificationsPage() {
  const employee = await getSessionEmployee();
  if (!employee) redirect('/login');

  const service = await createServiceClient();

  const { data: notifications } = await service
    .from('notifications')
    .select('*')
    .eq('recipient_id', employee.id)
    .order('created_at', { ascending: false })
    .limit(100);

  // Mark unread as read (fire & forget)
  service
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('recipient_id', employee.id)
    .eq('is_read', false)
    .then(() => {});

  return <NotificationsClient notifications={notifications || []} />;
}
