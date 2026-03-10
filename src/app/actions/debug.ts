'use server';

import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function debugAuth() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  console.log('DEBUG AUTH - user:', user?.id, user?.email, 'error:', error?.message);
  
  if (!user) return { step: 'auth', error: 'No user from getUser()' };

  const service = await createServiceClient();
  const { data: employee, error: empErr } = await service
    .from('employees')
    .select('id, employee_code, full_name_ar, auth_user_id, email')
    .eq('auth_user_id', user.id)
    .single();

  console.log('DEBUG EMP - employee:', employee, 'error:', empErr?.message);

  return { 
    auth_user_id: user.id, 
    auth_email: user.email,
    employee: employee,
    emp_error: empErr?.message 
  };
}
