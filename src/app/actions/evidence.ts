'use server';

import { createClient, createServiceClient } from '@/lib/supabase/server';

const ALLOWED_TYPES = new Set([
  'application/pdf',
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export async function uploadEvidence(requestId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const service = await createServiceClient();
  const { data: employee } = await service
    .from('employees')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();
  if (!employee) throw new Error('Employee not found');

  const files = formData.getAll('files') as File[];

  for (const file of files) {
    if (!file.size) continue;
    if (file.size > MAX_BYTES) throw new Error(`${file.name}: file exceeds 10 MB limit`);
    if (!ALLOWED_TYPES.has(file.type)) throw new Error(`${file.name}: file type not allowed`);

    // Build a unique storage path under the request folder
    const ext        = file.name.split('.').pop() ?? 'bin';
    const unique     = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const filePath   = `${requestId}/${unique}`;
    const buffer     = Buffer.from(await file.arrayBuffer());

    const { error: uploadErr } = await service.storage
      .from('evidence')
      .upload(filePath, buffer, { contentType: file.type, upsert: false });

    if (uploadErr) throw new Error(`Storage upload failed: ${uploadErr.message}`);

    const { error: dbErr } = await service.from('evidence').insert({
      request_id:  requestId,
      uploader_id: employee.id,
      file_name:   file.name,
      file_path:   filePath,
      file_size_bytes: file.size,
      mime_type:   file.type,
        evidence_type: 'document',
    });

    if (dbErr) throw new Error(`Evidence record failed: ${dbErr.message}`);
  }
}
