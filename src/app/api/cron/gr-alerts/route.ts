import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

// Called daily by an external cron service (e.g. Vercel Cron, GitHub Actions)
// Requires header: Authorization: Bearer <CRON_SECRET>
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const service = await createServiceClient();
  const today = new Date();

  // Fetch all active licenses with expiry dates
  const { data: licenses } = await service
    .from('gr_licenses')
    .select('id, entity_id, license_type, license_number, expiry_date, status')
    .eq('status', 'active')
    .not('expiry_date', 'is', null);

  if (!licenses || licenses.length === 0) {
    return NextResponse.json({ created: 0, checked: 0 });
  }

  const THRESHOLDS = [90, 60, 30, 7, 0];
  let created = 0;

  for (const license of licenses) {
    const expiry = new Date(license.expiry_date);
    const msLeft = expiry.getTime() - today.getTime();
    const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));

    for (const threshold of THRESHOLDS) {
      if (daysLeft <= threshold) {
        // Check if alert already exists for this license + threshold
        const { data: existing } = await service
          .from('gr_alerts')
          .select('id')
          .eq('license_id', license.id)
          .eq('alert_type', `expiry_${threshold}d`)
          .maybeSingle();

        if (!existing) {
          const isExpired = daysLeft <= 0;
          const { error } = await service.from('gr_alerts').insert({
            entity_id: license.entity_id,
            license_id: license.id,
            alert_type: `expiry_${threshold}d`,
            alert_date: today.toISOString().split('T')[0],
            days_until_expiry: daysLeft,
            severity: daysLeft <= 0 ? 'critical' : daysLeft <= 7 ? 'high' : daysLeft <= 30 ? 'medium' : 'low',
            title_ar: isExpired
              ? `ترخيص منتهي الصلاحية: ${license.license_number}`
              : `تنبيه انتهاء ترخيص خلال ${daysLeft} يوم: ${license.license_number}`,
            title_en: isExpired
              ? `Expired License: ${license.license_number}`
              : `License Expiring in ${daysLeft} days: ${license.license_number}`,
            is_acknowledged: false,
          });
          if (!error) created++;
        }
        break; // Only create alert for the highest applicable threshold
      }
    }
  }

  return NextResponse.json({ created, checked: licenses.length });
}
