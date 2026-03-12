'use server';
import { createServiceClient } from '@/lib/supabase/server';
import { getSessionEmployee } from './requests';

export async function uploadEvidence(requestId: string, formData: FormData): Promise<{ data: any[]; error: string | null }> {
  try {
    const employee = await getSessionEmployee();
    if (!employee) return { data: [], error: 'غير مصرح' };

    const service = await createServiceClient();
    const files = formData.getAll('files') as File[];
    if (!files || files.length === 0) return { data: [], error: null };

    const results: any[] = [];

    for (const file of files) {
      const timestamp = Date.now();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `${requestId}/${timestamp}_${safeName}`;

      const arrayBuffer = await file.arrayBuffer();
      const { error: uploadError } = await service.storage
        .from('evidence')
        .upload(filePath, arrayBuffer, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        console.error('[uploadEvidence] storage upload error:', uploadError);
        continue;
      }

      const { data: urlData } = service.storage.from('evidence').getPublicUrl(filePath);
      const fileUrl = urlData?.publicUrl ?? filePath;

      const { data: evidenceRow, error: insertError } = await service
        .from('evidence')
        .insert({
          request_id: requestId,
          file_name: file.name,
          file_url: fileUrl,
          file_type: file.type,
          file_size: file.size,
          uploaded_by: employee.id,
        })
        .select()
        .single();

      if (!insertError && evidenceRow) {
        results.push(evidenceRow);
      }
    }

    return { data: results, error: null };
  } catch (e: any) {
    console.error('[uploadEvidence] caught:', e);
    return { data: [], error: String(e?.message ?? e) };
  }
}
