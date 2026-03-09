'use client';

import { useState, useTransition } from 'react';
import { createRequest, submitRequest } from '@/app/actions/requests';

const typeIcons: Record<string, string> = {
  general_internal: '📝', intercompany: '🏢', cross_department: '🔀',
  fund_disbursement: '💰', leave_approval: '🏖️', promotion: '📈',
  demotion_disciplinary: '⚠️', create_department: '🏗️',
  create_company: '🏛️', create_position: '👤',
};

export default function NewRequestForm({ employee, configs, companies, departments }: any) {
  const [step, setStep] = useState<'type' | 'form'>('type');
  const [selectedType, setSelectedType] = useState<any>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function selectType(config: any) {
    setSelectedType(config);
    setStep('form');
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    const form = new FormData(e.currentTarget);
    form.set('request_type', selectedType.request_type);

    startTransition(async () => {
      try {
        const request = await createRequest(form);
        await submitRequest(request.id);
        setSuccess(`تم تقديم الطلب بنجاح — ${request.request_number}`);
      } catch (err: any) {
        setError(err.message || 'حدث خطأ أثناء التقديم');
      }
    });
  }

  if (success) {
    return (
      <div className="bg-white rounded-2xl border border-emerald-200 p-8 text-center animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">✅</span>
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">تم تقديم الطلب</h2>
        <p className="text-sm text-slate-500 mb-6">{success}</p>
        <div className="flex gap-3 justify-center">
          <a href="/dashboard/requests" className="btn-primary text-sm">عرض طلباتي</a>
          <button onClick={() => { setSuccess(''); setStep('type'); setSelectedType(null); }}
            className="px-6 py-3 rounded-xl text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50">
            طلب جديد
          </button>
        </div>
      </div>
    );
  }

  if (step === 'type') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {configs.map((config: any) => (
          <button key={config.request_type} onClick={() => selectType(config)}
            className="flex items-center gap-4 p-5 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-eagle-200 transition-all text-start group">
            <span className="text-2xl">{typeIcons[config.request_type] || '📋'}</span>
            <div>
              <p className="font-semibold text-slate-900 group-hover:text-eagle-600 transition-colors">{config.name_ar}</p>
              <p className="text-xs text-slate-500">{config.name_en}</p>
            </div>
          </button>
        ))}
      </div>
    );
  }

  const isFinancial = selectedType.request_type === 'fund_disbursement';
  const isLeave = selectedType.request_type === 'leave_approval';
  const isIntercompany = ['intercompany', 'cross_department'].includes(selectedType.request_type);

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-slide-up">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
        <button type="button" onClick={() => { setStep('type'); setSelectedType(null); }}
          className="text-slate-400 hover:text-slate-600">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
        <span className="text-xl">{typeIcons[selectedType.request_type] || '📋'}</span>
        <div>
          <h2 className="font-semibold text-slate-900">{selectedType.name_ar}</h2>
          <p className="text-xs text-slate-500">{selectedType.name_en}</p>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {error && (
          <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
        )}

        {/* Subject */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">الموضوع <span className="text-red-500">*</span></label>
          <input name="subject" required className="input-field" placeholder="عنوان الطلب" />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">التفاصيل</label>
          <textarea name="description" rows={4} className="input-field" placeholder="وصف تفصيلي للطلب..." />
        </div>

        {/* Priority */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">الأولوية</label>
          <select name="priority" className="input-field">
            <option value="low">منخفضة</option>
            <option value="normal" selected>عادية</option>
            <option value="high">عالية</option>
            <option value="urgent">عاجلة</option>
          </select>
        </div>

        {/* Destination (for intercompany/cross-dept) */}
        {isIntercompany && (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">الشركة المستقبلة</label>
              <select name="destination_company_id" className="input-field">
                <option value="">اختر الشركة</option>
                {companies.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name_ar} ({c.code})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">القسم المستقبل</label>
              <select name="destination_dept_id" className="input-field">
                <option value="">اختر القسم</option>
                {departments.map((d: any) => (
                  <option key={d.id} value={d.id}>{d.name_ar} ({d.code})</option>
                ))}
              </select>
            </div>
          </>
        )}

        {/* Financial fields */}
        {isFinancial && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">المبلغ <span className="text-red-500">*</span></label>
              <input name="amount" type="number" step="0.01" required className="input-field" dir="ltr" placeholder="0.00" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">العملة</label>
              <select name="currency" className="input-field">
                <option value="SAR">ريال سعودي (SAR)</option>
                <option value="USD">دولار أمريكي (USD)</option>
                <option value="EUR">يورو (EUR)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">المستفيد</label>
              <input name="payee" className="input-field" placeholder="اسم المستفيد" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">مركز التكلفة</label>
              <input name="cost_center" className="input-field" placeholder="رمز مركز التكلفة" />
            </div>
          </div>
        )}

        {/* Leave fields */}
        {isLeave && (
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">نوع الإجازة</label>
              <select name="leave_type" className="input-field">
                <option value="annual">سنوية</option>
                <option value="sick">مرضية</option>
                <option value="emergency">طارئة</option>
                <option value="unpaid">بدون راتب</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">من تاريخ</label>
              <input name="leave_start_date" type="date" className="input-field" dir="ltr" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">إلى تاريخ</label>
              <input name="leave_end_date" type="date" className="input-field" dir="ltr" />
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-slate-100 flex items-center gap-3 justify-end bg-slate-50">
        <button type="button" onClick={() => { setStep('type'); setSelectedType(null); }}
          className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors">
          إلغاء
        </button>
        <button type="submit" disabled={isPending} className="btn-primary text-sm disabled:opacity-50">
          {isPending ? 'جاري التقديم...' : 'تقديم الطلب'}
        </button>
      </div>
    </form>
  );
}
