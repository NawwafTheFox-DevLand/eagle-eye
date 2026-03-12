'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { createRequest, submitRequest, getDepartmentEmployees } from '@/app/actions/requests';
import { uploadEvidence } from '@/app/actions/evidence';

interface Config {
  id: string;
  request_type: string;
  name_ar: string;
  name_en: string;
  icon: string | null;
}

interface Props {
  configs: Config[];
  companies: { id: string; name_ar: string; name_en: string; code: string }[];
  departments: { id: string; name_ar: string; name_en: string; code: string; company_id: string }[];
  employee: {
    id: string;
    company_id: string | null;
    department_id: string | null;
    full_name_ar: string | null;
    full_name_en: string | null;
    company: any;
  };
}

const PRIORITY_OPTIONS = [
  { value: 'low',    ar: 'منخفض',  en: 'Low'    },
  { value: 'normal', ar: 'عادي',   en: 'Normal' },
  { value: 'high',   ar: 'مهم',    en: 'High'   },
  { value: 'urgent', ar: 'عاجل',   en: 'Urgent' },
];

const LEAVE_TYPES = [
  { value: 'annual',    ar: 'إجازة سنوية',      en: 'Annual Leave'    },
  { value: 'sick',      ar: 'إجازة مرضية',      en: 'Sick Leave'      },
  { value: 'emergency', ar: 'إجازة طارئة',      en: 'Emergency Leave' },
  { value: 'unpaid',    ar: 'إجازة بدون راتب',   en: 'Unpaid Leave'    },
  { value: 'maternity', ar: 'إجازة أمومة',      en: 'Maternity Leave' },
  { value: 'paternity', ar: 'إجازة أبوة',       en: 'Paternity Leave' },
];

const CURRENCIES = ['SAR', 'USD', 'EUR', 'GBP', 'AED'];

export const TYPE_LABELS: Record<string, { ar: string; en: string }> = {
  general_internal:      { ar: 'طلب داخلي عام',    en: 'General Internal'   },
  cross_department:      { ar: 'طلب بين الأقسام',   en: 'Cross-Department'   },
  intercompany:          { ar: 'طلب بين الشركات',   en: 'Intercompany'       },
  fund_disbursement:     { ar: 'طلب صرف مالي',      en: 'Fund Disbursement'  },
  leave_approval:        { ar: 'طلب إجازة',         en: 'Leave Approval'     },
  promotion:             { ar: 'طلب ترقية',         en: 'Promotion'          },
  demotion_disciplinary: { ar: 'طلب تأديبي',        en: 'Disciplinary'       },
  create_department:     { ar: 'إنشاء قسم',         en: 'Create Department'  },
  create_company:        { ar: 'إنشاء شركة',        en: 'Create Company'     },
  create_position:       { ar: 'إنشاء وظيفة',       en: 'Create Position'    },
  employee_onboarding:   { ar: 'تعيين موظف جديد',   en: 'Employee Onboarding'},
};

// co: 'own' = requester's company (pre-filled), 'other' = other companies, 'all' = any, 'none' = hidden
// dept: 'own' = requester's dept (pre-filled), 'choose' = pick in selected co, 'other' = other depts in own co, 'none' = hidden
const DEST_CONFIG: Record<string, { co: 'own' | 'other' | 'all' | 'none'; dept: 'own' | 'choose' | 'other' | 'none' }> = {
  general_internal:      { co: 'own',  dept: 'choose' },
  cross_department:      { co: 'own',  dept: 'other'  },
  intercompany:          { co: 'other', dept: 'choose' },
  fund_disbursement:     { co: 'own',  dept: 'choose' },
  leave_approval:        { co: 'own',  dept: 'own'    },
  promotion:             { co: 'own',  dept: 'choose' },
  demotion_disciplinary: { co: 'own',  dept: 'choose' },
  create_department:     { co: 'all',  dept: 'none'   },
  create_company:        { co: 'none', dept: 'none'   },
  create_position:       { co: 'all',  dept: 'choose' },
  employee_onboarding:   { co: 'none', dept: 'none'   },
};

function StepIndicator({ step }: { step: 1 | 2 | 3 }) {
  const steps = [
    { num: 1, label: 'النوع / Type' },
    { num: 2, label: 'التفاصيل / Details' },
    { num: 3, label: 'المراجعة / Review' },
  ];
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {steps.map((s, i) => (
        <div key={s.num} className="flex items-center">
          <div className="flex flex-col items-center">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all
              ${step === s.num ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                : step > s.num ? 'bg-blue-100 text-blue-600 border-2 border-blue-400'
                : 'bg-slate-100 text-slate-400 border-2 border-slate-200'}`}>
              {step > s.num ? '✓' : s.num}
            </div>
            <span className={`text-[10px] mt-1 whitespace-nowrap font-medium
              ${step === s.num ? 'text-blue-600' : step > s.num ? 'text-blue-400' : 'text-slate-400'}`}>
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`w-16 h-0.5 mb-4 mx-1 transition-all ${step > s.num ? 'bg-blue-400' : 'bg-slate-200'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function FieldLabel({ ar, en, required }: { ar: string; en: string; required?: boolean }) {
  return (
    <label className="block text-sm font-medium text-slate-700 mb-1">
      {ar} / {en} {required && <span className="text-red-500">*</span>}
    </label>
  );
}

const INPUT_CLS = 'w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all bg-white';
const READONLY_CLS = 'w-full border border-slate-100 rounded-xl px-4 py-2.5 text-sm text-slate-500 bg-slate-50';

export default function NewRequestForm({ configs, companies, departments, employee }: Props) {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedType, setSelectedType] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'normal' | 'high' | 'urgent' | 'low'>('normal');
  const [destCompanyId, setDestCompanyId] = useState('');
  const [destDeptId, setDestDeptId] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState('');

  // Send-to specific person
  const [targetEmployee, setTargetEmployee] = useState('');
  const [deptEmployees, setDeptEmployees] = useState<any[]>([]);

  useEffect(() => {
    setTargetEmployee('');
    if (destDeptId) {
      getDepartmentEmployees(destDeptId).then(setDeptEmployees);
    } else {
      setDeptEmployees([]);
    }
  }, [destDeptId]);

  // Type-specific fields
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('SAR');
  const [payee, setPayee] = useState('');
  const [costCenter, setCostCenter] = useState('');
  const [leaveType, setLeaveType] = useState('annual');
  const [leaveStart, setLeaveStart] = useState('');
  const [leaveEnd, setLeaveEnd] = useState('');
  const [meta, setMeta] = useState<Record<string, string>>({});

  const setMetaField = (key: string, value: string) =>
    setMeta(prev => ({ ...prev, [key]: value }));

  const selectedConfig = configs.find(c => c.request_type === selectedType);
  const cfg = DEST_CONFIG[selectedType] || { co: 'all', dept: 'choose' };

  // Compute company/dept options based on DEST_CONFIG
  const companiesForSelect = cfg.co === 'other'
    ? companies.filter(c => c.id !== employee.company_id)
    : companies;

  const deptsForSelect = cfg.dept === 'other'
    ? departments.filter(d => d.company_id === employee.company_id && d.id !== employee.department_id)
    : departments.filter(d => d.company_id === destCompanyId);

  const ownCompany = companies.find(c => c.id === employee.company_id);
  const ownDept = departments.find(d => d.id === employee.department_id);

  function handleTypeSelect(requestType: string) {
    setSelectedType(requestType);
    const dcfg = DEST_CONFIG[requestType] || { co: 'all', dept: 'choose' };
    setDestCompanyId(dcfg.co === 'own' ? (employee.company_id || '') : '');
    setDestDeptId(dcfg.dept === 'own' ? (employee.department_id || '') : '');
    setAmount(''); setCurrency('SAR'); setPayee(''); setCostCenter('');
    setLeaveType('annual'); setLeaveStart(''); setLeaveEnd('');
    setMeta({});
    setTargetEmployee(''); setDeptEmployees([]);
    setStep(2);
    setError('');
  }

  function buildFormData(): FormData {
    const fd = new FormData();
    fd.append('request_type', selectedType);
    fd.append('subject', subject);
    fd.append('description', description);
    fd.append('priority', priority);
    if (destCompanyId) fd.append('destination_company_id', destCompanyId);
    if (destDeptId)    fd.append('destination_dept_id',    destDeptId);
    if (amount)      fd.append('amount', amount);
    if (currency)    fd.append('currency', currency);
    if (payee)       fd.append('payee', payee);
    if (costCenter)  fd.append('cost_center', costCenter);
    if (leaveType)   fd.append('leave_type', leaveType);
    if (leaveStart)  fd.append('leave_start_date', leaveStart);
    if (leaveEnd)    fd.append('leave_end_date', leaveEnd);
    if (Object.keys(meta).length > 0) fd.append('metadata', JSON.stringify(meta));
    if (targetEmployee) fd.append('target_employee_id', targetEmployee);
    return fd;
  }

  function validateStep2(): boolean {
    if (!subject.trim()) {
      setError(isAr ? 'الموضوع مطلوب' : 'Subject is required');
      return false;
    }
    if (!description.trim()) {
      setError(isAr ? 'الوصف مطلوب' : 'Description is required');
      return false;
    }
    if (cfg.co !== 'none' && cfg.co !== 'own' && !destCompanyId) {
      setError(isAr ? 'الشركة المستقبلة مطلوبة' : 'Destination company is required');
      return false;
    }
    if (cfg.dept !== 'none' && cfg.dept !== 'own' && !destDeptId) {
      setError(isAr ? 'القسم المستقبل مطلوب' : 'Destination department is required');
      return false;
    }
    if (selectedType === 'fund_disbursement' && !amount) {
      setError(isAr ? 'المبلغ مطلوب' : 'Amount is required');
      return false;
    }
    if (selectedType === 'leave_approval' && (!leaveStart || !leaveEnd)) {
      setError(isAr ? 'تواريخ الإجازة مطلوبة' : 'Leave dates are required');
      return false;
    }
    if (selectedType === 'employee_onboarding') {
      if (!meta.emp_name_ar) { setError(isAr ? 'اسم الموظف (عربي) مطلوب' : 'Employee Arabic name is required'); return false; }
      if (!meta.national_id)  { setError(isAr ? 'رقم الهوية مطلوب' : 'National ID is required'); return false; }
      if (!meta.job_title_ar) { setError(isAr ? 'المسمى الوظيفي مطلوب' : 'Job title is required'); return false; }
      if (!meta.onboard_dept_id) { setError(isAr ? 'القسم مطلوب' : 'Department is required'); return false; }
      if (!meta.salary)       { setError(isAr ? 'الراتب مطلوب' : 'Salary is required'); return false; }
      if (!meta.start_date)   { setError(isAr ? 'تاريخ الانضمام مطلوب' : 'Start date is required'); return false; }
    }
    setError('');
    return true;
  }

  async function handleSaveDraft() {
    setError('');
    startTransition(async () => {
      const result = await createRequest(buildFormData());
      if (!result || result.error) {
        setError(result?.error || (isAr ? 'حدث خطأ' : 'An error occurred'));
        return;
      }
      if (files.length > 0 && result.data?.id) {
        const fd = new FormData();
        for (const f of files) fd.append('files', f);
        await uploadEvidence(result.data.id, fd);
      }
      router.push('/dashboard/requests');
    });
  }

  async function handleSubmit() {
    setError('');
    startTransition(async () => {
      const result = await createRequest(buildFormData());
      if (!result || result.error) {
        setError(result?.error || (isAr ? 'حدث خطأ' : 'An error occurred'));
        return;
      }
      const requestId = result.data?.id;
      if (!requestId) {
        setError(isAr ? 'لم يتم إنشاء الطلب' : 'Request was not created');
        return;
      }
      if (files.length > 0) {
        const fd = new FormData();
        for (const f of files) fd.append('files', f);
        await uploadEvidence(requestId, fd);
      }
      const submitResult = await submitRequest(requestId);
      if (submitResult?.error) {
        setError(submitResult.error);
        return;
      }
      router.push(`/dashboard/requests/${requestId}`);
    });
  }

  const priorityLabel = PRIORITY_OPTIONS.find(p => p.value === priority);
  const destCompanyName = companies.find(c => c.id === destCompanyId);
  const destDeptName = departments.find(d => d.id === destDeptId);
  const leaveTypeLabel = LEAVE_TYPES.find(l => l.value === leaveType);
  const typeLabel = TYPE_LABELS[selectedType];
  const targetEmpObj = deptEmployees.find(e => e.id === targetEmployee);

  return (
    <div className="card p-6 animate-fade-in">
      <StepIndicator step={step} />

      {/* ── STEP 1: Type Selection ── */}
      {step === 1 && (
        <div>
          {configs.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <p className="text-4xl mb-3">📋</p>
              <p>لا يوجد أنواع طلبات متاحة لمستواك الوظيفي</p>
              <p className="text-sm mt-1 text-slate-400">No request types available for your role</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {configs.map(config => (
                <button
                  key={config.id}
                  onClick={() => handleTypeSelect(config.request_type)}
                  className="flex flex-col items-center gap-3 p-5 rounded-xl border-2 border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-all text-center group cursor-pointer"
                >
                  <span className="text-4xl">{config.icon || '📄'}</span>
                  <div>
                    <p className="font-semibold text-slate-800 text-sm group-hover:text-blue-700 leading-snug">
                      {isAr ? config.name_ar : config.name_en}
                    </p>
                    {typeLabel && (
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {isAr ? TYPE_LABELS[config.request_type]?.en : TYPE_LABELS[config.request_type]?.ar}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── STEP 2: Details ── */}
      {step === 2 && (
        <div className="space-y-5">
          {/* Type header */}
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <button
              onClick={() => { setStep(1); setError(''); }}
              className="text-slate-400 hover:text-slate-700 transition-colors p-1"
            >
              &#8592;
            </button>
            <span className="text-2xl">{selectedConfig?.icon || '📄'}</span>
            <div>
              <p className="font-semibold text-slate-900 text-sm">
                {selectedConfig ? (isAr ? selectedConfig.name_ar : selectedConfig.name_en) : selectedType}
              </p>
              <p className="text-xs text-slate-400">{isAr ? 'نوع الطلب المحدد' : 'Selected request type'}</p>
            </div>
          </div>

          {/* Subject */}
          <div>
            <FieldLabel ar="الموضوع" en="Subject" required />
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder={isAr ? 'أدخل موضوع الطلب' : 'Enter request subject'}
              className={INPUT_CLS}
            />
          </div>

          {/* Description */}
          <div>
            <FieldLabel ar="الوصف" en="Description" required />
            <textarea
              rows={4}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={isAr ? 'أدخل وصفاً تفصيلياً' : 'Enter a detailed description'}
              className={`${INPUT_CLS} resize-none`}
            />
          </div>

          {/* Priority */}
          <div>
            <FieldLabel ar="الأولوية" en="Priority" />
            <select value={priority} onChange={e => setPriority(e.target.value as typeof priority)} className={INPUT_CLS}>
              {PRIORITY_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {isAr ? opt.ar : opt.en} / {isAr ? opt.en : opt.ar}
                </option>
              ))}
            </select>
          </div>

          {/* ── Fund Disbursement Fields ── */}
          {selectedType === 'fund_disbursement' && (
            <div className="space-y-4 border-t border-blue-100 pt-4">
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                {isAr ? 'تفاصيل الصرف المالي' : 'Payment Details'}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel ar="المبلغ" en="Amount" required />
                  <input type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className={INPUT_CLS} placeholder="0.00" />
                </div>
                <div>
                  <FieldLabel ar="العملة" en="Currency" />
                  <select value={currency} onChange={e => setCurrency(e.target.value)} className={INPUT_CLS}>
                    {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <FieldLabel ar="المستفيد" en="Payee" />
                <input type="text" value={payee} onChange={e => setPayee(e.target.value)} className={INPUT_CLS}
                  placeholder={isAr ? 'اسم المستفيد' : 'Payee name'} />
              </div>
              <div>
                <FieldLabel ar="مركز التكلفة" en="Cost Center" />
                <input type="text" value={costCenter} onChange={e => setCostCenter(e.target.value)} className={INPUT_CLS}
                  placeholder={isAr ? 'مركز التكلفة' : 'Cost center code'} />
              </div>
            </div>
          )}

          {/* ── Leave Approval Fields ── */}
          {selectedType === 'leave_approval' && (
            <div className="space-y-4 border-t border-blue-100 pt-4">
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                {isAr ? 'تفاصيل الإجازة' : 'Leave Details'}
              </p>
              <div>
                <FieldLabel ar="نوع الإجازة" en="Leave Type" required />
                <select value={leaveType} onChange={e => setLeaveType(e.target.value)} className={INPUT_CLS}>
                  {LEAVE_TYPES.map(l => (
                    <option key={l.value} value={l.value}>{isAr ? l.ar : l.en}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel ar="من تاريخ" en="Start Date" required />
                  <input type="date" value={leaveStart} onChange={e => setLeaveStart(e.target.value)} className={INPUT_CLS} />
                </div>
                <div>
                  <FieldLabel ar="إلى تاريخ" en="End Date" required />
                  <input type="date" value={leaveEnd} onChange={e => setLeaveEnd(e.target.value)} className={INPUT_CLS} />
                </div>
              </div>
            </div>
          )}

          {/* ── Promotion / Disciplinary Fields ── */}
          {(selectedType === 'promotion' || selectedType === 'demotion_disciplinary') && (
            <div className="space-y-4 border-t border-blue-100 pt-4">
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                {isAr ? 'بيانات الموظف المعني' : 'Target Employee Details'}
              </p>
              <div>
                <FieldLabel ar="اسم الموظف المعني" en="Employee Name" />
                <input type="text" value={meta.target_employee || ''} onChange={e => setMetaField('target_employee', e.target.value)}
                  className={INPUT_CLS} placeholder={isAr ? 'اسم الموظف' : 'Employee name'} />
              </div>
              {selectedType === 'promotion' && (
                <div>
                  <FieldLabel ar="الدرجة / المسمى الجديد" en="New Grade / Title" />
                  <input type="text" value={meta.new_grade || ''} onChange={e => setMetaField('new_grade', e.target.value)}
                    className={INPUT_CLS} placeholder={isAr ? 'مثال: Grade 3' : 'e.g. Grade 3'} />
                </div>
              )}
            </div>
          )}

          {/* ── Create Department Fields ── */}
          {selectedType === 'create_department' && (
            <div className="space-y-4 border-t border-blue-100 pt-4">
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                {isAr ? 'بيانات القسم الجديد' : 'New Department Info'}
              </p>
              <div>
                <FieldLabel ar="اسم القسم (عربي)" en="Dept Name (Arabic)" />
                <input type="text" value={meta.dept_name_ar || ''} onChange={e => setMetaField('dept_name_ar', e.target.value)}
                  className={INPUT_CLS} placeholder="مثال: قسم المالية" />
              </div>
              <div>
                <FieldLabel ar="اسم القسم (إنجليزي)" en="Dept Name (English)" />
                <input type="text" value={meta.dept_name_en || ''} onChange={e => setMetaField('dept_name_en', e.target.value)}
                  className={INPUT_CLS} placeholder="e.g. Finance Department" />
              </div>
            </div>
          )}

          {/* ── Create Company Fields ── */}
          {selectedType === 'create_company' && (
            <div className="space-y-4 border-t border-blue-100 pt-4">
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                {isAr ? 'بيانات الشركة الجديدة' : 'New Company Info'}
              </p>
              <div>
                <FieldLabel ar="اسم الشركة (عربي)" en="Company Name (Arabic)" />
                <input type="text" value={meta.company_name_ar || ''} onChange={e => setMetaField('company_name_ar', e.target.value)}
                  className={INPUT_CLS} placeholder="مثال: شركة الإمداد" />
              </div>
              <div>
                <FieldLabel ar="اسم الشركة (إنجليزي)" en="Company Name (English)" />
                <input type="text" value={meta.company_name_en || ''} onChange={e => setMetaField('company_name_en', e.target.value)}
                  className={INPUT_CLS} placeholder="e.g. Supply Co." />
              </div>
              <div>
                <FieldLabel ar="الكود المختصر" en="Short Code" />
                <input type="text" value={meta.company_code || ''} onChange={e => setMetaField('company_code', e.target.value)}
                  className={INPUT_CLS} placeholder="e.g. SUP" />
              </div>
            </div>
          )}

          {/* ── Create Position Fields ── */}
          {selectedType === 'create_position' && (
            <div className="space-y-4 border-t border-blue-100 pt-4">
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                {isAr ? 'بيانات الوظيفة الجديدة' : 'New Position Info'}
              </p>
              <div>
                <FieldLabel ar="المسمى الوظيفي (عربي)" en="Title (Arabic)" />
                <input type="text" value={meta.position_title_ar || ''} onChange={e => setMetaField('position_title_ar', e.target.value)}
                  className={INPUT_CLS} placeholder="مثال: محاسب أول" />
              </div>
              <div>
                <FieldLabel ar="المسمى الوظيفي (إنجليزي)" en="Title (English)" />
                <input type="text" value={meta.position_title_en || ''} onChange={e => setMetaField('position_title_en', e.target.value)}
                  className={INPUT_CLS} placeholder="e.g. Senior Accountant" />
              </div>
              <div>
                <FieldLabel ar="الدرجة الوظيفية" en="Grade" />
                <input type="text" value={meta.grade || ''} onChange={e => setMetaField('grade', e.target.value)}
                  className={INPUT_CLS} placeholder="e.g. Grade 2" />
              </div>
            </div>
          )}

          {/* ── Employee Onboarding Fields ── */}
          {selectedType === 'employee_onboarding' && (
            <div className="space-y-4 border-t border-blue-100 pt-4">
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                {isAr ? 'بيانات الموظف الجديد' : 'New Employee Details'}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <FieldLabel ar="الاسم الكامل (عربي)" en="Full Name (Arabic)" required />
                  <input type="text" value={meta.emp_name_ar || ''} onChange={e => setMetaField('emp_name_ar', e.target.value)}
                    className={INPUT_CLS} placeholder="مثال: محمد عبدالله" />
                </div>
                <div>
                  <FieldLabel ar="الاسم الكامل (إنجليزي)" en="Full Name (English)" />
                  <input type="text" value={meta.emp_name_en || ''} onChange={e => setMetaField('emp_name_en', e.target.value)}
                    className={INPUT_CLS} placeholder="e.g. Mohammed Abdullah" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <FieldLabel ar="رقم الهوية الوطنية" en="National ID" required />
                  <input type="text" value={meta.national_id || ''} onChange={e => setMetaField('national_id', e.target.value)}
                    className={INPUT_CLS} placeholder="1xxxxxxxxx" />
                </div>
                <div>
                  <FieldLabel ar="تاريخ الميلاد" en="Date of Birth" />
                  <input type="date" value={meta.dob || ''} onChange={e => setMetaField('dob', e.target.value)}
                    className={INPUT_CLS} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <FieldLabel ar="المسمى الوظيفي (عربي)" en="Job Title (Arabic)" required />
                  <input type="text" value={meta.job_title_ar || ''} onChange={e => setMetaField('job_title_ar', e.target.value)}
                    className={INPUT_CLS} placeholder="مثال: محاسب أول" />
                </div>
                <div>
                  <FieldLabel ar="المسمى الوظيفي (إنجليزي)" en="Job Title (English)" />
                  <input type="text" value={meta.job_title_en || ''} onChange={e => setMetaField('job_title_en', e.target.value)}
                    className={INPUT_CLS} placeholder="e.g. Senior Accountant" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <FieldLabel ar="القسم" en="Department" required />
                  <select value={meta.onboard_dept_id || ''} onChange={e => setMetaField('onboard_dept_id', e.target.value)} className={INPUT_CLS}>
                    <option value="">{isAr ? '-- اختر القسم --' : '-- Select department --'}</option>
                    {departments.filter(d => d.company_id === employee.company_id).map(d => (
                      <option key={d.id} value={d.id}>{isAr ? d.name_ar : d.name_en}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <FieldLabel ar="الفرع / الموقع" en="Branch / Location" />
                  <input type="text" value={meta.branch || ''} onChange={e => setMetaField('branch', e.target.value)}
                    className={INPUT_CLS} placeholder={isAr ? 'مثال: الرياض' : 'e.g. Riyadh'} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <FieldLabel ar="الراتب الأساسي" en="Basic Salary" required />
                  <input type="number" min="0" step="0.01" value={meta.salary || ''} onChange={e => setMetaField('salary', e.target.value)}
                    className={INPUT_CLS} placeholder="0.00" />
                </div>
                <div>
                  <FieldLabel ar="تاريخ الانضمام" en="Start Date" required />
                  <input type="date" value={meta.start_date || ''} onChange={e => setMetaField('start_date', e.target.value)}
                    className={INPUT_CLS} />
                </div>
              </div>
              <div>
                <FieldLabel ar="المدير المباشر" en="Direct Manager" />
                <input type="text" value={meta.direct_manager || ''} onChange={e => setMetaField('direct_manager', e.target.value)}
                  className={INPUT_CLS} placeholder={isAr ? 'اسم المدير المباشر' : 'Direct manager name'} />
              </div>
            </div>
          )}

          {/* ── Destination Company ── */}
          {cfg.co !== 'none' && (
            <div>
              <FieldLabel ar="الشركة المستقبلة" en="Dest. Company" required={cfg.co !== 'own'} />
              {cfg.co === 'own' ? (
                <div className={READONLY_CLS}>
                  {ownCompany ? (isAr ? ownCompany.name_ar : ownCompany.name_en) : (isAr ? 'شركتك' : 'Your Company')}
                </div>
              ) : (
                <select
                  value={destCompanyId}
                  onChange={e => { setDestCompanyId(e.target.value); setDestDeptId(''); }}
                  className={INPUT_CLS}
                >
                  <option value="">{isAr ? '-- اختر الشركة --' : '-- Select company --'}</option>
                  {companiesForSelect.map(c => (
                    <option key={c.id} value={c.id}>{isAr ? c.name_ar : c.name_en}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* ── Destination Department ── */}
          {cfg.dept !== 'none' && (
            <div>
              <FieldLabel ar="القسم المستقبل" en="Dest. Department" required={cfg.dept !== 'own'} />
              {cfg.dept === 'own' ? (
                <div className={READONLY_CLS}>
                  {ownDept ? (isAr ? ownDept.name_ar : ownDept.name_en) : (isAr ? 'قسمك' : 'Your Department')}
                </div>
              ) : (
                <>
                  <select
                    value={destDeptId}
                    onChange={e => setDestDeptId(e.target.value)}
                    disabled={cfg.dept === 'choose' && !destCompanyId}
                    className={`${INPUT_CLS} disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <option value="">{isAr ? '-- اختر القسم --' : '-- Select department --'}</option>
                    {deptsForSelect.map(d => (
                      <option key={d.id} value={d.id}>{isAr ? d.name_ar : d.name_en}</option>
                    ))}
                  </select>
                  {cfg.dept === 'choose' && destCompanyId && deptsForSelect.length === 0 && (
                    <p className="text-xs text-slate-400 mt-1">
                      {isAr ? 'لا توجد أقسام لهذه الشركة' : 'No departments found for this company'}
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── Send To (optional) ── */}
          {destDeptId && (
            <div>
              <FieldLabel ar="إرسال إلى (اختياري)" en="Send To (optional)" />
              <select
                value={targetEmployee}
                onChange={e => setTargetEmployee(e.target.value)}
                className={INPUT_CLS}
              >
                <option value="">{isAr ? '-- رئيس القسم (افتراضي) --' : '-- Dept Head (default) --'}</option>
                {deptEmployees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.full_name_ar} ({emp.employee_code}){emp.title_ar ? ' — ' + emp.title_ar : ''}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-400 mt-1">
                {isAr
                  ? 'اتركه فارغاً لإرسال الطلب لرئيس القسم تلقائياً'
                  : 'Leave blank to route to department head automatically'}
              </p>
            </div>
          )}

          {/* ── Attachments ── */}
          <div>
            <FieldLabel ar="المرفقات" en="Attachments" />
            <label className="flex items-center gap-2 w-full border border-dashed border-slate-300 rounded-xl px-4 py-3 cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all">
              <span className="text-lg">📎</span>
              <span className="text-sm text-slate-500">{isAr ? 'انقر لإرفاق ملفات' : 'Click to attach files'}</span>
              <input type="file" multiple onChange={e => e.target.files && setFiles(Array.from(e.target.files))} className="hidden" />
            </label>
            {files.length > 0 && (
              <ul className="mt-2 space-y-1">
                {files.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-1.5">
                    <span>📄</span>
                    <span className="truncate">{f.name}</span>
                    <span className="text-slate-400 shrink-0">({(f.size / 1024).toFixed(0)} KB)</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>}

          <div className="flex justify-between pt-2">
            <button onClick={() => { setStep(1); setError(''); }}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all">
              {isAr ? '← رجوع' : '← Back'}
            </button>
            <button onClick={() => { if (validateStep2()) setStep(3); }} className="btn-primary px-6 py-2 text-sm">
              {isAr ? 'التالي ←' : 'Next →'}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Review ── */}
      {step === 3 && (
        <div className="space-y-5">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
            <button onClick={() => { setStep(2); setError(''); }}
              className="text-slate-400 hover:text-slate-700 transition-colors p-1">
              &#8592;
            </button>
            <p className="font-semibold text-slate-800 text-sm">{isAr ? 'مراجعة الطلب' : 'Review Request'}</p>
          </div>

          <div className="bg-slate-50 rounded-xl divide-y divide-slate-100 border border-slate-200">
            {[
              {
                label: isAr ? 'النوع' : 'Type',
                value: selectedConfig ? (isAr ? selectedConfig.name_ar : selectedConfig.name_en) : selectedType,
                icon: selectedConfig?.icon || '📄',
              },
              { label: isAr ? 'الموضوع' : 'Subject',     value: subject,      icon: '📝' },
              { label: isAr ? 'الوصف' : 'Description',   value: description,  icon: '📃' },
              {
                label: isAr ? 'الأولوية' : 'Priority',
                value: isAr ? priorityLabel?.ar : priorityLabel?.en,
                icon: priority === 'urgent' ? '🔴' : priority === 'high' ? '🟠' : priority === 'low' ? '🔵' : '🟢',
              },
              ...(cfg.co !== 'none' ? [{
                label: isAr ? 'الشركة المستقبلة' : 'Dest. Company',
                value: destCompanyName ? (isAr ? destCompanyName.name_ar : destCompanyName.name_en)
                       : (cfg.co === 'own' && ownCompany) ? (isAr ? ownCompany.name_ar : ownCompany.name_en) : '—',
                icon: '🏢',
              }] : []),
              ...(cfg.dept !== 'none' ? [{
                label: isAr ? 'القسم المستقبل' : 'Dest. Department',
                value: destDeptName ? (isAr ? destDeptName.name_ar : destDeptName.name_en)
                       : (cfg.dept === 'own' && ownDept) ? (isAr ? ownDept.name_ar : ownDept.name_en) : '—',
                icon: '🏬',
              }] : []),
              ...(destDeptId ? [{
                label: isAr ? 'إرسال إلى' : 'Send To',
                value: targetEmployee && targetEmpObj
                  ? `${targetEmpObj.full_name_ar} (${targetEmpObj.employee_code})`
                  : (isAr ? 'رئيس القسم (تلقائي)' : 'Dept Head (auto)'),
                icon: '👤',
              }] : []),
              ...(selectedType === 'fund_disbursement' && amount ? [
                { label: isAr ? 'المبلغ' : 'Amount', value: `${amount} ${currency}`, icon: '💰' },
                ...(payee ? [{ label: isAr ? 'المستفيد' : 'Payee', value: payee, icon: '👤' }] : []),
              ] : []),
              ...(selectedType === 'employee_onboarding' ? [
                { label: isAr ? 'اسم الموظف' : 'Employee Name', value: meta.emp_name_ar || '—', icon: '👤' },
                { label: isAr ? 'الهوية' : 'National ID',       value: meta.national_id || '—',  icon: '🪪' },
                { label: isAr ? 'المسمى الوظيفي' : 'Job Title', value: meta.job_title_ar || '—', icon: '💼' },
                { label: isAr ? 'الراتب' : 'Salary',             value: meta.salary ? `${meta.salary} SAR` : '—', icon: '💰' },
                { label: isAr ? 'تاريخ الانضمام' : 'Start Date', value: meta.start_date || '—',  icon: '📅' },
              ] : []),
              ...(selectedType === 'leave_approval' ? [
                { label: isAr ? 'نوع الإجازة' : 'Leave Type', value: isAr ? leaveTypeLabel?.ar : leaveTypeLabel?.en, icon: '🗓' },
                { label: isAr ? 'من تاريخ' : 'Start Date',  value: leaveStart, icon: '📅' },
                { label: isAr ? 'إلى تاريخ' : 'End Date',   value: leaveEnd,   icon: '📅' },
              ] : []),
              {
                label: isAr ? 'عدد المرفقات' : 'Attachments',
                value: files.length > 0 ? `${files.length} ${isAr ? 'ملف' : 'file(s)'}` : (isAr ? 'لا توجد مرفقات' : 'No attachments'),
                icon: '📎',
              },
            ].map((row, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-3">
                <span className="text-base mt-0.5 shrink-0">{row.icon}</span>
                <div className="min-w-0">
                  <p className="text-xs text-slate-400 font-medium">{row.label}</p>
                  <p className="text-sm text-slate-800 mt-0.5 break-words">{row.value || '—'}</p>
                </div>
              </div>
            ))}
          </div>

          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>}

          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <button onClick={handleSaveDraft} disabled={isPending}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-slate-700 border border-slate-300 rounded-xl hover:bg-slate-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
              {isPending ? <span className="inline-block w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" /> : '💾'}
              {isAr ? 'حفظ كمسودة' : 'Save Draft'}
            </button>
            <button onClick={handleSubmit} disabled={isPending}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-blue-200">
              {isPending ? <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : '📤'}
              {isAr ? 'تقديم الطلب' : 'Submit Request'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
