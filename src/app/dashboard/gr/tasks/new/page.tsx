'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { createGRTask } from '@/app/actions/gr';

const TASK_TYPES = [
  { value: 'annual_renewal',  ar: 'تجديد سنوي',         en: 'Annual Renewal' },
  { value: 'issuance',        ar: 'إصدار',               en: 'Issuance' },
  { value: 'cancellation',    ar: 'إلغاء',               en: 'Cancellation' },
  { value: 'inquiry',         ar: 'استفسار',             en: 'Inquiry' },
  { value: 'violation',       ar: 'مخالفة',              en: 'Violation' },
  { value: 'workshop',        ar: 'ورشة عمل',            en: 'Workshop' },
  { value: 'investigation',   ar: 'تحقيق',               en: 'Investigation' },
  { value: 'committee',       ar: 'لجنة',                en: 'Committee' },
];

const PRIORITIES = [
  { value: 'urgent', ar: 'عاجل',   en: 'Urgent' },
  { value: 'high',   ar: 'عالي',   en: 'High' },
  { value: 'normal', ar: 'عادي',   en: 'Normal' },
  { value: 'low',    ar: 'منخفض',  en: 'Low' },
];

export default function NewGRTaskPage() {
  const { lang } = useLanguage();
  const router = useRouter();

  const [taskType, setTaskType] = useState('annual_renewal');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('normal');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!subject.trim()) {
      setError(lang === 'ar' ? 'يرجى إدخال موضوع المهمة' : 'Please enter a task subject');
      return;
    }
    setSubmitting(true);
    try {
      const task = await createGRTask({
        task_type: taskType,
        subject: subject.trim(),
        description: description.trim() || null,
        due_date: dueDate || null,
        priority,
        status: 'pending',
      });
      router.push(`/dashboard/gr/tasks/${task.id}`);
    } catch (err: any) {
      setError(err.message || (lang === 'ar' ? 'حدث خطأ' : 'An error occurred'));
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <button onClick={() => router.back()} className="text-sm text-slate-500 hover:text-slate-700 mb-4 flex items-center gap-1">
          ← {lang === 'ar' ? 'رجوع' : 'Back'}
        </button>
        <h1 className="text-2xl font-bold text-slate-900">
          {lang === 'ar' ? 'مهمة علاقات حكومية جديدة' : 'New GR Task'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {lang === 'ar' ? 'نوع المهمة' : 'Task Type'}
          </label>
          <select value={taskType} onChange={e => setTaskType(e.target.value)} className="input-field w-full">
            {TASK_TYPES.map(t => (
              <option key={t.value} value={t.value}>{lang === 'ar' ? t.ar : t.en}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {lang === 'ar' ? 'الموضوع' : 'Subject'} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            required
            className="input-field w-full"
            placeholder={lang === 'ar' ? 'أدخل موضوع المهمة...' : 'Enter task subject...'}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {lang === 'ar' ? 'الوصف' : 'Description'}
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            className="input-field w-full resize-none"
            placeholder={lang === 'ar' ? 'تفاصيل إضافية (اختياري)...' : 'Additional details (optional)...'}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {lang === 'ar' ? 'الأولوية' : 'Priority'}
            </label>
            <select value={priority} onChange={e => setPriority(e.target.value)} className="input-field w-full">
              {PRIORITIES.map(p => (
                <option key={p.value} value={p.value}>{lang === 'ar' ? p.ar : p.en}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {lang === 'ar' ? 'تاريخ الاستحقاق' : 'Due Date'}
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="input-field w-full"
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-4 py-2.5 rounded-xl">{error}</p>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-60">
            {submitting
              ? (lang === 'ar' ? 'جارٍ الإنشاء...' : 'Creating...')
              : (lang === 'ar' ? 'إنشاء المهمة' : 'Create Task')}
          </button>
          <button type="button" onClick={() => router.back()} className="px-4 py-2.5 rounded-xl text-sm text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors">
            {lang === 'ar' ? 'إلغاء' : 'Cancel'}
          </button>
        </div>
      </form>
    </div>
  );
}
