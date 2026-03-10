'use client';

import { useState, useTransition } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { updateDepartmentHead } from '@/app/actions/admin';
import { useRouter } from 'next/navigation';

const t = {
  ar: { title: 'إدارة الأقسام', code: 'الرمز', name: 'اسم القسم', company: 'الشركة', head: 'رئيس القسم', noHead: 'غير محدد', save: 'حفظ', saving: 'جاري الحفظ...', selectHead: 'اختر رئيس القسم', total: 'قسم', saved: 'تم الحفظ' },
  en: { title: 'Department Management', code: 'Code', name: 'Department', company: 'Company', head: 'Department Head', noHead: 'Not assigned', save: 'Save', saving: 'Saving...', selectHead: 'Select department head', total: 'departments', saved: 'Saved' },
};

export default function DepartmentsClient({ departments, companies, employees }: any) {
  const { lang } = useLanguage();
  const L = t[lang];
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedHead, setSelectedHead] = useState<string>('');
  const [isPending, startTransition] = useTransition();
  const [savedId, setSavedId] = useState<string | null>(null);

  const companyMap = new Map(companies.map((c: any) => [c.id, c]));
  const empMap = new Map(employees.map((e: any) => [e.id, e]));

  function startEdit(dept: any) {
    setEditingId(dept.id);
    setSelectedHead(dept.head_employee_id || '');
  }

  function saveHead(deptId: string) {
    startTransition(async () => {
      await updateDepartmentHead(deptId, selectedHead || null);
      setEditingId(null);
      setSavedId(deptId);
      setTimeout(() => setSavedId(null), 2000);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{L.title}</h1>
        <p className="text-sm text-slate-500 mt-1">{departments.length} {L.total}</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-4 py-3 text-start font-medium text-slate-600">{L.code}</th>
                <th className="px-4 py-3 text-start font-medium text-slate-600">{L.name}</th>
                <th className="px-4 py-3 text-start font-medium text-slate-600">{L.company}</th>
                <th className="px-4 py-3 text-start font-medium text-slate-600 min-w-[250px]">{L.head}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {departments.map((dept: any) => {
                const co = companyMap.get(dept.company_id);
                const head = dept.head_employee_id ? empMap.get(dept.head_employee_id) : null;
                const isEditing = editingId === dept.id;
                const deptEmployees = employees.filter((e: any) => e.company_id === dept.company_id);

                return (
                  <tr key={dept.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{dept.code}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{dept.name_ar}</td>
                    <td className="px-4 py-3 text-slate-600">{co?.name_ar || '—'} <span className="text-xs text-slate-400">({co?.code})</span></td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <select value={selectedHead} onChange={e => setSelectedHead(e.target.value)} className="input-field text-xs py-1.5 flex-1">
                            <option value="">{L.selectHead}</option>
                            {deptEmployees.map((e: any) => (
                              <option key={e.id} value={e.id}>{e.full_name_ar} ({e.employee_code})</option>
                            ))}
                          </select>
                          <button onClick={() => saveHead(dept.id)} disabled={isPending}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-eagle-600 hover:bg-eagle-700 disabled:opacity-50">
                            {isPending ? L.saving : L.save}
                          </button>
                          <button onClick={() => setEditingId(null)} className="text-xs text-slate-400 hover:text-slate-600">✕</button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className={head ? 'text-slate-900' : 'text-slate-400 italic'}>
                            {head ? `${head.full_name_ar} (${head.employee_code})` : L.noHead}
                          </span>
                          {savedId === dept.id && <span className="text-xs text-emerald-600">✓ {L.saved}</span>}
                          <button onClick={() => startEdit(dept)} className="text-xs text-eagle-600 hover:underline ms-2">
                            {lang === 'ar' ? 'تعديل' : 'Edit'}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
