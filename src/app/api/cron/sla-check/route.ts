import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization');
  const secret = process.env.CRON_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const service = await createServiceClient();

    // Fetch active requests
    const { data: requests } = await service
      .from('requests')
      .select('id, request_type, status, assigned_to, origin_company_id, destination_dept_id, submitted_at')
      .in('status', ['in_progress', 'pending_clarification'])
      .not('submitted_at', 'is', null);

    if (!requests || requests.length === 0) {
      return NextResponse.json({ processed: 0, warnings: 0, escalations: 0 });
    }

    // Fetch SLA configs
    const { data: slaConfigs } = await service
      .from('sla_configs')
      .select('request_type, target_hours, max_hours');
    const slaMap = new Map((slaConfigs || []).map((c: any) => [c.request_type, c]));

    // Fetch existing sla_alerts to deduplicate
    const requestIds = requests.map((r: any) => r.id);
    const { data: existingAlerts } = await service
      .from('sla_alerts')
      .select('request_id, alert_type, recipient_id')
      .in('request_id', requestIds);
    const alertSet = new Set(
      (existingAlerts || []).map((a: any) => `${a.request_id}:${a.alert_type}:${a.recipient_id}`)
    );

    // Fetch departments for dept head lookup
    const deptIds = [...new Set(requests.map((r: any) => r.destination_dept_id).filter(Boolean))] as string[];
    const { data: depts } = deptIds.length > 0
      ? await service.from('departments').select('id, head_employee_id').in('id', deptIds)
      : { data: [] as any[] };
    const deptMap = new Map((depts || []).map((d: any) => [d.id, d]));

    // Fetch companies for CEO lookup
    const companyIds = [...new Set(requests.map((r: any) => r.origin_company_id).filter(Boolean))] as string[];
    const { data: companies } = companyIds.length > 0
      ? await service.from('companies').select('id, ceo_employee_id, is_holding').in('id', companyIds)
      : { data: [] as any[] };
    const companyMap = new Map((companies || []).map((c: any) => [c.id, c]));

    // Fetch holding company CEOs
    const { data: holdingCos } = await service
      .from('companies')
      .select('id, ceo_employee_id')
      .eq('is_holding', true);
    const holdingCEOIds = [...new Set(
      (holdingCos || []).map((c: any) => c.ceo_employee_id).filter(Boolean)
    )] as string[];

    const now = Date.now();
    let warningCount = 0;
    let escalationCount = 0;

    for (const req of requests) {
      const sla = slaMap.get(req.request_type);
      if (!sla) continue;

      const hoursElapsed = (now - new Date(req.submitted_at).getTime()) / 3_600_000;
      const hoursRounded = Math.round(hoursElapsed * 100) / 100;

      // ── Warning: current holder + dept head ──────────────────────────────────
      if (hoursElapsed >= sla.target_hours) {
        const warnRecipients: string[] = [];
        if (req.assigned_to) warnRecipients.push(req.assigned_to);
        const dept = req.destination_dept_id ? deptMap.get(req.destination_dept_id) : null;
        if (dept?.head_employee_id && dept.head_employee_id !== req.assigned_to) {
          warnRecipients.push(dept.head_employee_id);
        }

        for (const recipientId of warnRecipients) {
          const key = `${req.id}:warning:${recipientId}`;
          if (alertSet.has(key)) continue;

          await service.from('sla_alerts').insert({
            request_id: req.id,
            alert_type: 'warning',
            recipient_id: recipientId,
            hours_elapsed: hoursRounded,
          });
          alertSet.add(key);

          await service.from('notifications').insert({
            recipient_id: recipientId,
            request_id: req.id,
            channel: 'in_app',
            type: 'sla_warning',
            title_ar: '⚠️ تحذير: تجاوز مدة SLA',
            title_en: '⚠️ SLA Warning',
            body_ar: `الطلب تجاوز ${Math.floor(hoursElapsed)} ساعة دون إجراء`,
            body_en: `Request has been pending for ${Math.floor(hoursElapsed)} hours`,
            action_url: `/dashboard/requests/${req.id}`,
            is_read: false,
          });

          warningCount++;
        }
      }

      // ── Escalation: company CEO + holding CEOs ───────────────────────────────
      if (hoursElapsed >= sla.max_hours) {
        const escalRecipients: string[] = [];
        const co = req.origin_company_id ? companyMap.get(req.origin_company_id) : null;
        if (co?.ceo_employee_id) escalRecipients.push(co.ceo_employee_id);
        for (const ceoId of holdingCEOIds) {
          if (!escalRecipients.includes(ceoId)) escalRecipients.push(ceoId);
        }

        for (const recipientId of escalRecipients) {
          const key = `${req.id}:escalation:${recipientId}`;
          if (alertSet.has(key)) continue;

          await service.from('sla_alerts').insert({
            request_id: req.id,
            alert_type: 'escalation',
            recipient_id: recipientId,
            hours_elapsed: hoursRounded,
          });
          alertSet.add(key);

          await service.from('notifications').insert({
            recipient_id: recipientId,
            request_id: req.id,
            channel: 'in_app',
            type: 'sla_escalation',
            title_ar: '🚨 تصعيد: طلب متأخر جداً',
            title_en: '🚨 SLA Escalation',
            body_ar: `الطلب تجاوز ${Math.floor(hoursElapsed)} ساعة — يتطلب تدخلاً فورياً`,
            body_en: `Request has been pending ${Math.floor(hoursElapsed)} hours — immediate action required`,
            action_url: `/dashboard/requests/${req.id}`,
            is_read: false,
          });

          escalationCount++;
        }
      }
    }

    return NextResponse.json({
      processed: requests.length,
      warnings: warningCount,
      escalations: escalationCount,
    });
  } catch (err: any) {
    console.error('[sla-check]', err);
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 });
  }
}
