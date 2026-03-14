'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { createCustomRequestType } from '@/app/actions/custom-requests';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CustomField {
  key: string;
  label_ar: string;
  label_en: string;
  type: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'file';
  required: boolean;
  options: { value: string; label_ar: string; label_en: string }[];
}

interface FlowStep {
  company_id: string;
  department_id: string;
  action_label_ar: string;
  action_label_en: string;
}

interface Props {
  companies: { id: string; name_ar: string; name_en: string; code: string }[];
  departments: { id: string; name_ar: string; name_en: string; code: string; company_id: string }[];
  employeeCompanyId: string;
  initialData?: any;
  typeId?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const INPUT =
  'w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white';

const SELECT = INPUT;

function emptyStep(): FlowStep {
  return { company_id: '', department_id: '', action_label_ar: '', action_label_en: '' };
}

function emptyField(): CustomField {
  return {
    key: '',
    label_ar: '',
    label_en: '',
    type: 'text',
    required: false,
    options: [],
  };
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
      <h2 className="text-base font-semibold text-slate-800 border-b border-slate-100 pb-2">{title}</h2>
      {children}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function NewCustomTypeForm({ companies, departments, employeeCompanyId }: Props) {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Basic info
  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [descAr, setDescAr] = useState('');
  const [descEn, setDescEn] = useState('');
  const [icon, setIcon] = useState('📝');

  // Flow
  const [flowMode, setFlowMode] = useState<'free' | 'fixed'>('free');
  const [mustEndCompanyId, setMustEndCompanyId] = useState('');
  const [mustEndDeptId, setMustEndDeptId] = useState('');
  const [steps, setSteps] = useState<FlowStep[]>([emptyStep(), emptyStep()]);

  // Access
  const [allowedCreators, setAllowedCreators] = useState<'own_dept' | 'own_company' | 'all'>('own_dept');

  // Gates
  const [requiresCEO, setRequiresCEO] = useState(false);
  const [requiresHR, setRequiresHR] = useState(false);
  const [requiresFinance, setRequiresFinance] = useState(false);

  // Fields
  const [fields, setFields] = useState<CustomField[]>([]);

  // UI state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // ── Derived ──────────────────────────────────────────────────────────────────

  function deptsForCompany(companyId: string) {
    return departments.filter(d => d.company_id === companyId);
  }

  function mustEndDepts() {
    return mustEndCompanyId ? departments.filter(d => d.company_id === mustEndCompanyId) : [];
  }

  // ── Flow mode change ─────────────────────────────────────────────────────────

  function handleFlowModeChange(mode: 'free' | 'fixed') {
    setFlowMode(mode);
    if (mode === 'fixed') {
      setSteps([emptyStep(), emptyStep()]);
    }
  }

  // ── Steps ────────────────────────────────────────────────────────────────────

  function updateStep(index: number, patch: Partial<FlowStep>) {
    setSteps(prev => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function addStep() {
    setSteps(prev => [...prev, emptyStep()]);
  }

  function removeStep(index: number) {
    setSteps(prev => {
      if (prev.length <= 2) return prev;
      return prev.filter((_, i) => i !== index);
    });
  }

  // ── Fields ───────────────────────────────────────────────────────────────────

  function addField() {
    setFields(prev => [...prev, emptyField()]);
  }

  function updateField(index: number, patch: Partial<CustomField>) {
    setFields(prev => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  }

  function removeField(index: number) {
    setFields(prev => prev.filter((_, i) => i !== index));
  }

  function addOption(fieldIndex: number) {
    setFields(prev =>
      prev.map((f, i) =>
        i === fieldIndex
          ? { ...f, options: [...f.options, { value: '', label_ar: '', label_en: '' }] }
          : f
      )
    );
  }

  function updateOption(
    fieldIndex: number,
    optIndex: number,
    patch: Partial<{ value: string; label_ar: string; label_en: string }>
  ) {
    setFields(prev =>
      prev.map((f, i) =>
        i === fieldIndex
          ? {
              ...f,
              options: f.options.map((o, oi) => (oi === optIndex ? { ...o, ...patch } : o)),
            }
          : f
      )
    );
  }

  function removeOption(fieldIndex: number, optIndex: number) {
    setFields(prev =>
      prev.map((f, i) =>
        i === fieldIndex
          ? { ...f, options: f.options.filter((_, oi) => oi !== optIndex) }
          : f
      )
    );
  }

  // ── Validate ─────────────────────────────────────────────────────────────────

  function validate(): string | null {
    if (!nameAr.trim()) return isAr ? 'الاسم بالعربية مطلوب' : 'Arabic name is required';
    if (!nameEn.trim()) return isAr ? 'الاسم بالإنجليزية مطلوب' : 'English name is required';

    if (flowMode === 'fixed') {
      if (steps.length < 2) return isAr ? 'يجب تحديد خطوتين على الأقل' : 'At least 2 steps required';
      for (let i = 0; i < steps.length; i++) {
        if (!steps[i].company_id)
          return isAr ? `الخطوة ${i + 1}: اختر الشركة` : `Step ${i + 1}: select company`;
        if (!steps[i].department_id)
          return isAr ? `الخطوة ${i + 1}: اختر القسم` : `Step ${i + 1}: select department`;
      }
    }

    for (let i = 0; i < fields.length; i++) {
      if (!fields[i].key.trim())
        return isAr ? `الحقل ${i + 1}: المفتاح مطلوب` : `Field ${i + 1}: key is required`;
      if (!fields[i].label_ar.trim())
        return isAr ? `الحقل ${i + 1}: التسمية بالعربية مطلوبة` : `Field ${i + 1}: Arabic label required`;
      if (!fields[i].label_en.trim())
        return isAr ? `الحقل ${i + 1}: التسمية بالإنجليزية مطلوبة` : `Field ${i + 1}: English label required`;
      if (fields[i].type === 'select' && fields[i].options.length === 0)
        return isAr
          ? `الحقل ${i + 1}: نوع "قائمة" يتطلب خيارًا واحدًا على الأقل`
          : `Field ${i + 1}: select type requires at least one option`;
    }

    return null;
  }

  // ── Submit ───────────────────────────────────────────────────────────────────

  async function handleSave() {
    setError('');
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setSaving(true);
    const result = await createCustomRequestType({
      name_ar: nameAr.trim(),
      name_en: nameEn.trim(),
      desc_ar: descAr.trim(),
      desc_en: descEn.trim(),
      icon: icon.trim() || '📝',
      flow_mode: flowMode,
      allowed_creators: allowedCreators,
      must_end_company_id: flowMode === 'free' ? mustEndCompanyId || undefined : undefined,
      must_end_dept_id: flowMode === 'free' ? mustEndDeptId || undefined : undefined,
      requires_ceo: requiresCEO,
      requires_hr: requiresHR,
      requires_finance: requiresFinance,
      steps: flowMode === 'fixed' ? steps : [],
      fields,
    });
    setSaving(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    startTransition(() => router.push('/dashboard/admin/custom-requests'));
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── 1. Basic Info ──────────────────────────────────────────────────── */}
      <Section title={isAr ? '١. المعلومات الأساسية' : '1. Basic Information'}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">
              {isAr ? 'الاسم بالعربية *' : 'Name in Arabic *'}
            </label>
            <input
              dir="rtl"
              className={INPUT}
              value={nameAr}
              onChange={e => setNameAr(e.target.value)}
              placeholder="مثال: طلب صيانة"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">
              {isAr ? 'الاسم بالإنجليزية *' : 'Name in English *'}
            </label>
            <input
              dir="ltr"
              className={INPUT}
              value={nameEn}
              onChange={e => setNameEn(e.target.value)}
              placeholder="e.g. Maintenance Request"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">
              {isAr ? 'الوصف بالعربية' : 'Description in Arabic'}
            </label>
            <textarea
              dir="rtl"
              rows={2}
              className={INPUT}
              value={descAr}
              onChange={e => setDescAr(e.target.value)}
              placeholder="وصف مختصر..."
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">
              {isAr ? 'الوصف بالإنجليزية' : 'Description in English'}
            </label>
            <textarea
              dir="ltr"
              rows={2}
              className={INPUT}
              value={descEn}
              onChange={e => setDescEn(e.target.value)}
              placeholder="Short description..."
            />
          </div>
        </div>
        <div className="space-y-1 max-w-[160px]">
          <label className="text-xs font-medium text-slate-600">
            {isAr ? 'الأيقونة (إيموجي)' : 'Icon (emoji)'}
          </label>
          <input
            className={INPUT}
            value={icon}
            onChange={e => setIcon(e.target.value)}
            placeholder="📝"
            maxLength={4}
          />
        </div>
      </Section>

      {/* ── 2. Flow Mode ───────────────────────────────────────────────────── */}
      <Section title={isAr ? '٢. نمط المسار' : '2. Flow Mode'}>
        <div className="flex gap-6">
          {(['free', 'fixed'] as const).map(mode => (
            <label key={mode} className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="radio"
                name="flowMode"
                value={mode}
                checked={flowMode === mode}
                onChange={() => handleFlowModeChange(mode)}
                className="accent-blue-500"
              />
              <span className="text-sm font-medium text-slate-700">
                {mode === 'free'
                  ? isAr ? 'حر (يحدده المرسل)' : 'Free (sender routes)'
                  : isAr ? 'ثابت (مسار محدد)' : 'Fixed (predefined path)'}
              </span>
            </label>
          ))}
        </div>

        {/* Free flow: optional must-end destination */}
        {flowMode === 'free' && (
          <div className="mt-4 space-y-3">
            <p className="text-xs text-slate-500">
              {isAr
                ? 'اختياري: حدد القسم النهائي الإلزامي للطلب'
                : 'Optional: set a mandatory final destination department'}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">
                  {isAr ? 'الشركة النهائية' : 'Final Company'}
                </label>
                <select
                  className={SELECT}
                  value={mustEndCompanyId}
                  onChange={e => { setMustEndCompanyId(e.target.value); setMustEndDeptId(''); }}
                >
                  <option value="">{isAr ? '— بلا قيد —' : '— None —'}</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>
                      {isAr ? c.name_ar : c.name_en || c.name_ar}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">
                  {isAr ? 'القسم النهائي' : 'Final Department'}
                </label>
                <select
                  className={SELECT}
                  value={mustEndDeptId}
                  onChange={e => setMustEndDeptId(e.target.value)}
                  disabled={!mustEndCompanyId}
                >
                  <option value="">{isAr ? '— بلا قيد —' : '— None —'}</option>
                  {mustEndDepts().map(d => (
                    <option key={d.id} value={d.id}>
                      {isAr ? d.name_ar : d.name_en || d.name_ar}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Fixed flow: step list */}
        {flowMode === 'fixed' && (
          <div className="mt-4 space-y-3">
            <p className="text-xs text-slate-500">
              {isAr
                ? 'حدد الخطوات بالترتيب — الخطوة الأخيرة هي المحطة النهائية'
                : 'Define steps in order — the last step is the final destination'}
            </p>
            {steps.map((step, idx) => {
              const isLast = idx === steps.length - 1;
              const stepDepts = deptsForCompany(step.company_id);
              return (
                <div
                  key={idx}
                  className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-600">
                      {isAr ? `الخطوة ${idx + 1}` : `Step ${idx + 1}`}
                      {isLast && (
                        <span className="ml-2 text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                          {isAr ? 'نهائي' : 'FINAL'}
                        </span>
                      )}
                    </span>
                    {steps.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeStep(idx)}
                        className="text-xs text-red-500 hover:text-red-700 transition-colors"
                      >
                        {isAr ? 'حذف' : 'Remove'}
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600">
                        {isAr ? 'الشركة' : 'Company'}
                      </label>
                      <select
                        className={SELECT}
                        value={step.company_id}
                        onChange={e =>
                          updateStep(idx, { company_id: e.target.value, department_id: '' })
                        }
                      >
                        <option value="">{isAr ? 'اختر شركة' : 'Select company'}</option>
                        {companies.map(c => (
                          <option key={c.id} value={c.id}>
                            {isAr ? c.name_ar : c.name_en || c.name_ar}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600">
                        {isAr ? 'القسم' : 'Department'}
                      </label>
                      <select
                        className={SELECT}
                        value={step.department_id}
                        onChange={e => updateStep(idx, { department_id: e.target.value })}
                        disabled={!step.company_id}
                      >
                        <option value="">{isAr ? 'اختر قسم' : 'Select department'}</option>
                        {stepDepts.map(d => (
                          <option key={d.id} value={d.id}>
                            {isAr ? d.name_ar : d.name_en || d.name_ar}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600">
                        {isAr ? 'تسمية الإجراء (ع)' : 'Action Label (AR)'}
                      </label>
                      <input
                        dir="rtl"
                        className={INPUT}
                        value={step.action_label_ar}
                        onChange={e => updateStep(idx, { action_label_ar: e.target.value })}
                        placeholder={isAr ? 'مثال: للاعتماد' : 'e.g. للاعتماد'}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600">
                        {isAr ? 'تسمية الإجراء (EN)' : 'Action Label (EN)'}
                      </label>
                      <input
                        dir="ltr"
                        className={INPUT}
                        value={step.action_label_en}
                        onChange={e => updateStep(idx, { action_label_en: e.target.value })}
                        placeholder="e.g. For Approval"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
            <button
              type="button"
              onClick={addStep}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors flex items-center gap-1"
            >
              <span>+</span>
              <span>{isAr ? 'إضافة خطوة' : 'Add Step'}</span>
            </button>
          </div>
        )}
      </Section>

      {/* ── 3. Access Control ──────────────────────────────────────────────── */}
      <Section title={isAr ? '٣. صلاحية الإنشاء' : '3. Access Control'}>
        <div className="flex flex-col gap-3">
          {(
            [
              {
                value: 'own_dept',
                labelAr: 'موظفو القسم الخاص فقط',
                labelEn: 'Own department only',
              },
              {
                value: 'own_company',
                labelAr: 'جميع موظفي الشركة',
                labelEn: 'All employees in the same company',
              },
              {
                value: 'all',
                labelAr: 'جميع الموظفين (كل الشركات)',
                labelEn: 'All employees (all companies)',
              },
            ] as { value: 'own_dept' | 'own_company' | 'all'; labelAr: string; labelEn: string }[]
          ).map(opt => (
            <label key={opt.value} className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="radio"
                name="allowedCreators"
                value={opt.value}
                checked={allowedCreators === opt.value}
                onChange={() => setAllowedCreators(opt.value)}
                className="accent-blue-500"
              />
              <span className="text-sm text-slate-700">
                {isAr ? opt.labelAr : opt.labelEn}
              </span>
            </label>
          ))}
        </div>
      </Section>

      {/* ── 4. Gates ───────────────────────────────────────────────────────── */}
      <Section title={isAr ? '٤. بوابات الاعتماد' : '4. Approval Gates'}>
        <div className="flex flex-col gap-3">
          {(
            [
              {
                key: 'ceo' as const,
                labelAr: 'يتطلب اعتماد الرئيس التنفيذي',
                labelEn: 'Requires CEO approval',
                value: requiresCEO,
                setter: setRequiresCEO,
              },
              {
                key: 'hr' as const,
                labelAr: 'يتطلب ختم الموارد البشرية',
                labelEn: 'Requires HR stamp',
                value: requiresHR,
                setter: setRequiresHR,
              },
              {
                key: 'finance' as const,
                labelAr: 'يتطلب ختم المالية',
                labelEn: 'Requires Finance stamp',
                value: requiresFinance,
                setter: setRequiresFinance,
              },
            ]
          ).map(gate => (
            <label key={gate.key} className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={gate.value}
                onChange={e => gate.setter(e.target.checked)}
                className="w-4 h-4 accent-blue-500 rounded"
              />
              <span className="text-sm text-slate-700">
                {isAr ? gate.labelAr : gate.labelEn}
              </span>
            </label>
          ))}
        </div>
      </Section>

      {/* ── 5. Custom Fields ───────────────────────────────────────────────── */}
      <Section title={isAr ? '٥. الحقول المخصصة' : '5. Custom Fields'}>
        {fields.length === 0 && (
          <p className="text-xs text-slate-400">
            {isAr ? 'لا توجد حقول مخصصة بعد.' : 'No custom fields yet.'}
          </p>
        )}
        <div className="space-y-4">
          {fields.map((field, fi) => (
            <div key={fi} className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">
                  {isAr ? `الحقل ${fi + 1}` : `Field ${fi + 1}`}
                </span>
                <button
                  type="button"
                  onClick={() => removeField(fi)}
                  className="text-xs text-red-500 hover:text-red-700 transition-colors"
                >
                  {isAr ? 'حذف' : 'Remove'}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* key */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">
                    {isAr ? 'المفتاح (key) *' : 'Key *'}
                  </label>
                  <input
                    dir="ltr"
                    className={INPUT}
                    value={field.key}
                    onChange={e =>
                      updateField(fi, { key: e.target.value.replace(/\s+/g, '_').toLowerCase() })
                    }
                    placeholder="field_key"
                  />
                </div>
                {/* label ar */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">
                    {isAr ? 'التسمية (ع) *' : 'Label (AR) *'}
                  </label>
                  <input
                    dir="rtl"
                    className={INPUT}
                    value={field.label_ar}
                    onChange={e => updateField(fi, { label_ar: e.target.value })}
                    placeholder="مثال: الوصف"
                  />
                </div>
                {/* label en */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">
                    {isAr ? 'التسمية (EN) *' : 'Label (EN) *'}
                  </label>
                  <input
                    dir="ltr"
                    className={INPUT}
                    value={field.label_en}
                    onChange={e => updateField(fi, { label_en: e.target.value })}
                    placeholder="e.g. Description"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* type */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">
                    {isAr ? 'نوع الحقل' : 'Field Type'}
                  </label>
                  <select
                    className={SELECT}
                    value={field.type}
                    onChange={e =>
                      updateField(fi, {
                        type: e.target.value as CustomField['type'],
                        options: [],
                      })
                    }
                  >
                    <option value="text">{isAr ? 'نص قصير' : 'Short text'}</option>
                    <option value="textarea">{isAr ? 'نص طويل' : 'Long text'}</option>
                    <option value="number">{isAr ? 'رقم' : 'Number'}</option>
                    <option value="date">{isAr ? 'تاريخ' : 'Date'}</option>
                    <option value="select">{isAr ? 'قائمة منسدلة' : 'Dropdown (select)'}</option>
                    <option value="file">{isAr ? 'ملف / مرفق' : 'File / attachment'}</option>
                  </select>
                </div>
                {/* required */}
                <div className="space-y-1 flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer select-none pb-0.5">
                    <input
                      type="checkbox"
                      checked={field.required}
                      onChange={e => updateField(fi, { required: e.target.checked })}
                      className="w-4 h-4 accent-blue-500 rounded"
                    />
                    <span className="text-sm text-slate-700">
                      {isAr ? 'حقل إلزامي' : 'Required field'}
                    </span>
                  </label>
                </div>
              </div>

              {/* Options sub-list — only for type=select */}
              {field.type === 'select' && (
                <div className="space-y-2 mt-1">
                  <p className="text-xs font-medium text-slate-600">
                    {isAr ? 'خيارات القائمة' : 'Dropdown Options'}
                  </p>
                  {field.options.map((opt, oi) => (
                    <div key={oi} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center">
                      <input
                        dir="ltr"
                        className={INPUT}
                        value={opt.value}
                        onChange={e => updateOption(fi, oi, { value: e.target.value })}
                        placeholder="value"
                      />
                      <input
                        dir="rtl"
                        className={INPUT}
                        value={opt.label_ar}
                        onChange={e => updateOption(fi, oi, { label_ar: e.target.value })}
                        placeholder="تسمية ع"
                      />
                      <input
                        dir="ltr"
                        className={INPUT}
                        value={opt.label_en}
                        onChange={e => updateOption(fi, oi, { label_en: e.target.value })}
                        placeholder="Label EN"
                      />
                      <button
                        type="button"
                        onClick={() => removeOption(fi, oi)}
                        className="text-xs text-red-400 hover:text-red-600 transition-colors shrink-0"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addOption(fi)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
                  >
                    {isAr ? '+ إضافة خيار' : '+ Add option'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addField}
          className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors flex items-center gap-1"
        >
          <span>+</span>
          <span>{isAr ? 'إضافة حقل مخصص' : 'Add Custom Field'}</span>
        </button>
      </Section>

      {/* ── Error ──────────────────────────────────────────────────────────── */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {/* ── Actions ────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 justify-end pb-8">
        <button
          type="button"
          onClick={() => router.push('/dashboard/admin/custom-requests')}
          className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
        >
          {isAr ? 'إلغاء' : 'Cancel'}
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || isPending}
          className="px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving
            ? isAr ? 'جارٍ الحفظ...' : 'Saving...'
            : isAr ? 'حفظ النوع' : 'Save Type'}
        </button>
      </div>
    </div>
  );
}
