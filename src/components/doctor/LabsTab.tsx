import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getLabs, addLab, deleteLab, getLabTransfers, addLabTransfer, updateLabTransfer } from '../../firebase/firestoreService';
import { FlaskConical, Plus, Trash2, Eye, EyeOff, AlertCircle } from 'lucide-react';
import type { Lab, LabTransfer } from '../../types';

interface SuccessInfo { name: string; }

export default function LabsTab() {
  const { clinicId, userProfile } = useAuth();
  const [labs, setLabs] = useState<Lab[]>([]);
  const [transfers, setTransfers] = useState<LabTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [successInfo, setSuccessInfo] = useState<SuccessInfo | null>(null);
  const [form, setForm] = useState({ name: '', address: '', phone: '', email: '', specializations: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedLab, setSelectedLab] = useState<Lab | null>(null);
  const [showTransfersModal, setShowTransfersModal] = useState(false);

  const fetchData = useCallback(async () => {
    if (!clinicId) return;
    setLoading(true);
    try {
      setLabs(getLabs(clinicId));
      setTransfers(getLabTransfers(clinicId));
    } finally {
      setLoading(false);
    }
  }, [clinicId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (form.name.trim().length < 2) e.name = 'اسم المعمل مطلوب';
    if (form.phone && !/^[0-9+\s-]*$/.test(form.phone)) e.phone = 'رقم هاتف غير صالح';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !clinicId) return;
    addLab({
      clinicId,
      name: form.name,
      address: form.address || undefined,
      phone: form.phone || undefined,
      email: form.email || undefined,
      specializations: form.specializations ? form.specializations.split(',').map(s => s.trim()) : [],
    });
    setSuccessInfo({ name: form.name });
    setForm({ name: '', address: '', phone: '', email: '', specializations: '' });
    setShowForm(false);
    await fetchData();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`حذف المعمل ${name}؟`)) return;
    if (!clinicId) return;
    deleteLab(id, clinicId);
    await fetchData();
  };

  const labTransfers = selectedLab ? transfers.filter(t => t.labId === selectedLab.id) : [];

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-blue-600" />
          <h3 className="font-semibold text-slate-700 dark:text-slate-200 text-sm">المعامل ({labs.length})</h3>
        </div>
        <button onClick={() => { setShowForm(!showForm); setErrors({}); }}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-xl transition">
          <Plus className="w-3.5 h-3.5" /> إضافة معمل
        </button>
      </div>

      {successInfo && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-2xl p-4">
          <p className="text-xs text-emerald-700 dark:text-emerald-400">✅ تم إضافة المعمل <strong>{successInfo.name}</strong></p>
        </div>
      )}

      {showForm && (
        <div className="bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-2xl p-4 space-y-3">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">إضافة معمل جديد</h4>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">اسم المعمل *</label>
              <input type="text" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="اسم المعمل"
                className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">العنوان</label>
              <input type="text" value={form.address} onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))} placeholder="العنوان"
                className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">رقم الهاتف</label>
              <input type="tel" value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="رقم الهاتف"
                className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">البريد الإلكتروني</label>
              <input type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} placeholder="البريد الإلكتروني"
                className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">التخصصات (مفصولة بفواصل)</label>
              <input type="text" value={form.specializations} onChange={(e) => setForm(f => ({ ...f, specializations: e.target.value }))} placeholder="أشعات، تحليلات، ..."
                className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-4 py-2.5 rounded-xl transition">إضافة</button>
              <button type="button" onClick={() => { setShowForm(false); setErrors({}); }} className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs transition">إلغاء</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-6"><div className="w-6 h-6 border-[3px] border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : labs.length === 0 ? (
        <div className="flex flex-col items-center py-8 gap-2 text-slate-400 bg-slate-50 dark:bg-slate-700/30 rounded-2xl border border-slate-200 dark:border-slate-600">
          <FlaskConical className="w-8 h-8 opacity-30" />
          <p className="text-xs">لا توجد معامل مضافة بعد</p>
        </div>
      ) : (
        <div className="space-y-2">
          {labs.map((lab) => {
            const labCount = transfers.filter(t => t.labId === lab.id).length;
            return (
              <div key={lab.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{lab.name}</p>
                  {lab.address && <p className="text-xs text-slate-400 truncate">{lab.address}</p>}
                  {lab.specializations && lab.specializations.length > 0 && <p className="text-xs text-blue-500 mt-0.5">{lab.specializations.join(' • ')}</p>}
                  <p className="text-xs text-slate-500 mt-1">📋 {labCount} تحويل</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { setSelectedLab(lab); setShowTransfersModal(true); }} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition" title="عرض التحويلات">
                    <Eye className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(lab.id, lab.name)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition" title="حذف">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showTransfersModal && selectedLab && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800">
              <h3 className="font-bold text-slate-800 dark:text-white text-sm">تحويلات {selectedLab.name}</h3>
              <button onClick={() => setShowTransfersModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="p-4 space-y-2">
              {labTransfers.length === 0 ? (
                <p className="text-center text-slate-400 py-8 text-sm">لا توجد تحويلات لهذا المعمل</p>
              ) : (
                labTransfers.map(t => (
                  <div key={t.id} className="bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg p-3">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t.patientName} - السن {t.toothNumber}</p>
                    <p className="text-xs text-slate-500 mt-1">{t.diagnosis}</p>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-slate-400">{new Date(t.transferDate).toLocaleDateString('ar-EG')}</p>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        t.status === 'completed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                        t.status === 'in_progress' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                        t.status === 'pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                        'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>{t.status === 'pending' ? 'قيد الانتظار' : t.status === 'in_progress' ? 'قيد التنفيذ' : t.status === 'completed' ? 'مكتمل' : 'مرفوض'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
