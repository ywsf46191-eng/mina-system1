import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  getLabs, addLab, deleteLab,
  getLabTransfers, addLabTransfer, updateLabTransfer, deleteLabTransfer,
  getPatients,
} from '../../firebase/firestoreService';
import { FlaskConical, Plus, Trash2, Eye, AlertCircle, CheckCircle2, X } from 'lucide-react';
import type { Lab, LabTransfer, Patient } from '../../types';

/**
 * LabsTab - إدارة المعامل وعمليات الإحالة (Transfers)
 * - يعرض قائمة المعامل المسجلة
 * - يتيح إنشاء معمل جديد
 * - يتيح إنشاء تحويل (إرسال عينة) إلى معمل محدد
 * - يتيح تعديل حالة التحويل (in_progress, completed, rejected)
 */

export default function LabsTab() {
  const { clinicId } = useAuth();
  const [labs, setLabs] = useState<Lab[]>([]);
  const [transfers, setTransfers] = useState<LabTransfer[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  // form state لإضافة معمل
  const [showLabForm, setShowLabForm] = useState(false);
  const [labForm, setLabForm] = useState({ name: '', address: '', phone: '', email: '', specializations: '' });
  const [labErrors, setLabErrors] = useState<Record<string, string>>({});

  // transfers modal و form
  const [selectedLab, setSelectedLab] = useState<Lab | null>(null);
  const [showTransfersModal, setShowTransfersModal] = useState(false);
  const [transferForm, setTransferForm] = useState({
    patientId: '',
    toothNumber: '',
    diagnosis: '',
    transferDate: new Date().toISOString().split('T')[0],
    expectedReturnDate: '',
    notes: '',
  });
  const [transferErrors, setTransferErrors] = useState<Record<string, string>>({});

  const fetchData = useCallback(async () => {
    if (!clinicId) { setLoading(false); return; }
    setLoading(true);
    try {
      // getLabs / getLabTransfers currently return synchronous arrays, but awaiting is safe
      const labsList = await getLabs(clinicId);
      const transfersList = await getLabTransfers(clinicId);
      const patientsList = await getPatients(clinicId);
      setLabs(labsList);
      setTransfers(transfersList);
      setPatients(patientsList);
    } catch (err) {
      console.error('Failed to load labs data', err);
    } finally {
      setLoading(false);
    }
  }, [clinicId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // --- Lab form validation & submit ---
  const validateLab = () => {
    const e: Record<string, string> = {};
    if (!labForm.name || labForm.name.trim().length < 2) e.name = 'اسم المعمل مطلوب';
    if (labForm.phone && !/^[0-9+\s-]+$/.test(labForm.phone)) e.phone = 'رقم هاتف غير صالح';
    setLabErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleAddLab = async (ev?: React.FormEvent) => {
    ev?.preventDefault();
    if (!clinicId) return;
    if (!validateLab()) return;
    try {
      await addLab({
        clinicId,
        name: labForm.name.trim(),
        address: labForm.address.trim() || undefined,
        phone: labForm.phone.trim() || undefined,
        email: labForm.email.trim() || undefined,
        specializations: labForm.specializations ? labForm.specializations.split(',').map(s => s.trim()).filter(Boolean) : [],
      });
      setShowLabForm(false);
      setLabForm({ name: '', address: '', phone: '', email: '', specializations: '' });
      await fetchData();
    } catch (err) {
      console.error('addLab error', err);
      alert('حدث خطأ أثناء إضافة المعمل');
    }
  };

  const handleDeleteLab = async (id: string, name: string) => {
    if (!confirm(`هل تريد حذف المعمل "${name}"؟`)) return;
    if (!clinicId) return;
    try {
      await deleteLab(id, clinicId);
      await fetchData();
    } catch (err) {
      console.error('deleteLab error', err);
      alert('فشل حذف المعمل');
    }
  };

  // --- Transfers ---
  const openTransfersFor = (lab: Lab) => {
    setSelectedLab(lab);
    setShowTransfersModal(true);
    setTransferForm({
      patientId: '',
      toothNumber: '',
      diagnosis: '',
      transferDate: new Date().toISOString().split('T')[0],
      expectedReturnDate: '',
      notes: '',
    });
    setTransferErrors({});
  };

  const validateTransfer = () => {
    const e: Record<string, string> = {};
    if (!transferForm.patientId) e.patientId = 'الرجاء اختيار مريض';
    if (!transferForm.diagnosis || transferForm.diagnosis.trim().length < 2) e.diagnosis = 'أدخل تشخيصاً موجزاً';
    setTransferErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleAddTransfer = async (ev?: React.FormEvent) => {
    ev?.preventDefault();
    if (!clinicId || !selectedLab) return;
    if (!validateTransfer()) return;
    try {
      await addLabTransfer({
        clinicId,
        patientId: transferForm.patientId,
        patientName: (patients.find(p => p.id === transferForm.patientId)?.fullName) ?? '',
        labId: selectedLab.id,
        labName: selectedLab.name,
        toothNumber: transferForm.toothNumber,
        diagnosis: transferForm.diagnosis,
        transferDate: transferForm.transferDate,
        expectedReturnDate: transferForm.expectedReturnDate || undefined,
        status: 'pending',
        notes: transferForm.notes || undefined,
        createdBy: '', // optional: fill with current user id if available
      });
      await fetchData();
      // keep modal open to show new transfer, or close:
      // setShowTransfersModal(false);
    } catch (err) {
      console.error('addLabTransfer error', err);
      alert('فشل إنشاء تحويل المعمل');
    }
  };

  const handleUpdateTransferStatus = async (t: LabTransfer, status: LabTransfer['status']) => {
    if (!clinicId) return;
    try {
      await updateLabTransfer(t.id, clinicId, { status });
      await fetchData();
    } catch (err) {
      console.error('updateLabTransfer error', err);
      alert('فشل تحديث حالة التحويل');
    }
  };

  const handleDeleteTransfer = async (id: string) => {
    if (!clinicId) return;
    if (!confirm('حذف التحويل؟')) return;
    try {
      await deleteLabTransfer(id, clinicId);
      await fetchData();
    } catch (err) {
      console.error('deleteLabTransfer error', err);
      alert('فشل حذف التحويل');
    }
  };

  // helper لإظهار حالة بنص عربي
  const statusLabel = (s: LabTransfer['status']) => ({
    pending: 'قيد الانتظار',
    in_progress: 'قيد التنفيذ',
    completed: 'مكتمل',
    rejected: 'مرفوض',
  }[s] ?? s);

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-blue-600" />
          <h3 className="font-semibold text-slate-700 dark:text-slate-200 text-sm">المعامل ({labs.length})</h3>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowLabForm((v) => !v)}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-xl transition"
          >
            <Plus className="w-3.5 h-3.5" /> إضافة معمل
          </button>
        </div>
      </div>

      {showLabForm && (
        <form onSubmit={handleAddLab} className="bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-2xl p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">اسم المعمل</label>
              <input value={labForm.name} onChange={(e) => setLabForm(f => ({ ...f, name: e.target.value }))} className="w-full border rounded-xl px-3 py-2 text-sm" />
              {labErrors.name && <p className="text-red-500 text-xs mt-1">{labErrors.name}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">الهاتف</label>
              <input value={labForm.phone} onChange={(e) => setLabForm(f => ({ ...f, phone: e.target.value }))} className="w-full border rounded-xl px-3 py-2 text-sm" />
              {labErrors.phone && <p className="text-red-500 text-xs mt-1">{labErrors.phone}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">البريد الإلكتروني</label>
              <input value={labForm.email} onChange={(e) => setLabForm(f => ({ ...f, email: e.target.value }))} className="w-full border rounded-xl px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">التخصصات (مفصولة بفواصل)</label>
              <input value={labForm.specializations} onChange={(e) => setLabForm(f => ({ ...f, specializations: e.target.value }))} className="w-full border rounded-xl px-3 py-2 text-sm" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">العنوان</label>
              <input value={labForm.address} onChange={(e) => setLabForm(f => ({ ...f, address: e.target.value }))} className="w-full border rounded-xl px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm">حفظ المعمل</button>
            <button type="button" onClick={() => setShowLabForm(false)} className="bg-slate-200 px-4 py-2 rounded-xl text-sm">إلغاء</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : labs.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 text-center text-slate-400 text-sm">لا توجد معامل مضافة بعد</div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {labs.map((lab) => (
            <div key={lab.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-800 dark:text-white">{lab.name}</p>
                {lab.specializations && <p className="text-xs text-slate-400 mt-1">تخصصات: {lab.specializations.join(', ')}</p>}
                {lab.address && <p className="text-xs text-slate-400 mt-1">العنوان: {lab.address}</p>}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => openTransfersFor(lab)} className="px-3 py-2 bg-blue-600 text-white rounded-xl text-xs flex items-center gap-2">
                  <Eye className="w-4 h-4" /> تحويل عينة
                </button>
                <button onClick={() => handleDeleteLab(lab.id, lab.name)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Transfers modal */}
      {showTransfersModal && selectedLab && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" dir="rtl">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div>
                <h3 className="font-bold text-slate-800 dark:text-white text-lg">تحويلات المعمل — {selectedLab.name}</h3>
                <p className="text-xs text-slate-500">إدارة التحويلات وإرسال العينات</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowTransfersModal(false)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* Transfer form */}
              <form onSubmit={handleAddTransfer} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">المريض</label>
                  <select value={transferForm.patientId} onChange={(e) => setTransferForm(f => ({ ...f, patientId: e.target.value }))} className="w-full border rounded-xl px-3 py-2 text-sm">
                    <option value="">اختر مريضاً</option>
                    {patients.map(p => <option key={p.id} value={p.id}>{p.fullName} — #{p.fileNumber}</option>)}
                  </select>
                  {transferErrors.patientId && <p className="text-red-500 text-xs mt-1">{transferErrors.patientId}</p>}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">رقم السن / العينة</label>
                  <input value={transferForm.toothNumber} onChange={(e) => setTransferForm(f => ({ ...f, toothNumber: e.target.value }))} className="w-full border rounded-xl px-3 py-2 text-sm" />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">تاريخ التحويل</label>
                  <input type="date" value={transferForm.transferDate} onChange={(e) => setTransferForm(f => ({ ...f, transferDate: e.target.value }))} className="w-full border rounded-xl px-3 py-2 text-sm" />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">التشخيص / سبب الإحالة</label>
                  <input value={transferForm.diagnosis} onChange={(e) => setTransferForm(f => ({ ...f, diagnosis: e.target.value }))} className="w-full border rounded-xl px-3 py-2 text-sm" />
                  {transferErrors.diagnosis && <p className="text-red-500 text-xs mt-1">{transferErrors.diagnosis}</p>}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">الموعد المتوقع للعودة</label>
                  <input type="date" value={transferForm.expectedReturnDate} onChange={(e) => setTransferForm(f => ({ ...f, expectedReturnDate: e.target.value }))} className="w-full border rounded-xl px-3 py-2 text-sm" />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-xs font-medium text-slate-600 mb-1">ملاحظات إضافية</label>
                  <input value={transferForm.notes} onChange={(e) => setTransferForm(f => ({ ...f, notes: e.target.value }))} className="w-full border rounded-xl px-3 py-2 text-sm" />
                </div>

                <div className="sm:col-span-3 flex gap-2 justify-end">
                  <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm">إنشاء تحويل</button>
                  <button type="button" onClick={() => { setShowTransfersModal(false); setSelectedLab(null); }} className="bg-slate-200 px-4 py-2 rounded-xl text-sm">إغلاق</button>
                </div>
              </form>

              {/* Transfers list */}
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-2">قائمة التحويلات</h4>
                <div className="space-y-2">
                  {transfers.filter(t => t.labId === selectedLab.id).length === 0 && (
                    <div className="p-4 bg-slate-50 rounded-xl text-sm text-slate-400">لا توجد تحويلات بعد</div>
                  )}
                  {transfers.filter(t => t.labId === selectedLab.id).map((t) => (
                    <div key={t.id} className="flex items-center justify-between gap-3 p-3 border rounded-xl">
                      <div>
                        <div className="text-sm font-semibold text-slate-800">{t.patientName} {t.toothNumber ? `— ${t.toothNumber}` : ''}</div>
                        <div className="text-xs text-slate-500">{t.diagnosis}</div>
                        <div className="text-[11px] text-slate-400 mt-1">تحويل: {t.transferDate} • متوقع رجوع: {t.expectedReturnDate || '—'}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-1 rounded-xl bg-slate-100 text-slate-600">{statusLabel(t.status)}</span>
                        {t.status === 'pending' && (
                          <button onClick={() => handleUpdateTransferStatus(t, 'in_progress')} className="text-xs bg-amber-500 text-white px-3 py-1 rounded-xl">ابدأ</button>
                        )}
                        {t.status === 'in_progress' && (
                          <button onClick={() => handleUpdateTransferStatus(t, 'completed')} className="text-xs bg-emerald-500 text-white px-3 py-1 rounded-xl">تم</button>
                        )}
                        {t.status !== 'rejected' && (
                          <button onClick={() => handleUpdateTransferStatus(t, 'rejected')} className="text-xs bg-red-500 text-white px-3 py-1 rounded-xl">رفض</button>
                        )}
                        <button onClick={() => handleDeleteTransfer(t.id)} className="p-1 text-red-500"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
