import { useState, useEffect } from 'react';
import { Layout } from '../components/shared/Layout';
import {
  getBranches, saveBranch, deleteBranch, createBranchRecord,
  getUsers, saveUser, deleteUser,
} from '../firebase/firestoreService';
import type { Branch, UserProfile, UserRole } from '../types';
import {
  Building2, Users, Plus, Trash2, X, CheckCircle2, Eye, EyeOff,
  Edit2, Save, Shield, ChevronDown, ChevronUp,
} from 'lucide-react';

type Tab = 'branches' | 'managers';
// استبدلي تعريف ALL_DOCTOR_PAGES بالمحتوى التالي
const ALL_DOCTOR_PAGES = [
  { key: 'patients',    label: '📋 المرضى' },
  { key: 'secretaries', label: '🗂️ السكرتارية' },
  { key: 'doctors',     label: '🩺 الأطباء' },
  { key: 'warehouse',   label: '📦 المخزن' },
  { key: 'accounting',  label: '🧾 المحاسبة' },
  { key: 'statistics',  label: '📊 الإحصائيات' },
  { key: 'appearance',  label: '🎨 المظهر' },
  { key: 'labs',        label: '🧪 المعامل' },
  { key: 'radiology',   label: '🩻 الأشعة' },
  { key: 'treatment_plan_print', label: '🖨️ طباعة الخطة العلاجية' },
];

// استبدلي تعريف ALL_SECRETARY_PAGES بالمحتوى التالي
const ALL_SECRETARY_PAGES = [
  { key: 'patients', label: '📋 المرضى' },
  { key: 'finance',  label: '💰 المالية' },
  { key: 'sms',      label: '📱 إرسال SMS' },
  { key: 'radiology', label: '🩻 الأشعة' },
  { key: 'labs',      label: '🧪 المعامل' },
];

function Input({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">{label}</label>
      <input {...props} className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
    </div>
  );
}

function PageToggle({
  options, selected, onToggle, color = 'blue',
}: {
  options: { key: string; label: string }[];
  selected: string[];
  onToggle: (key: string) => void;
  color?: string;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((pg) => (
        <button
          key={pg.key}
          type="button"
          onClick={() => onToggle(pg.key)}
          className={`text-xs px-2.5 py-1.5 rounded-lg border transition font-medium ${
            selected.includes(pg.key)
              ? color === 'blue' ? 'bg-blue-600 text-white border-blue-700' : 'bg-purple-600 text-white border-purple-700'
              : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-blue-400'
          }`}
        >
          {pg.label}
        </button>
      ))}
    </div>
  );
}

export default function AdminDashboard() {
  const [tab, setTab] = useState<Tab>('branches');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);

  const [showBranchForm, setShowBranchForm] = useState(false);
  const [branchForm, setBranchForm] = useState({
    name: '', address: '', phone: '',
    allowedDoctorPages: [] as string[],
    allowedSecretaryPages: [] as string[],
  });
  const [editBranch, setEditBranch] = useState<Branch | null>(null);
  const [showBranchPerms, setShowBranchPerms] = useState(false);

  const [showUserForm, setShowUserForm] = useState(false);
  const [userForm, setUserForm] = useState({
    displayName: '', email: '', password: '',
    role: 'branch_manager' as UserRole,
    clinicId: '',
    allowedPages: [] as string[],
  });
  const [showPass, setShowPass] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');

  const reload = async () => {
    setBranches(await getBranches());
    setUsers((await getUsers()).filter((u) => u.role !== 'superadmin'));
  };

  useEffect(() => { reload(); }, []);

  const flash = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3000); };

  const toggleBranchDoctorPage = (key: string) =>
    setBranchForm((f) => ({ ...f, allowedDoctorPages: f.allowedDoctorPages.includes(key) ? f.allowedDoctorPages.filter((p) => p !== key) : [...f.allowedDoctorPages, key] }));

  const toggleBranchSecretaryPage = (key: string) =>
    setBranchForm((f) => ({ ...f, allowedSecretaryPages: f.allowedSecretaryPages.includes(key) ? f.allowedSecretaryPages.filter((p) => p !== key) : [...f.allowedSecretaryPages, key] }));

  const handleSaveBranch = async () => {
    if (!branchForm.name.trim()) return;
    if (editBranch) {
      await saveBranch({
        ...editBranch,
        name: branchForm.name,
        address: branchForm.address,
        phone: branchForm.phone,
        allowedDoctorPages: branchForm.allowedDoctorPages,
        allowedSecretaryPages: branchForm.allowedSecretaryPages,
      });
      setEditBranch(null);
    } else {
      await createBranchRecord({
        name: branchForm.name,
        address: branchForm.address,
        phone: branchForm.phone,
        allowedDoctorPages: branchForm.allowedDoctorPages,
        allowedSecretaryPages: branchForm.allowedSecretaryPages,
      });
    }
    setBranchForm({ name: '', address: '', phone: '', allowedDoctorPages: [], allowedSecretaryPages: [] });
    setShowBranchForm(false);
    setShowBranchPerms(false);
    await reload();
    flash('تم حفظ الفرع بنجاح');
  };

  const handleStartEditBranch = (b: Branch) => {
    setEditBranch(b);
    setBranchForm({
      name: b.name,
      address: b.address ?? '',
      phone: b.phone ?? '',
      allowedDoctorPages: b.allowedDoctorPages ?? [],
      allowedSecretaryPages: b.allowedSecretaryPages ?? [],
    });
    setShowBranchForm(true);
    setShowBranchPerms(true);
  };

  const handleDeleteBranch = async (id: string) => {
    if (!confirm('هل تريد حذف هذا الفرع؟')) return;
    await deleteBranch(id);
    await reload();
  };

  const toggleManagerBranch = async (branchId: string, managerId: string) => {
    const allBranches = await getBranches();
    const branch = allBranches.find((b) => b.id === branchId);
    if (!branch) return;
    // DEFENSIVE: Handle undefined managerIds from old branches
    const currentManagerIds = branch.managerIds ?? [];
    const ids = currentManagerIds.includes(managerId)
      ? currentManagerIds.filter((id) => id !== managerId)
      : [...currentManagerIds, managerId];
    await saveBranch({ ...branch, managerIds: ids });
    const allUsers = await getUsers();
    const user = allUsers.find((u) => u.uid === managerId);
    if (user) await saveUser({ ...user, clinicId: ids.length > 0 ? branchId : '' });
    await reload();
  };

  const getAvailablePages = () => {
    if (userForm.role === 'branch_manager') return [];
    const branch = branches.find((b) => b.id === userForm.clinicId);
    if (userForm.role === 'doctor') {
      return branch ? ALL_DOCTOR_PAGES.filter((p) => (branch.allowedDoctorPages ?? []).includes(p.key)) : ALL_DOCTOR_PAGES;
    }
    if (userForm.role === 'secretary') {
      return branch ? ALL_SECRETARY_PAGES.filter((p) => (branch.allowedSecretaryPages ?? []).includes(p.key)) : ALL_SECRETARY_PAGES;
    }
    return [];
  };

  const togglePage = (key: string) =>
    setUserForm((f) => ({ ...f, allowedPages: f.allowedPages.includes(key) ? f.allowedPages.filter((p) => p !== key) : [...f.allowedPages, key] }));

  const roleLabel = (r: string) => ({ branch_manager: 'مدير فرع', doctor: 'طبيب', secretary: 'سكرتير' }[r] ?? r);
  const roleColor = (r: string) => ({ branch_manager: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', doctor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', secretary: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' }[r] ?? '');

  const availablePages = getAvailablePages();
  const filteredUsers = filterRole === 'all' ? users : users.filter((u) => u.role === filterRole);

  return (
    <Layout>
      <div className="space-y-5" dir="rtl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
            <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-white">🔐 لوحة التحكم</h1>
            <p className="text-xs text-slate-400 mt-0.5">إدارة الفروع والمستخدمين والصلاحيات</p>
          </div>
        </div>

        {successMsg && (
          <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl px-4 py-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="text-sm text-emerald-700 dark:text-emerald-400 font-semibold">{successMsg}</span>
          </div>
        )}

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
          <div className="flex gap-0 border-b border-slate-200 dark:border-slate-700">
            {[{ id: 'branches' as Tab, label: 'الفروع وصلاحياتها', icon: Building2 }, { id: 'managers' as Tab, label: 'المستخدمون', icon: Users }].map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-6 py-3.5 text-sm font-semibold transition border-b-2 ${tab === t.id ? 'border-blue-600 text-blue-600 bg-blue-50/50 dark:bg-blue-900/10' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>
                <t.icon className="w-4 h-4" />
                {t.label}
                <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded-full">
                  {t.id === 'branches' ? branches.length : users.length}
                </span>
              </button>
            ))}
          </div>

          <div className="p-5">
            {tab === 'branches' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-300">إجمالي الفروع: {branches.length}</p>
                  <button onClick={() => { setEditBranch(null); setBranchForm({ name: '', address: '', phone: '', allowedDoctorPages: [], allowedSecretaryPages: [] }); setShowBranchForm(true); setShowBranchPerms(false); }}
                    className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-xl transition">
                    <Plus className="w-3.5 h-3.5" /> فرع جديد
                  </button>
                </div>

                {showBranchForm && (
                  <div className="bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <Input label="اسم الفرع *" value={branchForm.name} onChange={(e) => setBranchForm((f) => ({ ...f, name: e.target.value }))} />
                      <Input label="العنوان" value={branchForm.address} onChange={(e) => setBranchForm((f) => ({ ...f, address: e.target.value }))} />
                      <Input label="الهاتف" value={branchForm.phone} onChange={(e) => setBranchForm((f) => ({ ...f, phone: e.target.value }))} />
                    </div>

                    <button
                      onClick={() => setShowBranchPerms((v) => !v)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition"
                    >
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-blue-500" />
                        صلاحيات مدير الفرع (ما يحق له منحه)
                      </span>
                      {showBranchPerms ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                    </button>
                    {showBranchPerms && (
                      <div className="p-4 space-y-4">
                        <div>
                          <p className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 mb-2">🩺 صفحات يمكن منحها للأطباء:</p>
                          <PageToggle options={ALL_DOCTOR_PAGES} selected={branchForm.allowedDoctorPages} onToggle={toggleBranchDoctorPage} color="blue" />
                          {branchForm.allowedDoctorPages.length === 0 && (
                            <p className="text-[10px] text-slate-400 mt-1">لم تحدد أي صلاحيات — سيرى مدير الفرع كل الصفحات</p>
                          )}
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 mb-2">🗂️ صفحات يمكن منحها للسكرتارية:</p>
                          <PageToggle options={ALL_SECRETARY_PAGES} selected={branchForm.allowedSecretaryPages} onToggle={toggleBranchSecretaryPage} color="purple" />
                          {branchForm.allowedSecretaryPages.length === 0 && (
                            <p className="text-[10px] text-slate-400 mt-1">لم تحدد أي صلاحيات — سيرى مدير الفرع كل الصفحات</p>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button onClick={handleSaveBranch} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-4 py-2.5 rounded-xl transition">
                        <Save className="w-3.5 h-3.5" /> {editBranch ? 'حفظ التعديلات' : 'إضافة الفرع'}
                      </button>
                      <button onClick={() => { setShowBranchForm(false); setEditBranch(null); setShowBranchPerms(false); }}
                        className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs transition hover:bg-slate-300 dark:hover:bg-slate-500">
                        إلغاء
                      </button>
                    </div>
                  </div>
                )}

                {branches.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-sm">لا توجد فروع — أضف فرعاً للبدء</div>
                ) : (
                  <div className="space-y-3">
                    {branches.map((b) => {
                      // DEFENSIVE: Handle undefined managerIds from old branches
                      const managerIds = b.managerIds ?? [];
                      const branchManagers = users.filter((u) => managerIds.includes(u.uid) && u.role === 'branch_manager');
                      const allowedDoc = b.allowedDoctorPages ?? [];
                      const allowedSec = b.allowedSecretaryPages ?? [];
                      return (
                        <div key={b.id} className="bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl p-4 space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-semibold text-slate-800 dark:text-white">{b.name}</p>
                              {b.address && <p className="text-xs text-slate-400">{b.address}</p>}
                              {b.phone && <p className="text-xs text-slate-400" dir="ltr">{b.phone}</p>}
                              <p className="text-xs text-slate-400 mt-1">
                                {branchManagers.length > 0
                                  ? `👤 المدراء: ${branchManagers.map((m) => m.displayName).join('، ')}`
                                  : '⚠️ لم يُعيَّن مدير لهذا الفرع'}
                              </p>
                            </div>
                            <div className="flex gap-1">
                              <button onClick={() => handleStartEditBranch(b)} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition">
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => handleDeleteBranch(b.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5">تعيين مدراء الفرع:</p>
                            <div className="flex flex-wrap gap-1.5">
                              {users.filter((u) => u.role === 'branch_manager').map((m) => (
                                <button key={m.uid} onClick={() => toggleManagerBranch(b.id, m.uid)}
                                  // DEFENSIVE: Handle undefined managerIds
                                  className={`text-xs px-2.5 py-1 rounded-lg border transition ${(b.managerIds ?? []).includes(m.uid) ? 'bg-purple-600 text-white border-purple-700' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-purple-400'}`}>
                                  {m.displayName}
                                </button>
                              ))}
                              {users.filter((u) => u.role === 'branch_manager').length === 0 && (
                                <span className="text-xs text-slate-400">لا يوجد مدراء فروع بعد</span>
                              )}
                            </div>
                          </div>
                          <div className="pt-2 border-t border-slate-200 dark:border-slate-600">
                            <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-2">الصلاحيات المفعلة:</p>
                            <div className="flex flex-wrap gap-1">
                              {allowedDoc.length > 0 && allowedDoc.map((key) => ALL_DOCTOR_PAGES.find((p) => p.key === key)).map((p) => p && (
                                <span key={p.key} className="text-[10px] px-2 py-1 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">{p.label}</span>
                              ))}
                              {allowedSec.length > 0 && allowedSec.map((key) => ALL_SECRETARY_PAGES.find((p) => p.key === key)).map((p) => p && (
                                <span key={p.key} className="text-[10px] px-2 py-1 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">{p.label}</span>
                              ))}
                              {allowedDoc.length === 0 && allowedSec.length === 0 && (
                                <span className="text-[10px] text-slate-400">— بدون قيود، كل الصلاحيات متاحة —</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {tab === 'managers' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3 justify-between">
                  <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}
                    className="border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="all">جميع الأدوار</option>
                    <option value="branch_manager">مدير فرع</option>
                    <option value="doctor">طبيب</option>
                    <option value="secretary">سكرتير</option>
                  </select>
                  <button onClick={() => { setShowUserForm(true); setUserForm({ displayName: '', email: '', password: '', role: 'branch_manager', clinicId: '', allowedPages: [] }); }}
                    className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-xl transition">
                    <Plus className="w-3.5 h-3.5" /> مستخدم جديد
                  </button>
                </div>

                {showUserForm && (
                  <div className="bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input label="الاسم *" value={userForm.displayName} onChange={(e) => setUserForm((f) => ({ ...f, displayName: e.target.value }))} />
                      <Input label="البريد الإلكتروني *" type="email" value={userForm.email} onChange={(e) => setUserForm((f) => ({ ...f, email: e.target.value }))} />
                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">كلمة المرور *</label>
                        <div className="relative">
                          <input type={showPass ? 'text' : 'password'} value={userForm.password}
                            onChange={(e) => setUserForm((f) => ({ ...f, password: e.target.value }))}
                            className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                          <button type="button" onClick={() => setShowPass((v) => !v)} className="absolute left-3 bottom-3 text-slate-400">
                            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">الدور</label>
                        <select value={userForm.role} onChange={(e) => setUserForm((f) => ({ ...f, role: e.target.value as UserRole, allowedPages: [] }))}
                          className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                          <option value="branch_manager">مدير فرع</option>
                          <option value="doctor">طبيب</option>
                          <option value="secretary">سكرتير</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">الفرع</label>
                        <select value={userForm.clinicId} onChange={(e) => setUserForm((f) => ({ ...f, clinicId: e.target.value, allowedPages: [] }))}
                          className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                          <option value="">— بدون فرع —</option>
                          {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                      </div>
                    </div>

                    {userForm.role !== 'branch_manager' && availablePages.length > 0 && (
                      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl p-3">
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                          <Shield className="w-3.5 h-3.5 text-blue-500" />
                          الصفحات المسموح بها
                          {userForm.clinicId && (
                            <span className="text-slate-400 font-normal">(مقيّدة بصلاحيات الفرع)</span>
                          )}
                        </p>
                        <PageToggle options={availablePages} selected={userForm.allowedPages} onToggle={togglePage} />
                      </div>
                    )}

                    {userForm.role !== 'branch_manager' && availablePages.length === 0 && userForm.clinicId && (
                      <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
                        ⚠️ هذا الفرع لم تُحدَّد له صلاحيات بعد. يرجى تعديل الفرع وتحديد الصلاحيات أولاً.
                      </div>
                    )}

                    {userForm.role === 'branch_manager' && (
                      <div className="text-xs text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg px-3 py-2">
                        ℹ️ مدير الفرع سيتمكن من منح الصلاحيات للمستخدمين بنفسه.
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button onClick={async () => {
                        if (!userForm.displayName || !userForm.email || !userForm.password) return;
                        const uid = crypto.randomUUID();
                        await saveUser({
                          uid,
                          displayName: userForm.displayName,
                          email: userForm.email,
                          password: userForm.password,
                          role: userForm.role,
                          clinicId: userForm.clinicId,
                          allowedPages: userForm.allowedPages,
                        });
                        setShowUserForm(false);
                        setUserForm({ displayName: '', email: '', password: '', role: 'branch_manager', clinicId: '', allowedPages: [] });
                        setShowPass(false);
                        await reload();
                        flash('تم إضافة المستخدم بنجاح');
                      }} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-4 py-2.5 rounded-xl transition">
                        <Save className="w-3.5 h-3.5" /> حفظ المستخدم
                      </button>
                      <button onClick={() => { setShowUserForm(false); setUserForm({ displayName: '', email: '', password: '', role: 'branch_manager', clinicId: '', allowedPages: [] }); setShowPass(false); }}
                        className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs transition hover:bg-slate-300 dark:hover:bg-slate-500">
                        إلغاء
                      </button>
                    </div>
                  </div>
                )}

                {filteredUsers.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-sm">لا يوجد مستخدمون</div>
                ) : (
                  <div className="space-y-2">
                    {filteredUsers.map((u) => {
                      const branch = branches.find((b) => b.id === u.clinicId);
                      return (
                        <div key={u.uid} className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 bg-slate-200 dark:bg-slate-600 rounded-full flex items-center justify-center shrink-0">
                              <span className="text-sm font-bold text-slate-600 dark:text-slate-300">{u.displayName.charAt(0)}</span>
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{u.displayName}</p>
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${roleColor(u.role)}`}>
                                  {roleLabel(u.role)}
                                </span>
                              </div>
                              <p className="text-xs text-slate-400 truncate" dir="ltr">{u.email}</p>
                              {branch && <p className="text-[10px] text-slate-400">📍 {branch.name}</p>}
                              {/* DEFENSIVE: Handle undefined allowedPages */}
                              {(u.allowedPages ?? []).length > 0 && !(u.allowedPages ?? []).includes('*') && (
                                <p className="text-[10px] text-blue-500">
                                  ({(u.allowedPages ?? []).length} صفحة)
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <button onClick={() => { setShowUserForm(true); setUserForm({ ...u, allowedPages: u.allowedPages ?? [] }); }}
                              className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={async () => { if (!confirm(`هل تريد حذف ${u.displayName}؟`)) return; await deleteUser(u.uid); await reload(); }}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
