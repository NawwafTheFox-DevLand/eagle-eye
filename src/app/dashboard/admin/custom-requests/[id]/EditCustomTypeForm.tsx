'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { updateCustomRequestType } from '@/app/actions/custom-requests';

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
  typeId: string;
  initialData: any;
  companies: { id: string; name_ar: string; name_en: string; code: string }[];
  departments: { id: string; name_ar: string; name_en: string; code: string; company_id: string }[];
  employeeCompanyId: string;
}

const INPUT =
  'w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white';

function emptyStep(): FlowStep {
  return { company_id: '', department_id: '', action_label_ar: '', action_label_en: '' };
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
      <h2 className="text-base font-semibold text-slate-800 border-b border-slate-100 pb-2">{title}</h2>
      {children}
    </div>
  );
}

function mapInitialSteps(steps: any[]): FlowStep[] {
  if (!steps || steps.length === 0) return [emptyStep(), emptyStep()];
  return steps.map((s: any) => ({
    company_id:       s.company_id || '',
    department_id:    s.department_id || '',
    action_label_ar:  s.action_label_ar || '',
    action_label_en:  s.action_label_en || '',
  }));
}

function mapInitialFields(fields: any[]): CustomField[] {
  if (!fields) return [];
  return fields.map((f: any) => ({
    key:      f.key || '',
    label_ar: f.label_ar || '',
    label_en: f.label_en || '',
    type:     f.type || 'text',
    required: !!f.required,
    options:  f.options || [],
  }));
}

export default function EditCustomTypeForm({ typeId, initialData, companies, departments }: Props) {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [nameAr, setNameAr]         = useState(initialData.name_ar || '');
  const [nameEn, setNameEn]         = useState(initialData.name_en || '');
  const [descAr, setDescAr]         = useState(initialData.description_ar || '');
  const [descEn, setDescEn]         = useState(initialData.description_en || '');
  const [icon, setIcon]             = useState(initialData.icon || '📝');
  const [flowMode, setFlowMode]     = useState<'free' | 'fixed'>(initialData.flow_mode || 'free');
  const [mustEndCompanyId, setMustEndCompanyId] = useState(initialData.must_end_company_id || '');
  const [mustEndDeptId, setMustEndDeptId]       = useState(initialData.must_end_dept_id || '');
  const [steps, setSteps]           = useState<FlowStep[]>(mapInitialSteps(initialData.steps || []));
  const [allowedCreators, setAllowedCreators] = useState<'own_dept' | 'own_company' | 'all'>(
    initialData.allowed_creators || 'own_dept'
  );
  const [requiresCEO, setRequiresCEO]         = useState(!!initialData.requires_ceo);
  const [requiresHR, setRequiresHR]           = useState(!!initialData.requires_hr);
  const [requiresFinance, setRequiresFinance] = useState(!!initialData.requires_finance);
  const [fields, setFields]         = useState<CustomField[]>(mapInitialFields(initialData.custom_fields || []));

  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');

  function deptsForCompany(companyId: string) {
    return departments.filter(d => d.company_id === companyId);
  }

  function updateStep(index: number, patch: Partial<FlowStep>) {
    setSteps(prev => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function addStep() { setSteps(prev => [...prev, emptyStep()]); }

  function removeStep(index: number) {
    setSteps(prev => {
      if (prev.length <= 2) return prev;
      return prev.filter((_, i) => i !== index);
    });
  }

  function addField() {
    setFields(prev => [...prev, { key: '', label_ar: '', label_en: '', type: 'text', required: false, options: [] }]);
  }

  function updateField(index: number, patch: Partial<CustomField>) {
    setFields(prev => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  }

  function removeField(index: number) {
    setFields(prev => prev.filter((_, i) => i !== index));
  }

  function addOption(fi: number) {
    setFields(prev => prev.map((f, i) =>
      i === fi ? { ...f, options: [...f.options, { value: '', label_ar: '', label_en: '' }] } : f
    ));
  }

  function updateOption(fi: number, oi: number, patch: Partial<{ value: string; label_ar: string; label_en: string }>) {
    setFields(prev => prev.map((f, i) =>
      i === fi ? { ...f, options: f.options.map((o, j) => (j === oi ? { ...o, ...patch } : o)) } : f
    ));
  }

  function removeOption(fi: number, oi: number) {
    setFields(prev => prev.map((f, i) =>
      i === fi ? { ...f, options: f.options.filter((_, j) => j !== oi) } : f
    ));
  }

  function validate(): string | null {
    if (!nameAr.trim()) return isAr ? 'الاسم بالعربية مطلوب' : 'Arabic name is required';
    if (!nameEn.trim()) return isAr ? 'الاسم بالإنجليزية مطلوب' : 'English name is required';
    if (flowMode === 'fixed') {
      if (steps.length < 2) return isAr ? 'يجب تحديد خطوتين على الأقل' : 'At least 2 steps required';
      for (let i = 0; i < steps.length; i++) {
        if (!steps[i].company_id) return isAr ? `الخطوة ${i + 1}: اختر الشركة` : `Step ${i + 1}: select company`;
        if (!steps[i].department_id) return isAr ? `الخطوة ${i + 1}: اختر القسم` : `Step ${i + 1}: select dept`;
      }
    }
    for (let i = 0; i < fields.length; i++) {
      if (!fields[i].key.trim()) return isAr ? `الحقل ${i + 1}: المفتاح مطلوب` : `Field ${i + 1}: key required`;
      if (!fields[i].label_ar.trim()) return isAr ? `الحقل ${i + 1}: تسمية عربية مطلوبة` : `Field ${i + 1}: AR label required`;
      if (!fields[i].label_en.trim()) return isAr ? `الحقل ${i + 1}: تسمية إنجليزية مطلوبة` : `Field ${i + 1}: EN label required`;
    }
    return null;
  }

  async function handleSave() {
    setError('');
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setSaving(true);
    const result = await updateCustomRequestType(typeId, {
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

    if (result.error) { setError(result.error); return; }
    startTransition(() => router.push('/dashboard/admin/custom-requests'));
  }

  return (
    <div className="space-y-6">
      {/* 1. Basic Info */}
      <Section title={isAr ? '١. المعلومات الأساسية' : '1. Basic Information'}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">{isAr ? 'الاسم بالعربية *' : 'Name in Arabic *'}</label>
            <input dir="rtl" className={INPUT} value={nameAr} onChange={e => setNameAr(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">{isAr ? 'الاسم بالإنجليزية *' : 'Name in English *'}</label>
            <input dir="ltr" className={INPUT} value={nameEn} onChange={e => setNameEn(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">{isAr ? 'الوصف بالعربية' : 'Description in Arabic'}</label>
            <textarea dir="rtl" rows={2} className={INPUT} value={descAr} onChange={e => setDescAr(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">{isAr ? 'الوصف بالإنجليزية' : 'Description in English'}</label>
            <textarea dir="ltr" rows={2} className={INPUT} value={descEn} onChange={e => setDescEn(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1 max-w-[160px]">
          <label className="text-xs font-medium text-slate-600">{isAr ? 'الأيقونة (إيموجي)' : 'Icon (emoji)'}</label>
          <input className={INPUT} value={icon} onChange={e => setIcon(e.target.value)} maxLength={4} />
        </div>
      </Section>

      {/* 2. Flow Mode */}
      <Section title={isAr ? '٢. نمط المسار' : '2. Flow Mode'}>
        <div className="flex gap-6">
          {(['free', 'fixed'] as const).map(mode => (
            <label key={mode} className="flex items-center gap-2 cursor-pointer select-none">
              <input type="radio" name="flowMode" value={mode} checked={flowMode === mode}
                onChange={() => setFlowMode(mode)} className="accent-blue-500" />
              <span className="text-sm font-medium text-slate-700">
                {mode === 'free'
                  ? (isAr ? 'حر' : 'Free')
                  : (isAr ? 'ثابت' : 'Fixed')}
              </span>
            </label>
          ))}
        </div>

        {flowMode === 'free' && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">{isAr ? 'الشركة النهائية (اختياري)' : 'Final Company (optional)'}</label>
              <select className={INPUT} value={mustEndCompanyId}
                onChange={e => { setMustEndCompanyId(e.target.value); setMustEndDeptId(''); }}>
                <option value="">{isAr ? '— بلا قيد —' : '— None —'}</option>
                {companies.map(c => <option key={c.id} value={c.id}>{isAr ? c.name_ar : c.name_en}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">{isAr ? 'القسم النهائي (اختياري)' : 'Final Dept (optional)'}</label>
              <select className={INPUT} value={mustEndDeptId} onChange={e => setMustEndDeptId(e.target.value)} disabled={!mustEndCompanyId}>
                <option value="">{isAr ? '— بلا قيد —' : '— None —'}</option>
                {departments.filter(d => d.company_id === mustEndCompanyId).map(d => (
                  <option key={d.id} value={d.id}>{isAr ? d.name_ar : d.name_en}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {flowMode === 'fixed' && (
          <div className="mt-4 space-y-3">
            {steps.map((step, idx) => {
              const isLast = idx === steps.length - 1;
              return (
                <div key={idx} className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50">
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
                      <button type="button" onClick={() => removeStep(idx)}
                        className="text-xs text-red-500 hover:text-red-700">
                        {isAr ? 'حذف' : 'Remove'}
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600">{isAr ? 'الشركة' : 'Company'}</label>
                      <select className={INPUT} value={step.company_id}
                        onChange={e => updateStep(idx, { company_id: e.target.value, department_id: '' })}>
                        <option value="">{isAr ? 'اختر شركة' : 'Select company'}</option>
                        {companies.map(c => <option key={c.id} value={c.id}>{isAr ? c.name_ar : c.name_en}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600">{isAr ? 'القسم' : 'Department'}</label>
                      <select className={INPUT} value={step.department_id}
                        onChange={e => updateStep(idx, { department_id: e.target.value })}
                        disabled={!step.company_id}>
                        <option value="">{isAr ? 'اختر قسم' : 'Select dept'}</option>
                        {deptsForCompany(step.company_id).map(d => (
                          <option key={d.id} value={d.id}>{isAr ? d.name_ar : d.name_en}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600">{isAr ? 'تسمية الإجراء (ع)' : 'Action (AR)'}</label>
                      <input dir="rtl" className={INPUT} value={step.action_label_ar}
                        onChange={e => updateStep(idx, { action_label_ar: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600">{isAr ? 'تسمية الإجراء (EN)' : 'Action (EN)'}</label>
                      <input dir="ltr" className={INPUT} value={step.action_label_en}
                        onChange={e => updateStep(idx, { action_label_en: e.target.value })} />
                    </div>
                  </div>
                </div>
              );
            })}
            <button type="button" onClick={addStep}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium">
              {isAr ? '+ إضافة خطوة' : '+ Add Step'}
            </button>
          </div>
        )}
      </Section>

      {/* 3. Access */}
      <Section title={isAr ? '٣. صلاحية الإنشاء' : '3. Access Control'}>
        <div className="flex flex-col gap-3">
          {([
            { value: 'own_dept', ar: 'قسمي فقط', en: 'Own dept only' },
            { value: 'own_company', ar: 'شركتي', en: 'My company' },
            { value: 'all', ar: 'الجميع', en: 'All' },
          ] as { value: 'own_dept' | 'own_company' | 'all'; ar: string; en: string }[]).map(opt => (
            <label key={opt.value} className="flex items-center gap-2 cursor-pointer select-none">
              <input type="radio" name="allowedCreators" value={opt.value}
                checked={allowedCreators === opt.value}
                onChange={() => setAllowedCreators(opt.value)} className="accent-blue-500" />
              <span className="text-sm text-slate-700">{isAr ? opt.ar : opt.en}</span>
            </label>
          ))}
        </div>
      </Section>

      {/* 4. Gates */}
      <Section title={isAr ? '٤. بوابات الاعتماد' : '4. Approval Gates'}>
        <div className="flex flex-col gap-3">
          {[
            { key: 'ceo', ar: 'يتطلب CEO', en: 'Requires CEO', value: requiresCEO, setter: setRequiresCEO },
            { key: 'hr', ar: 'يتطلب HR', en: 'Requires HR', value: requiresHR, setter: setRequiresHR },
            { key: 'fin', ar: 'يتطلب المالية', en: 'Requires Finance', value: requiresFinance, setter: setRequiresFinance },
          ].map(g => (
            <label key={g.key} className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={g.value} onChange={e => g.setter(e.target.checked)}
                className="w-4 h-4 accent-blue-500 rounded" />
              <span className="text-sm text-slate-700">{isAr ? g.ar : g.en}</span>
            </label>
          ))}
        </div>
      </Section>

      {/* 5. Custom Fields */}
      <Section title={isAr ? '٥. الحقول المخصصة' : '5. Custom Fields'}>
        {fields.length === 0 && (
          <p className="text-xs text-slate-400">{isAr ? 'لا توجد حقول.' : 'No custom fields.'}</p>
        )}
        <div className="space-y-4">
          {fields.map((field, fi) => (
            <div key={fi} className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">
                  {isAr ? `الحقل ${fi + 1}` : `Field ${fi + 1}`}
                </span>
                <button type="button" onClick={() => removeField(fi)} className="text-xs text-red-500">
                  {isAr ? 'حذف' : 'Remove'}
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">{isAr ? 'المفتاح *' : 'Key *'}</label>
                  <input dir="ltr" className={INPUT} value={field.key}
                    onChange={e => updateField(fi, { key: e.target.value.replace(/\s+/g, '_').toLowerCase() })} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">{isAr ? 'التسمية (ع) *' : 'Label AR *'}</label>
                  <input dir="rtl" className={INPUT} value={field.label_ar}
                    onChange={e => updateField(fi, { label_ar: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">{isAr ? 'التسمية (EN) *' : 'Label EN *'}</label>
                  <input dir="ltr" className={INPUT} value={field.label_en}
                    onChange={e => updateField(fi, { label_en: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">{isAr ? 'النوع' : 'Type'}</label>
                  <select className={INPUT} value={field.type}
                    onChange={e => updateField(fi, { type: e.target.value as CustomField['type'], options: [] })}>
                    <option value="text">{isAr ? 'نص قصير' : 'Short text'}</option>
                    <option value="textarea">{isAr ? 'نص طويل' : 'Long text'}</option>
                    <option value="number">{isAr ? 'رقم' : 'Number'}</option>
                    <option value="date">{isAr ? 'تاريخ' : 'Date'}</option>
                    <option value="select">{isAr ? 'قائمة' : 'Dropdown'}</option>
                    <option value="file">{isAr ? 'ملف' : 'File'}</option>
                  </select>
                </div>
                <div className="flex items-end pb-0.5">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={field.required}
                      onChange={e => updateField(fi, { required: e.target.checked })}
                      className="w-4 h-4 accent-blue-500 rounded" />
                    <span className="text-sm text-slate-700">{isAr ? 'إلزامي' : 'Required'}</span>
                  </label>
                </div>
              </div>
              {field.type === 'select' && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-slate-600">{isAr ? 'الخيارات' : 'Options'}</p>
                  {field.options.map((opt, oi) => (
                    <div key={oi} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center">
                      <input dir="ltr" className={INPUT} value={opt.value}
                        onChange={e => updateOption(fi, oi, { value: e.target.value })} placeholder="value" />
                      <input dir="rtl" className={INPUT} value={opt.label_ar}
                        onChange={e => updateOption(fi, oi, { label_ar: e.target.value })} placeholder="تسمية" />
                      <input dir="ltr" className={INPUT} value={opt.label_en}
                        onChange={e => updateOption(fi, oi, { label_en: e.target.value })} placeholder="Label" />
                      <button type="button" onClick={() => removeOption(fi, oi)}
                        className="text-xs text-red-400 hover:text-red-600">✕</button>
                    </div>
                  ))}
                  <button type="button" onClick={() => addOption(fi)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                    {isAr ? '+ إضافة خيار' : '+ Add option'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
        <button type="button" onClick={addField}
          className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
          <span>+</span>
          <span>{isAr ? 'إضافة حقل مخصص' : 'Add Custom Field'}</span>
        </button>
      </Section>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>
      )}

      <div className="flex items-center gap-3 justify-end pb-8">
        <button type="button" onClick={() => router.push('/dashboard/admin/custom-requests')}
          className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
          {isAr ? 'إلغاء' : 'Cancel'}
        </button>
        <button type="button" onClick={handleSave} disabled={saving || isPending}
          className="px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
          {saving ? (isAr ? 'جارٍ الحفظ...' : 'Saving...') : (isAr ? 'حفظ التغييرات' : 'Save Changes')}
        </button>
      </div>
    </div>
  );
}
