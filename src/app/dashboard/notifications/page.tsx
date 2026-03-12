import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import NotificationsClient from './NotificationsClient';

export const dynamic = 'force-dynamic';

export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const service = await createServiceClient();

  const { data: emp } = await service
    .from('employees').select('id').eq('auth_user_id', user.id).single();
  if (!emp) redirect('/login');

  const { data: notifications } = await service
    .from('notifications')
    .select('id, type, title_ar, title_en, body_ar, body_en, is_read, created_at, action_url')
    .eq('recipient_id', emp.id)
    .order('created_at', { ascending: false })
    .limit(100);

  // Mark all as read (fire and forget)
  service.from('notifications').update({ is_read: true })
    .eq('recipient_id', emp.id).eq('is_read', false).then(() => {});

  return <NotificationsClient notifications={notifications || []} />;
}
