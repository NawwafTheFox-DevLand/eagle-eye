'use client';

import { useState, useTransition, useRef, useMemo } from 'react';
import { createRequest, submitRequest } from '@/app/actions/requests';
import { uploadEvidence } from '@/app/actions/evidence';
import { useLanguage } from '@/lib/i18n/LanguageContext';

const ACCEPTED = '.pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx,.ppt,.pptx';
const MAX_MB = 10;
const typeIcons: Record<string, string> = {
  general_internal: '📝', intercompany: '🏢', cross_department: '🔀',
  fund_disbursement: '💰', leave_approval: '🏖️', promotion: '📈',
  demotion_disciplinary: '⚠️', create_department: '🏗️', create_company: '🏛️', create_position: '👤',
};

const labels = {
  ar: {
    subject: 'الموضوع', subjectPh: 'عنوان الطلب', description: 'التفاصيل', descPh: 'وصف تفصيلي للطلب...',
    priority: 'الأولوية', low: 'منخفضة', normal: 'عادية', high: 'عالية', urgent: 'عاجلة',
    destination: 'الجهة المستقبلة', destCompany: 'الشركة المستقبلة', destDept: 'القسم المستقبل',
    selectCompany: 'اختر الشركة', selectDept: 'اختر القسم',
    amount: 'المبلغ', currency: 'العملة', payee: 'المستفيد', costCenter: 'مركز التكلفة',
    sar: 'ريال سعودي', usd: 'دولار أمريكي', eur: 'يورو',
    leaveType: 'نوع الإجازة', annual: 'سنوية', sick: 'مرضية', emergency: 'طارئة', unpaid: 'بدون راتب',
    fromDate: 'من تاريخ', toDate: 'إلى تاريخ',
    attachments: 'المرفقات', attachDrop: 'اضغط لاختيار الملفات أو اسحبها هنا',
    cancel: 'إلغاء', submit: 'تقديم الطلب', submitting: 'جاري التقديم...',
    success: 'تم تقديم الطلب بنجاح', viewRequests: 'عرض طلباتي', newRequest: 'طلب جديد',
    finNote: 'طلبات الصرف المالي تُحال تلقائياً للإدارة المالية بالقابضة ورئيس مجلس الإدارة',
    hrNote: 'طلبات الموارد البشرية تُحال تلقائياً لإدارة الموارد البشرية بالقابضة',
    ceoNote: 'هذا الطلب يُحال تلقائياً لرئيس مجلس إدارة القابضة',
  },
  en: {
    subject: 'Subject', subjectPh: 'Request title', description: 'Details', descPh: 'Detailed description...',
    priority: 'Priority', low: 'Low', normal: 'Normal', high: 'High', urgent: 'Urgent',
    destination: 'Destination', destCompany: 'Destination Company', destDept: 'Destination Department',
    selectCompany: 'Select company', selectDept: 'Select department',
    amount: 'Amount', currency: 'Currency', payee: 'Payee', costCenter: 'Cost Center',
    sar: 'SAR', usd: 'USD', eur: 'EUR',
    leaveType: 'Leave Type', annual: 'Annual', sick: 'Sick', emergency: 'Emergency', unpaid: 'Unpaid',
    fromDate: 'From', toDate: 'To',
    attachments: 'Attachments', attachDrop: 'Click to select files or drag here',
    cancel: 'Cancel', submit: 'Submit Request', submitting: 'Submitting...',
    success: 'Request submitted successfully', viewRequests: 'View Requests', newRequest: 'New Request',
    finNote: 'Fund disbursement requests auto-route to Holding Finance + CEO',
    hrNote: 'HR requests auto-route to Holding Human Resources',
    ceoNote: 'This request auto-routes to Holding CEO',
  },
};

export default function NewRequestForm({ employee, configs, companies, departments }: any) {
  const { lang } = useLanguage();
  const L = labels[lang];
  const [step, setStep] = useState<'type' | 'form'>('type');
  const [selectedType, setSelectedType] = useState<any>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [destCompanyId, setDestCompanyId] = useState('');
  const [destDeptId, setDestDeptId] = useState('');

  function selectType(config: any) {
    setSelectedType(config); setStep('form');
    const cid = employee?.company_id || '';
    setDestCompanyId(cid); setDestDeptId('');
  }
  function resetForm() {
    setSuccess(''); setStep('type'); setSelectedType(null);
    setSelectedFiles([]); setDestCompanyId(''); setDestDeptId('');
  }

  const filteredDepts = useMemo(() => {
    const cid = destCompanyId || employee?.company_id || '';
    if (!cid) return departments;
    return departments.filter((d: any) => d.company_id === cid);
  }, [destCompanyId, departments, employee]);

  const isIntercompany = selectedType?.request_type === 'intercompany';
  const isSameCompany = ['general_internal', 'cross_department'].includes(selectedType?.request_type);
  const isFinancial = selectedType?.request_type === 'fund_disbursement';
  const isLeave = selectedType?.request_type === 'leave_approval';
  const isHR = ['leave_approval', 'promotion', 'demotion_disciplinary'].includes(selectedType?.request_type);
  const isStructural = ['create_department', 'create_company', 'create_position'].includes(selectedType?.request_type);
  const autoNote = isFinancial ? L.finNote : isHR ? L.hrNote : isStructural ? L.ceoNote : null;

  const availableCompanies = useMemo(() => {
    if (isSameCompany && employee?.company_id) return companies.filter((c: any) => c.id === employee.company_id);
    return companies;
  }, [isSameCompany, companies, employee]);

  // Auto-select company if only one available
  const effectiveDestCompany = destCompanyId || (availableCompanies.length === 1 ? availableCompanies[0].id : '');
  if (!destCompanyId && availableCompanies.length === 1 && availableCompanies[0].id !== destCompanyId) {
    // will set on next render
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    const big = files.filter(f => f.size > MAX_MB * 1024 * 1024);
    if (big.length) { setError(big.map(f => f.name).join(', ') + ' > ' + MAX_MB + 'MB'); e.target.value = ''; return; }
    setError(''); setSelectedFiles(files);
  }
  function removeFile(i: number) {
    setSelectedFiles(prev => prev.filter((_, idx) => idx !== i));
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError('');
    const form = new FormData(e.currentTarget);
    form.set('request_type', selectedType.request_type);
    form.set('destination_company_id', destCompanyId);
    form.set('destination_dept_id', destDeptId);
    startTransition(async () => {
      try {
        const request = await createRequest(form);
        if (selectedFiles.length > 0) {
          const ff = new FormData();
          selectedFiles.forEach(f => ff.append('files', f));
          await uploadEvidence(request.id, ff);
        }
        await submitRequest(request.id);
        setSuccess(L.success + ' — ' + request.request_number);
      } catch (err: any) { setError(err.message || 'Error'); }
    });
  }

  if (success) return (
    <div className="bg-white rounded-2xl border border-emerald-200 p-8 text-center animate-fade-in">
      <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4"><span className="text-3xl">✅</span></div>
      <h2 className="text-xl font-bold text-slate-900 mb-2">{L.success}</h2>
      <p className="text-sm text-slate-500 mb-6">{success}</p>
      <div className="flex gap-3 justify-center">
        <a href="/dashboard/requests" className="btn-primary text-sm">{L.viewRequests}</a>
        <button onClick={resetForm} className="px-6 py-3 rounded-xl text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50">{L.newRequest}</button>
      </div>
    </div>
  );

  if (step === 'type') return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {configs.map((c: any) => (
        <button key={c.request_type} onClick={() => selectType(c)}
          className="flex items-center gap-4 p-5 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-eagle-200 transition-all text-start group">
          <span className="text-2xl">{typeIcons[c.request_type] || '📋'}</span>
          <div>
            <p className="font-semibold text-slate-900 group-hover:text-eagle-600">{lang === 'ar' ? c.name_ar : c.name_en}</p>
            <p className="text-xs text-slate-500">{lang === 'ar' ? c.name_en : c.name_ar}</p>
          </div>
        </button>
      ))}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-slide-up">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
        <button type="button" onClick={resetForm} className="text-slate-400 hover:text-slate-600">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
        <span className="text-xl">{typeIcons[selectedType.request_type] || '📋'}</span>
        <div>
          <h2 className="font-semibold text-slate-900">{lang === 'ar' ? selectedType.name_ar : selectedType.name_en}</h2>
          <p className="text-xs text-slate-500">{lang === 'ar' ? selectedType.name_en : selectedType.name_ar}</p>
        </div>
      </div>
      <div className="p-6 space-y-5">
        {error && <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">{L.subject} <span className="text-red-500">*</span></label>
          <input name="subject" required className="input-field" placeholder={L.subjectPh} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">{L.description}</label>
          <textarea name="description" rows={4} className="input-field" placeholder={L.descPh} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">{L.priority}</label>
          <select name="priority" defaultValue="normal" className="input-field">
            <option value="low">{L.low}</option><option value="normal">{L.normal}</option>
            <option value="high">{L.high}</option><option value="urgent">{L.urgent}</option>
          </select>
        </div>

        {/* DESTINATION */}
        <div className="border border-slate-200 rounded-xl p-4 space-y-4 bg-slate-50/50">
          <h3 className="text-sm font-semibold text-slate-800">{L.destination}</h3>
          {autoNote && <div className="px-3 py-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-xs">ℹ️ {autoNote}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">{L.destCompany}</label>
              <select value={destCompanyId || (availableCompanies.length === 1 ? availableCompanies[0]?.id : '')} onChange={e => { setDestCompanyId(e.target.value); setDestDeptId(''); }} className="input-field text-sm">
                <option value="">{L.selectCompany}</option>
                {availableCompanies.map((c: any) => <option key={c.id} value={c.id}>{lang === 'ar' ? c.name_ar : c.name_en || c.name_ar} ({c.code})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">{L.destDept} <span className="text-red-500">*</span></label>
              <select value={destDeptId} onChange={e => setDestDeptId(e.target.value)} required className="input-field text-sm">
                <option value="">{L.selectDept}</option>
                {filteredDepts.map((d: any) => {
                  const co = companies.find((c: any) => c.id === d.company_id);
                  const coLabel = co ? ` — ${co.code}` : '';
                  return <option key={d.id} value={d.id}>{lang === 'ar' ? d.name_ar : d.name_en || d.name_ar} ({d.code}{coLabel})</option>;
                })}
              </select>
            </div>
          </div>
        </div>

        {isFinancial && (
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-slate-700 mb-2">{L.amount} <span className="text-red-500">*</span></label><input name="amount" type="number" step="0.01" required className="input-field" dir="ltr" placeholder="0.00" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-2">{L.currency}</label><select name="currency" className="input-field"><option value="SAR">{L.sar}</option><option value="USD">{L.usd}</option><option value="EUR">{L.eur}</option></select></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-2">{L.payee}</label><input name="payee" className="input-field" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-2">{L.costCenter}</label><input name="cost_center" className="input-field" /></div>
          </div>
        )}

        {isLeave && (
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><label className="block text-sm font-medium text-slate-700 mb-2">{L.leaveType}</label><select name="leave_type" className="input-field"><option value="annual">{L.annual}</option><option value="sick">{L.sick}</option><option value="emergency">{L.emergency}</option><option value="unpaid">{L.unpaid}</option></select></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-2">{L.fromDate}</label><input name="leave_start_date" type="date" className="input-field" dir="ltr" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-2">{L.toDate}</label><input name="leave_end_date" type="date" className="input-field" dir="ltr" /></div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">{L.attachments} <span className="text-slate-400 font-normal">({MAX_MB}MB max)</span></label>
          <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-xl p-6 cursor-pointer hover:border-eagle-300 hover:bg-slate-50 transition-colors">
            <span className="text-2xl">📎</span><span className="text-sm text-slate-500">{L.attachDrop}</span>
            <input ref={fileInputRef} type="file" multiple accept={ACCEPTED} onChange={handleFileChange} className="hidden" />
          </label>
          {selectedFiles.length > 0 && (
            <ul className="mt-3 space-y-2">{selectedFiles.map((f, i) => (
              <li key={i} className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-100 text-sm">
                <span>📄</span><span className="flex-1 truncate text-slate-700">{f.name}</span>
                <span className="text-slate-400 text-xs">{(f.size/1024/1024).toFixed(2)} MB</span>
                <button type="button" onClick={() => removeFile(i)} className="text-slate-400 hover:text-red-500">✕</button>
              </li>
            ))}</ul>
          )}
        </div>
      </div>
      <div className="px-6 py-4 border-t border-slate-100 flex items-center gap-3 justify-end bg-slate-50">
        <button type="button" onClick={resetForm} className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100">{L.cancel}</button>
        <button type="submit" disabled={isPending} className="btn-primary text-sm disabled:opacity-50">{isPending ? L.submitting : L.submit}</button>
      </div>
    </form>
  );
}
