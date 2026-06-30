import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getSecretaries, deleteSecretary, saveUser, getUsers, getBranches } from '../../firebase/firestoreService';
import { UserPlus, Trash2, CheckCircle2, X, Users, Eye, EyeOff, Shield } from 'lucide-react';
import type { Secretary, UserProfile } from '../../types';

interface SuccessInfo { name: string; email: string; password: string; }

const ALL_SECRETARY_PAGES = [
  { key: 'patients', label: '📋 المرضى' },
  { key: 'finance',  label: '💰 المالية' },
  { key: 'sms',      label: '📱 إرسال SMS' },
];

export default function SecretaryManagement() {
  const { clinicId, userProfile } = useAuth();
  const [secretaries, setSecretaries] = useState<Secretary[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [successInfo, setSuccessInfo] = useState<SuccessInfo | null>(null);
  const [createError, setCreateError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', allowedPages: ['patients'] as string[] });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const availablePages = (() => {
    if (!clinicId) return ALL_SECRETARY_PAGES;
    const branch = getBranches().find((b) => b.id === clinicId);
    if (!branch || !branch.allowedSecretaryPages || branch.allowedSecretaryPages.length === 0) {
      return ALL_SECRETARY_PAGES;
    }
    return ALL_SECRETARY_PAGES.filter((p) => branch.allowedSecretaryPages!.includes(p.key));
  })();

  const fetchList = useCallback(async () => {
    if (!clinicId) { setLoadingList(false); return; }
    setLoadingList(true);
    try {
      const data = await getSecretaries(clinicId);
      setSecretaries(data);
    } finally {
      setLoadingList(false);
    }
  }, [clinicId]);

  useEffect(() => { fetchList(); }, [fetchList]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (form.name.trim().length < 2) e.name = 'الاسم مطلوب (حرفان على الأقل)';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'بريد إلكتروني غير صالح';
    if (form.password.length < 6) e.password = 'كلمة المرور 6 أحرف على الأقل';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !clinicId) return;
    setIsSubmitting(true);
    setCreateError('');
    try {
      const existing = getUsers().find((u) => u.email === form.email);
      if (existing) { setCreateError('هذا البريد الإلكتروني مستخدم مسبقاً'); return; }

      const newUser: UserProfile = {
        uid: crypto.randomUUID(),
        email: form.email,
        password: form.password,
        displayName: form.name,
        role: 'secretary',
        clinicId,
        doctorId: userProfile?.uid ?? '',
        allowedPages: form.allowedPages,
      };
      saveUser(newUser);
      setSuccessInfo({ name: form.name, email: form.email, password: form.password });
      setForm({ name: '', email: '', password: '', allowedPages: ['patients'] });
      setShowForm(false);
      await fetchList();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (sec: Secretary) => {
    if (!confirm(`هل تريد حذف حساب ${sec.displayName}؟`)) return;
    await deleteSecretary(sec.id);
    await fetchList();
  };

  const togglePage = (key: string) => {
    setForm((f) => ({
      ...f,
      allowedPages: f.allowedPages.includes(key)
        ? f.allowedPages.filter((p) => p !== key)
        : [...f.allowedPages, key],
    }));
  };

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-600" />
          <h3 className="font-semibold text-slate-700 dark:text-slate-200 text-sm">السكرتارية ({secretaries.length})</h3>
        </div>
        <button onClick={() => { setShowForm(!showForm); setCreateError(''); setSuccessInfo(null); }}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-xl transition">
          <UserPlus className="w-3.5 h-3.5" /> إضافة سكرتير
        </button>
      </div>

      {successInfo && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-2xl p-4 relative">
          <button onClick={() => setSuccessInfo(null)} className="absolute top-3 left-3 text-emerald-400 hover:text-emerald-600"><X className="w-4 h-4" /></button>
          <div className="flex items-center gap-2 mb-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /><span className="font-semibold text-emerald-800 dark:text-emerald-400 text-sm">تم إنشاء الحساب بنجاح!</span></div>
          <div className="text-xs text-emerald-700 dark:text-emerald-400 space-y-1">
            <p>👤 <strong>الاسم:</strong> {successInfo.name}</p>
            <p>📧 <strong>البريد:</strong> {successInfo.email}</p>
            <p>🔑 <strong>كلمة المرور:</strong> <span className="font-mono bg-emerald-100 dark:bg-emerald-800 px-2 py-0.5 rounded">{successInfo.password}</span></p>
          </div>
          <p className="text-[10px] text-emerald-500 mt-2 border-t border-emerald-200 dark:border-emerald-700 pt-2">احتفظ بهذه المعلومات — لن تظهر مجدداً</p>
        </div>
      )}

      {showForm && (
        <div className="bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-2xl p-4">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">إنشاء حساب سكرتير جديد</h4>
          {createError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl px-3 py-2 text-red-700 dark:text-red-400 text-xs mb-3">{createError}</div>
          )}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">الاسم الكامل</label>
              <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="اسم السكرتير"
                className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">البريد الإلكتروني</label>
              <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="secretary@clinic.com"
                className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" dir="ltr" />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">كلمة المرور</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder="6 أحرف على الأقل"
                  className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pl-10" dir="ltr" />
                <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 mb-2">
                <Shield className="w-3.5 h-3.5 text-blue-500" /> الصفحات المسموح بها
              </label>
              {availablePages.length === 0 ? (
                <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
                  ⚠️ لا توجد صلاحيات محددة لهذا الفرع. يرجى تحديث إعدادات الفرع من المدير العام.
                </p>
              ) : (
                <div className="flex gap-2 flex-wrap">
                  {availablePages.map((pg) => (
                    <button key={pg.key} type="button" onClick={() => togglePage(pg.key)}
                      className={`text-xs px-3 py-1.5 rounded-lg border transition ${form.allowedPages.includes(pg.key) ? 'bg-blue-600 text-white border-blue-700' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-blue-400'}`}>
                      {pg.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={isSubmitting}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium px-4 py-2.5 rounded-xl transition text-xs">
                {isSubmitting ? <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> جارٍ الإنشاء...</> : <><UserPlus className="w-3.5 h-3.5" /> إنشاء الحساب</>}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setCreateError(''); setErrors({}); }}
                className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 text-slate-700 dark:text-slate-200 text-xs transition">
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

      {loadingList ? (
        <div className="flex justify-center py-6"><div className="w-6 h-6 border-[3px] border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : secretaries.length === 0 ? (
        <div className="flex flex-col items-center py-8 gap-2 text-slate-400"><Users className="w-8 h-8 opacity-30" /><p className="text-xs">لا يوجد سكرتارية مضافون بعد</p></div>
      ) : (
        <div className="space-y-2">
          {secretaries.map((sec) => (
            <div key={sec.id} className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center shrink-0">
                  <span className="text-blue-600 dark:text-blue-400 text-xs font-bold">{sec.displayName.charAt(0)}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{sec.displayName}</p>
                  <p className="text-xs text-slate-400 truncate" dir="ltr">{sec.email}</p>
                  {sec.allowedPages && sec.allowedPages.length > 0 && (
                    <p className="text-[10px] text-blue-500 mt-0.5">
                      🔑 {sec.allowedPages.map((k) => ALL_SECRETARY_PAGES.find((p) => p.key === k)?.label ?? k).join(' ، ')}
                    </p>
                  )}
                </div>
              </div>
              <button onClick={() => handleDelete(sec)} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition shrink-0" title="حذف السكرتير">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
