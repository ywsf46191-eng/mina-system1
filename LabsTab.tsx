import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getLabs, createLab, deleteLab, getLabTransfers, updateLabTransfer } from '../../firebase/firestoreService';
import type { Lab, LabTransfer, LabTransferStatus } from '../../types';
import { shortToothLabel } from '../../lib/teeth';
import {
  FlaskConical, Plus, Trash2, X, FileText, ArrowRight, Banknote, ClipboardList, Phone,
} from 'lucide-react';

const STATUS_LABELS: Record<LabTransferStatus, string> = {
  sent: '📤 تم الإرسال',
  in_progress: '⚙️ قيد التنفيذ',
  received: '📥 تم الاستلام',
  completed: '✅ مكتمل',
};
const STATUS_COLORS: Record<LabTransferStatus, string> = {
  sent: 'bg-blue-50 text-blue-700 border-blue-200',
  in_progress: 'bg-amber-50 text-amber-700 border-amber-200',
  received: 'bg-purple-50 text-purple-700 border-purple-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export default function LabsTab() {
  const { clinicId } = useAuth();
  const [labs, setLabs] = useState<Lab[]>([]);
  const [transfers, setTransfers] = useState<LabTransfer[]>([]);
  const [selectedLabId, setSelectedLabId] = useState<string | null>(null);
  const [selectedTransfer, setSelectedTransfer] = useState<LabTransfer | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', notes: '' });

  const reload = useCallback(() => {
    if (!clinicId) return;
    setLabs(getLabs(clinicId));
    setTransfers(getLabTransfers(clinicId));
  }, [clinicId]);

  useEffect(() => { reload(); }, [reload]);

  const handleAddLab = () => {
    if (!clinicId || !form.name.trim()) return;
    createLab({ clinicId, name: form.name.trim(), phone: form.phone, notes: form.notes });
    setForm({ name: '', phone: '', notes: '' });
    setShowForm(false);
    reload();
  };

  const handleDeleteLab = (id: string) => {
    if (!clinicId) return;
    if (!confirm('هل تريد حذف هذا المعمل؟ (تبقى السجلات السابقة محفوظة)')) return;
    deleteLab(id, clinicId);
    if (selectedLabId === id) setSelectedLabId(null);
    reload();
  };

  const handleStatusChange = (transfer: LabTransfer, status: LabTransferStatus) => {
    if (!clinicId) return;
    updateLabTransfer(transfer.id, clinicId, { status });
    reload();
    setSelectedTransfer((t) => (t && t.id === transfer.id ? { ...t, status } : t));
  };

  const labTransfers = (labId: string) => transfers.filter((t) => t.labId === labId);
  const labTotalAmount = (labId: string) => labTransfers(labId).reduce((s, t) => s + Number(t.amount), 0);
  const totalAmount = transfers.reduce((s, t) => s + Number(t.amount), 0);

  const input = 'w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500';

  /* ── Tooth detail view for a single transfer ── */
  if (selectedTransfer) {
    const t = selectedTransfer;
    return (
      <div className="space-y-4" dir="rtl">
        <button onClick={() => setSelectedTransfer(null)} className="flex items-center gap-1.5 text-sm text-purple-600 hover:underline">
          <ArrowRight className="w-4 h-4" /> رجوع لقائمة المعمل
        </button>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white">{t.patientSnapshot.fullName}</h3>
              <p className="text-xs text-slate-400">ملف رقم #{t.patientSnapshot.fileNumber} · {t.patientSnapshot.phoneNumber}</p>
            </div>
            <span className={`text-xs px-3 py-1 rounded-full border font-semibold ${STATUS_COLORS[t.status]}`}>{STATUS_LABELS[t.status]}</span>
          </div>

          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-3 text-center">
                <p className="text-xs text-slate-500">السن المحوّل</p>
                <p className="text-lg font-black text-purple-700 dark:text-purple-400">{t.toothId} <span className="text-xs font-normal">({shortToothLabel(t.toothId)})</span></p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center">
                <p className="text-xs text-slate-500">الجلسات</p>
                <p className="text-lg font-black text-blue-700 dark:text-blue-400">{t.completedSessions.length}/{t.totalSessions}</p>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 text-center">
                <p className="text-xs text-slate-500">المبلغ المحوّل</p>
                <p className="text-lg font-black text-emerald-700 dark:text-emerald-400">₪ {t.amount.toLocaleString('ar')}</p>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">التشخيص</p>
              <p className="text-sm text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-700/50 rounded-xl px-3 py-2.5">{t.diagnosis || '—'}</p>
            </div>

            {t.notes && (
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-1">ملاحظات للمعمل</p>
                <p className="text-sm text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-700/50 rounded-xl px-3 py-2.5">{t.notes}</p>
              </div>
            )}

            {(t.patientSnapshot.chronicDiseases || t.patientSnapshot.allergies) && (
              <div className="grid grid-cols-2 gap-3">
                {t.patientSnapshot.chronicDiseases && (
                  <div><p className="text-xs font-semibold text-slate-500 mb-1">أمراض مزمنة</p><p className="text-xs text-slate-600 dark:text-slate-300">{t.patientSnapshot.chronicDiseases}</p></div>
                )}
                {t.patientSnapshot.allergies && (
                  <div><p className="text-xs font-semibold text-slate-500 mb-1">حساسية</p><p className="text-xs text-slate-600 dark:text-slate-300">{t.patientSnapshot.allergies}</p></div>
                )}
              </div>
            )}

            <div>
              <p className="text-xs font-semibold text-slate-500 mb-2">تحديث حالة العمل بالمعمل</p>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(STATUS_LABELS) as LabTransferStatus[]).map((s) => (
                  <button key={s} onClick={() => handleStatusChange(t, s)}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition font-medium ${t.status === s ? 'bg-purple-600 text-white border-purple-700' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-purple-400'}`}>
                    {STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-[10px] text-slate-400">تم التحويل بواسطة {t.createdBy} بتاريخ {new Date(t.createdAt).toLocaleString('ar-EG')}</p>
          </div>
        </div>
      </div>
    );
  }

  /* ── Single lab view: its transferred patient files ── */
  if (selectedLabId) {
    const lab = labs.find((l) => l.id === selectedLabId);
    const list = labTransfers(selectedLabId);
    return (
      <div className="space-y-4" dir="rtl">
        <button onClick={() => setSelectedLabId(null)} className="flex items-center gap-1.5 text-sm text-purple-600 hover:underline">
          <ArrowRight className="w-4 h-4" /> رجوع لقائمة المعامل
        </button>

        <div className="flex items-center justify-between bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center"><FlaskConical className="w-5 h-5 text-purple-600" /></div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white">{lab?.name}</h3>
              {lab?.phone && <p className="text-xs text-slate-400 flex items-center gap-1"><Phone className="w-3 h-3" /> {lab.phone}</p>}
            </div>
          </div>
          <div className="text-left">
            <p className="text-xs text-slate-400">إجمالي المبالغ المحوّلة</p>
            <p className="text-lg font-black text-emerald-600">₪ {labTotalAmount(selectedLabId).toLocaleString('ar')}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
          {list.length === 0 ? (
            <div className="flex flex-col items-center py-12 gap-3 text-slate-400">
              <FileText className="w-10 h-10 opacity-30" /><p className="text-sm">لا توجد ملفات محوّلة لهذا المعمل بعد</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {list.map((t) => (
                <button key={t.id} onClick={() => setSelectedTransfer(t)} className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition text-right">
                  <div>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t.patientSnapshot.fullName} <span className="text-xs text-slate-400 font-normal">— ملف #{t.patientSnapshot.fileNumber}</span></p>
                    <p className="text-xs text-slate-400 mt-0.5">السن {t.toothId} ({shortToothLabel(t.toothId)}) · {new Date(t.createdAt).toLocaleDateString('ar-EG')}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${STATUS_COLORS[t.status]}`}>{STATUS_LABELS[t.status]}</span>
                    <span className="text-sm font-bold text-emerald-600">₪{t.amount.toLocaleString('ar')}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ── Labs overview list ── */
  return (
    <div className="space-y-5" dir="rtl">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2"><FlaskConical className="w-4 h-4 text-purple-500" /><p className="text-xs text-slate-500">عدد المعامل</p></div>
          <p className="text-2xl font-black text-slate-800 dark:text-white">{labs.length}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2"><ClipboardList className="w-4 h-4 text-blue-500" /><p className="text-xs text-slate-500">إجمالي الملفات المحوّلة</p></div>
          <p className="text-2xl font-black text-slate-800 dark:text-white">{transfers.length}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 col-span-2 sm:col-span-1">
          <div className="flex items-center gap-2 mb-2"><Banknote className="w-4 h-4 text-emerald-500" /><p className="text-xs text-slate-500">إجمالي المبالغ المحوّلة للمعامل</p></div>
          <p className="text-2xl font-black text-emerald-600">₪ {totalAmount.toLocaleString('ar')}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">قائمة المعامل</h3>
        <button onClick={() => setShowForm((v) => !v)} className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold px-3 py-2 rounded-xl transition">
          <Plus className="w-3.5 h-3.5" /> إضافة معمل
        </button>
      </div>

      {showForm && (
        <div className="bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">معمل جديد</h4>
            <button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-slate-400" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">اسم المعمل *</label>
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="مثال: معمل النور للأسنان" className={input} /></div>
            <div><label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">رقم الهاتف</label>
              <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} dir="ltr" className={input} /></div>
            <div className="sm:col-span-2"><label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">ملاحظات</label>
              <input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className={input} /></div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAddLab} className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium px-4 py-2.5 rounded-xl transition">حفظ</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs transition">إلغاء</button>
          </div>
        </div>
      )}

      {labs.length === 0 ? (
        <div className="flex flex-col items-center py-14 gap-3 text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl">
          <FlaskConical className="w-10 h-10 opacity-30" /><p className="text-sm">لا توجد معامل مسجّلة — أضف أول معمل لتتمكن من تحويل علاجات الأسنان إليه</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {labs.map((lab) => (
            <div key={lab.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 flex items-center justify-between hover:shadow-sm transition">
              <button onClick={() => setSelectedLabId(lab.id)} className="flex items-center gap-3 text-right flex-1 min-w-0">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center shrink-0"><FlaskConical className="w-5 h-5 text-purple-600" /></div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{lab.name}</p>
                  <p className="text-xs text-slate-400">{labTransfers(lab.id).length} ملف محوّل · ₪{labTotalAmount(lab.id).toLocaleString('ar')}</p>
                </div>
              </button>
              <button onClick={() => handleDeleteLab(lab.id)} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition shrink-0">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
