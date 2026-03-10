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
    budgetSource: 'مصدر الميزانية', dueDate: 'تاريخ الاستحقاق',
    sar: 'ريال سعودي', usd: 'دولار أمريكي', eur: 'يورو',
    leaveType: 'نوع الإجازة', annual: 'سنوية', sick: 'مرضية', emergency: 'طارئة', unpaid: 'بدون راتب',
    fromDate: 'من تاريخ', toDate: 'إلى تاريخ',
    effectiveDate: 'تاريخ النفاذ', compensationImpact: 'الأثر على التعويض',
    justification: 'المبرر', policyRef: 'المرجع التنظيمي',
    deptCode: 'الرمز المقترح', reportingLine: 'خط الإبلاغ', businessReason: 'السبب التجاري',
    legalName: 'الاسم القانوني', proposedCode: 'الرمز المقترح',
    positionCompany: 'الشركة', positionDept: 'القسم',
    positionTitle: 'مسمى الوظيفة', positionCode: 'رمز الوظيفة', grade: 'الدرجة',
    currentRole: 'الدور الحالي', proposedRole: 'الدور المقترح', proposedChange: 'التغيير المقترح',
    ownerEmployee: 'المسؤول المقترح',
    shortName: 'الاسم المختصر', parentCompany: 'الشركة الأم', proposedCeo: 'الرئيس التنفيذي المقترح',
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
    budgetSource: 'Budget Source', dueDate: 'Due Date',
    sar: 'SAR', usd: 'USD', eur: 'EUR',
    leaveType: 'Leave Type', annual: 'Annual', sick: 'Sick', emergency: 'Emergency', unpaid: 'Unpaid',
    fromDate: 'From', toDate: 'To',
    effectiveDate: 'Effective Date', compensationImpact: 'Compensation Impact',
    justification: 'Justification', policyRef: 'Policy Reference',
    deptCode: 'Proposed Dept Code', reportingLine: 'Reporting Line', businessReason: 'Business Reason',
    legalName: 'Legal Name', proposedCode: 'Proposed Code',
    positionCompany: 'Company', positionDept: 'Department',
    positionTitle: 'Position Title', positionCode: 'Position Code', grade: 'Grade',
    currentRole: 'Current Role', proposedRole: 'Proposed Role', proposedChange: 'Proposed Change',
    ownerEmployee: 'Proposed Owner',
    shortName: 'Short Name', parentCompany: 'Parent Company', proposedCeo: 'Proposed CEO',
    attachments: 'Attachments', attachDrop: 'Click to select files or drag here',
    cancel: 'Cancel', submit: 'Submit Request', submitting: 'Submitting...',
    success: 'Request submitted successfully', viewRequests: 'View Requests', newRequest: 'New Request',
    finNote: 'Fund disbursement requests auto-route to Holding Finance + CEO',
    hrNote: 'HR requests auto-route to Holding Human Resources',
    ceoNote: 'This request auto-routes to Holding CEO',
  },
};

const typeVisibility: Record<string, string[]> = {
  general_internal:      ['employee', 'department_manager', 'company_director', 'holding_ceo', 'super_admin'],
  cross_department:      ['employee', 'department_manager', 'company_director', 'holding_ceo', 'super_admin'],
  leave_approval:        ['employee', 'department_manager', 'company_director', 'holding_ceo', 'super_admin'],
  intercompany:          ['department_manager', 'company_director', 'holding_ceo', 'super_admin'],
  fund_disbursement:     ['department_manager', 'company_director', 'holding_ceo', 'super_admin'],
  create_position:       ['department_manager', 'company_director', 'holding_ceo', 'super_admin'],
  promotion:             ['department_manager', 'company_director', 'holding_ceo', 'super_admin'],
  demotion_disciplinary: ['department_manager', 'company_director', 'holding_ceo', 'super_admin'],
  create_department:     ['company_director', 'holding_ceo', 'super_admin'],
  create_company:        ['holding_ceo', 'super_admin'],
};

export default function NewRequestForm({ employee, configs, companies, departments, roleLevel = 'employee' }: any) {
  const { lang } = useLanguage();
  const L = labels[lang];

  const visibleConfigs = configs.filter((c: any) => {
    const allowed = typeVisibility[c.request_type];
    if (!allowed) return true;
    return allowed.includes(roleLevel);
  });
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

  const isIntercompany    = selectedType?.request_type === 'intercompany';
  const isSameCompany     = ['general_internal', 'cross_department'].includes(selectedType?.request_type);
  const isFinancial       = selectedType?.request_type === 'fund_disbursement';
  const isLeave           = selectedType?.request_type === 'leave_approval';
  const isPromotion       = selectedType?.request_type === 'promotion';
  const isDemotion        = selectedType?.request_type === 'demotion_disciplinary';
  const isHR              = ['leave_approval', 'promotion', 'demotion_disciplinary'].includes(selectedType?.request_type);
  const isStructural      = ['create_department', 'create_company', 'create_position'].includes(selectedType?.request_type);
  const isCreateDept      = selectedType?.request_type === 'create_department';
  const isCreateCompany   = selectedType?.request_type === 'create_company';
  const isCreatePosition  = selectedType?.request_type === 'create_position';
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
      {visibleConfigs.map((c: any) => (
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
            <div><label className="block text-sm font-medium text-slate-700 mb-2">{L.budgetSource}</label><input name="budget_source" className="input-field" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-2">{L.dueDate}</label><input name="due_date" type="date" className="input-field" dir="ltr" /></div>
          </div>
        )}

        {isLeave && (
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><label className="block text-sm font-medium text-slate-700 mb-2">{L.leaveType}</label><select name="leave_type" className="input-field"><option value="annual">{L.annual}</option><option value="sick">{L.sick}</option><option value="emergency">{L.emergency}</option><option value="unpaid">{L.unpaid}</option></select></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-2">{L.fromDate}</label><input name="leave_start_date" type="date" className="input-field" dir="ltr" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-2">{L.toDate}</label><input name="leave_end_date" type="date" className="input-field" dir="ltr" /></div>
          </div>
        )}

        {/* Promotion / Demotion fields */}
        {(isPromotion || isDemotion) && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-2">{L.currentRole}</label><input name="current_role" className="input-field" /></div>
              {isPromotion && <div><label className="block text-sm font-medium text-slate-700 mb-2">{L.proposedRole}</label><input name="proposed_role" className="input-field" /></div>}
              {isDemotion && <div><label className="block text-sm font-medium text-slate-700 mb-2">{L.proposedChange}</label><input name="proposed_change" className="input-field" /></div>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-2">{L.effectiveDate}</label><input name="effective_date" type="date" className="input-field" dir="ltr" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-2">{L.compensationImpact}</label><input name="compensation_impact" className="input-field" /></div>
            </div>
            <div><label className="block text-sm font-medium text-slate-700 mb-2">{L.justification}</label><textarea name="justification" rows={3} className="input-field" /></div>
            {isDemotion && <div><label className="block text-sm font-medium text-slate-700 mb-2">{L.policyRef}</label><input name="policy_reference" className="input-field" /></div>}
          </div>
        )}

        {/* Create Department fields */}
        {isCreateDept && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-2">{L.deptCode}</label><input name="proposed_dept_code" className="input-field" dir="ltr" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-2">{L.reportingLine}</label><input name="reporting_line" className="input-field" /></div>
              <div className="col-span-2"><label className="block text-sm font-medium text-slate-700 mb-2">{L.ownerEmployee}</label><input name="owner_employee" className="input-field" /></div>
            </div>
            <div><label className="block text-sm font-medium text-slate-700 mb-2">{L.businessReason}</label><textarea name="business_reason" rows={3} className="input-field" /></div>
          </div>
        )}

        {/* Create Company fields */}
        {isCreateCompany && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-2">{L.legalName}</label><input name="legal_name" className="input-field" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-2">{L.proposedCode}</label><input name="proposed_code" className="input-field" dir="ltr" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-2">{L.shortName}</label><input name="short_name" className="input-field" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-2">{L.parentCompany}</label><input name="parent_company" className="input-field" /></div>
              <div className="col-span-2"><label className="block text-sm font-medium text-slate-700 mb-2">{L.proposedCeo}</label><input name="proposed_ceo" className="input-field" /></div>
            </div>
            <div><label className="block text-sm font-medium text-slate-700 mb-2">{L.businessReason}</label><textarea name="business_reason" rows={3} className="input-field" /></div>
          </div>
        )}

        {/* Create Position fields */}
        {isCreatePosition && (
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-slate-700 mb-2">{L.positionCompany}</label><input name="position_company" className="input-field" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-2">{L.positionDept}</label><input name="position_dept" className="input-field" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-2">{L.positionTitle}</label><input name="position_title" className="input-field" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-2">{L.positionCode}</label><input name="position_code" className="input-field" dir="ltr" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-2">{L.grade}</label><input name="grade" className="input-field" dir="ltr" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-2">{L.reportingLine}</label><input name="reporting_line" className="input-field" /></div>
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
