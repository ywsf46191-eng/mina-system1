import { useState, useCallback } from 'react';
import { Layout } from '../components/shared/Layout';
import { useAuth } from '../contexts/AuthContext';
import { usePatients } from '../hooks/usePatients';
import { updatePatient, deletePatient } from '../firebase/firestoreService';
import AddPatientForm from '../components/secretary/AddPatientForm';
import { PhoneInput } from '../components/shared/PhoneInput';
import { describeTooth, resolveVisualStatus } from '../lib/teeth';
import type { Patient, ToothState } from '../types';
import {
  Search, Users, Plus, Edit2, Trash2, X, Save, Phone, Calendar,
  ChevronDown, ChevronUp, UserCheck, Clock, Eye, CheckCircle,
} from 'lucide-react';

type View = 'list' | 'add';

function EditPatientModal({ patient, onClose, onSaved }: { patient: Patient; onClose: () => void; onSaved: () => void }) {
  const { userProfile } = useAuth();
  const [form, setForm] = useState({
    fullName: patient.fullName,
    phoneNumber: patient.phoneNumber,
    backupPhoneNumber: patient.backupPhoneNumber ?? '',
    gender: patient.gender,
    chronicDiseases: patient.chronicDiseases ?? '',
    currentMedications: patient.currentMedications ?? '',
    allergies: patient.allergies ?? '',
    nextAppointmentDate: patient.nextAppointmentDate ?? '',
    nextAppointmentTime: patient.nextAppointmentTime ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  const handleSave = async () => {
    setSaving(true);
    try {
      await updatePatient(patient.id, {
        ...form,
        lastEditedBy: userProfile?.displayName ?? 'سكرتير',
        lastEditedAt: new Date().toISOString(),
      });
      onSaved();
      if (form.nextAppointmentDate) {
        setSavedMsg('تم اضافة الموعد بنجاح');
        setTimeout(() => onClose(), 1500);
      } else {
        onClose();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" dir="rtl">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800">
          <h2 className="font-bold text-slate-800 dark:text-white">تعديل بيانات المريض</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">الاسم الكامل</label>
              <input value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">الجنس</label>
              <select value={form.gender} onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value as 'male' | 'female' }))}
                className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="male">ذكر</option>
                <option value="female">أنثى</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">رقم الجوال</label>
              <PhoneInput value={form.phoneNumber} onChange={(v) => setForm((f) => ({ ...f, phoneNumber: v }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">رقم احتياطي</label>
              <PhoneInput value={form.backupPhoneNumber} onChange={(v) => setForm((f) => ({ ...f, backupPhoneNumber: v }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">تاريخ الموعد القادم</label>
              <input type="date" value={form.nextAppointmentDate} onChange={(e) => setForm((f) => ({ ...f, nextAppointmentDate: e.target.value }))}
                className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">وقت الموعد</label>
              <input type="time" value={form.nextAppointmentTime} onChange={(e) => setForm((f) => ({ ...f, nextAppointmentTime: e.target.value }))}
                className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">الأمراض المزمنة</label>
            <textarea value={form.chronicDiseases} onChange={(e) => setForm((f) => ({ ...f, chronicDiseases: e.target.value }))} rows={2}
              className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">الأدوية الحالية</label>
            <textarea value={form.currentMedications} onChange={(e) => setForm((f) => ({ ...f, currentMedications: e.target.value }))} rows={2}
              className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">الحساسية</label>
            <textarea value={form.allergies} onChange={(e) => setForm((f) => ({ ...f, allergies: e.target.value }))} rows={2}
              className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
        </div>
        {savedMsg && (
          <div className="mx-6 mb-3 flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl px-4 py-2.5">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span className="text-sm text-emerald-700 dark:text-emerald-400 font-semibold">{savedMsg}</span>
          </div>
        )}
        <div className="flex gap-3 px-6 pb-6">
          <button onClick={handleSave} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-xl transition">
            {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
            حفظ التعديلات
          </button>
          <button onClick={onClose} className="flex-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-medium py-2.5 rounded-xl transition">
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}

function DoctorWorkModal({ patient, onClose }: { patient: Patient; onClose: () => void }) {
  const chart = patient.dentalChart ?? {};
  const workEntries = Object.entries(chart).filter(([, ts]: [string, ToothState]) =>
    ts.treatmentStatus !== 'none' || (ts.diagnosis && ts.diagnosis.trim()) || (ts.amount && ts.amount > 0)
  );

  const statusBadge = (ts: ToothState) => {
    const s = resolveVisualStatus(ts);
    if (s === 'done') return <span className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-2 py-0.5 rounded-full font-semibold">✅ تم العلاج</span>;
    if (s === 'inprogress') return <span className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded-full font-semibold">🟡 قيد العلاج</span>;
    if (s === 'treatment') return <span className="text-[10px] bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 rounded-full font-semibold">🔴 علاج مطلوب</span>;
    return <span className="text-[10px] bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400 px-2 py-0.5 rounded-full">سليم</span>;
  };

  const sessionInfo = (ts: ToothState) => {
    if (!ts.totalSessions || ts.totalSessions <= 1) return null;
    const done = ts.completedSessions ?? [];
    const notes = ts.sessionNotes ?? {};
    return (
      <div className="mt-1 space-y-0.5">
        <p className="text-[10px] text-slate-500 dark:text-slate-400">
          الجلسات: {done.length}/{ts.totalSessions} مكتملة
          {done.length > 0 && ` (${done.map((n) => `ج${n}`).join('، ')})`}
        </p>
        {Array.from({ length: ts.totalSessions }, (_, i) => i + 1)
          .filter((n) => notes[String(n)]?.trim())
          .map((n) => (
            <p key={n} className="text-[10px] text-slate-500 dark:text-slate-400">
              <span className="font-semibold">جلسة {n}: </span>{notes[String(n)]}
            </p>
          ))}
      </div>
    );
  };

  const totalAmount = workEntries.reduce((s, [, ts]) => s + (ts.amount ?? 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" dir="rtl">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-xl max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
          <div>
            <h2 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
              🦷 عمل الطبيب
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">{patient.fullName} — ملف #{patient.fileNumber}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-3">
          {workEntries.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-slate-400 gap-3">
              <span className="text-4xl">🦷</span>
              <p className="text-sm">لم يُسجّل الطبيب أي عمل بعد</p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {workEntries
                  .sort(([a], [b]) => Number(a) - Number(b))
                  .map(([toothId, ts]) => (
                    <div key={toothId} className="bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-blue-700 dark:text-blue-400">{toothId}</span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 truncate">{describeTooth(toothId)}</p>
                            <div className="mt-0.5">{statusBadge(ts)}</div>
                          </div>
                        </div>
                        {ts.amount > 0 && (
                          <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                            ₪{ts.amount.toLocaleString('ar')}
                          </span>
                        )}
                      </div>
                      {ts.diagnosis && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                          <span className="font-semibold text-slate-700 dark:text-slate-200">التشخيص: </span>
                          {ts.diagnosis}
                        </p>
                      )}
                      {sessionInfo(ts)}
                    </div>
                  ))}
              </div>

              {totalAmount > 0 && (
                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">إجمالي تكلفة العلاج</span>
                  <span className="text-lg font-bold text-emerald-700 dark:text-emerald-400">₪{totalAmount.toLocaleString('ar')}</span>
                </div>
              )}

              {patient.dentalRows && patient.dentalRows.length > 0 && (
                <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-100 dark:bg-slate-700">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">سجل العلاجات التفصيلي</p>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-700">
                    {patient.dentalRows.map((row) => (
                      <div key={row.id} className="flex items-center justify-between px-4 py-2.5 text-xs">
                        <div>
                          <span className="font-semibold text-slate-700 dark:text-slate-200">سن {row.toothNo}</span>
                          {row.diagnosis && <span className="text-slate-500 dark:text-slate-400 mr-2">— {row.diagnosis}</span>}
                        </div>
                        <div className="flex items-center gap-3 text-right shrink-0">
                          <span className="text-slate-500">{row.date}</span>
                          <span className="text-emerald-600 font-semibold">₪{Number(row.payment).toLocaleString('ar')}</span>
                          {Number(row.remainingAmount) > 0 && (
                            <span className="text-red-500">متبقي ₪{Number(row.remainingAmount).toLocaleString('ar')}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="px-5 pb-5">
          <button onClick={onClose} className="w-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-medium py-2.5 rounded-xl transition text-sm">
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}

function PatientRow({ patient, onEdit, onDelete, onViewWork }: {
  patient: Patient;
  onEdit: () => void;
  onDelete: () => void;
  onViewWork: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const totalPaid = patient.dentalRows.reduce((s, r) => s + Number(r.payment), 0);
  const totalRemaining = patient.dentalRows.reduce((s, r) => s + (Number(r.price) - Number(r.payment)), 0);
  const chart = patient.dentalChart ?? {};
  const activeTeeth = Object.entries(chart).filter(([, ts]) =>
    (ts.treatmentStatus && ts.treatmentStatus !== 'none') || (ts.diagnosis && ts.diagnosis.trim())
  );

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-9 h-9 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center shrink-0">
          <span className="text-blue-600 dark:text-blue-400 text-sm font-bold">{patient.fullName.charAt(0)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-slate-800 dark:text-white text-sm">{patient.fullName}</p>
            <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full">ملف #{patient.fileNumber}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${patient.gender === 'male' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-pink-50 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400'}`}>
              {patient.gender === 'male' ? 'ذكر' : 'أنثى'}
            </span>
            {activeTeeth.length > 0 && (
              <span className="text-[10px] bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 px-2 py-0.5 rounded-full">
                🦷 {activeTeeth.length} سن
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-400">
            <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{patient.phoneNumber}</span>
            {patient.nextAppointmentDate && (
              <span className="flex items-center gap-1 text-amber-500"><Calendar className="w-3 h-3" />{patient.nextAppointmentDate}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {totalRemaining > 0 && (
            <span className="text-xs text-red-500 font-medium hidden sm:block">₪{totalRemaining.toLocaleString('ar')}</span>
          )}
          <button onClick={onViewWork} title="عمل الطبيب"
            className="p-1.5 text-slate-400 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition">
            <Eye className="w-4 h-4" />
          </button>
          <button onClick={() => setExpanded((v) => !v)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button onClick={onEdit} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition" title="تعديل">
            <Edit2 className="w-4 h-4" />
          </button>
          <button onClick={onDelete} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition" title="حذف">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-0 border-t border-slate-100 dark:border-slate-700 mt-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 mb-3">
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">صفوف العلاج</p>
              <p className="font-bold text-slate-700 dark:text-slate-200">{patient.dentalRows.length}</p>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">المدفوع</p>
              <p className="font-bold text-emerald-600">₪{totalPaid.toLocaleString('ar')}</p>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">المتبقي</p>
              <p className="font-bold text-red-500">₪{totalRemaining.toLocaleString('ar')}</p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">الموعد</p>
              <p className="font-bold text-amber-600 text-xs">{patient.nextAppointmentDate || '—'}</p>
            </div>
          </div>

          {activeTeeth.length > 0 && (
            <div className="mb-2">
              <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1.5">🦷 تشخيص الأسنان:</p>
              <div className="space-y-1">
                {activeTeeth.slice(0, 4).map(([toothId, ts]) => {
                  const s = resolveVisualStatus(ts);
                  const sessionsDone = ts.completedSessions?.length ?? 0;
                  const totalSess = ts.totalSessions ?? 0;
                  return (
                    <div key={toothId} className="flex items-start gap-2 text-xs">
                      <span className="bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded font-bold shrink-0">
                        {describeTooth(toothId)}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded shrink-0 ${s === 'done' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : s === 'inprogress' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400' : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'}`}>
                        {s === 'done' ? '✅' : s === 'inprogress' ? '🟡' : '🔴'}
                      </span>
                      {ts.diagnosis && <span className="text-slate-600 dark:text-slate-400 truncate">{ts.diagnosis}</span>}
                      {totalSess > 1 && (
                        <span className="text-slate-400 shrink-0">({sessionsDone}/{totalSess} جلسات)</span>
                      )}
                      {ts.amount > 0 && (
                        <span className="text-emerald-600 font-semibold shrink-0 mr-auto">₪{ts.amount}</span>
                      )}
                    </div>
                  );
                })}
                {activeTeeth.length > 4 && (
                  <button onClick={onViewWork} className="text-xs text-blue-500 hover:underline">
                    +{activeTeeth.length - 4} أسنان أخرى — عرض الكل
                  </button>
                )}
              </div>
            </div>
          )}

          {patient.chronicDiseases && (
            <div className="text-xs text-slate-600 dark:text-slate-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-lg px-3 py-2 mb-2">
              <span className="font-semibold">⚠️ أمراض مزمنة:</span> {patient.chronicDiseases}
            </div>
          )}
          {patient.allergies && (
            <div className="text-xs text-slate-600 dark:text-slate-400 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-lg px-3 py-2">
              <span className="font-semibold">🚫 حساسية:</span> {patient.allergies}
            </div>
          )}
          {patient.lastEditedBy && (
            <p className="text-[10px] text-slate-400 mt-2">
              <UserCheck className="w-3 h-3 inline" /> آخر تعديل: {patient.lastEditedBy} — {patient.lastEditedAt ? new Date(patient.lastEditedAt).toLocaleString('ar-SA') : ''}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function SecretaryPage() {
  const { clinicId } = useAuth();
  const { patients, loading, error, refetch } = usePatients(clinicId);
  const [view, setView] = useState<View>('list');
  const [search, setSearch] = useState('');
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [workPatient, setWorkPatient] = useState<Patient | null>(null);

  const filtered = patients.filter(
    (p) =>
      p.fullName?.includes(search) ||
      String(p.fileNumber).includes(search) ||
      p.phoneNumber?.includes(search),
  );

  const handleDelete = useCallback(async (p: Patient) => {
    if (!confirm(`هل تريد حذف ملف ${p.fullName}؟`)) return;
    await deletePatient(p.id);
    await refetch();
  }, [refetch]);

  if (view === 'add') {
    return (
      <Layout>
        <div dir="rtl">
          <div className="flex items-center gap-3 mb-5">
            <button onClick={() => setView('list')} className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white text-sm transition">
              <X className="w-4 h-4" /> إلغاء
            </button>
            <h1 className="text-xl font-bold text-slate-800 dark:text-white">إضافة مريض جديد</h1>
          </div>
          <AddPatientForm onSuccess={() => { refetch(); setView('list'); }} />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-5" dir="rtl">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" /> قائمة المرضى
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">{patients.length} مريض مسجل</p>
          </div>
          <button onClick={() => setView('add')}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition">
            <Plus className="w-4 h-4" /> إضافة مريض
          </button>
        </div>

        <div className="relative">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو رقم الملف أو الجوال..."
            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pr-10 pl-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <Eye className="w-3.5 h-3.5 text-purple-500" />
          اضغط على أيقونة <span className="font-semibold text-purple-600">العين</span> لعرض عمل الطبيب على أسنان المريض
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl px-4 py-3 text-red-700 dark:text-red-400 text-sm">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-slate-400 gap-3">
            <Users className="w-10 h-10 opacity-30" />
            <p className="text-sm">{search ? 'لا توجد نتائج للبحث' : 'لا يوجد مرضى مسجلون بعد'}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((p) => (
              <PatientRow
                key={p.id}
                patient={p}
                onEdit={() => setEditingPatient(p)}
                onDelete={() => handleDelete(p)}
                onViewWork={() => setWorkPatient(p)}
              />
            ))}
          </div>
        )}
      </div>

      {editingPatient && (
        <EditPatientModal
          patient={editingPatient}
          onClose={() => setEditingPatient(null)}
          onSaved={() => { refetch(); setEditingPatient(null); }}
        />
      )}

      {workPatient && (
        <DoctorWorkModal
          patient={workPatient}
          onClose={() => setWorkPatient(null)}
        />
      )}
    </Layout>
  );
}
