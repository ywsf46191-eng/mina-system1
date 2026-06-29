import { useState, useEffect, useCallback } from 'react';
import { Layout } from '../components/shared/Layout';
import { useAuth } from '../contexts/AuthContext';
import { getPatients, getPayments, createPayment, deletePayment } from '../firebase/firestoreService';
import { describeTooth, resolveVisualStatus } from '../lib/teeth';
import { computePatientFinance } from '../lib/finance';
import type { Patient, Payment } from '../types';
import {
  CreditCard, Search, Plus, Trash2, X, CheckCircle,
  Banknote, Smartphone, Building2, ReceiptText, ChevronDown, ChevronUp,
} from 'lucide-react';

type PayMethod = 'cash' | 'bank_palestine' | 'jawwal' | 'palpal';

const METHOD_META: Record<PayMethod, { label: string; icon: string; color: string }> = {
  cash:          { label: 'كاش',          icon: '💵', color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' },
  bank_palestine:{ label: 'بنك فلسطين',   icon: '🏦', color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'           },
  jawwal:        { label: 'جوال بي',       icon: '📲', color: 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400'   },
  palpal:        { label: 'بال بي',        icon: '💳', color: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'       },
};

export default function SecretaryFinancePage() {
  const { clinicId } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [search, setSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expandedTeeth, setExpandedTeeth] = useState(false);

  const [payForm, setPayForm] = useState({
    amount: '',
    method: 'cash' as PayMethod,
    date: new Date().toISOString().split('T')[0],
    note: '',
  });
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [pts, pays] = await Promise.all([
        getPatients(clinicId),
        Promise.resolve(getPayments(clinicId)),
      ]);
      setPatients(pts);
      setPayments(pays);
      if (selectedPatient) {
        const updated = pts.find((p) => p.id === selectedPatient.id);
        if (updated) setSelectedPatient(updated);
      }
    } finally {
      setLoading(false);
    }
  }, [clinicId, selectedPatient?.id]);

  useEffect(() => { loadData(); }, [clinicId]);

  const patientPayments = payments.filter((p) => p.patientId === selectedPatient?.id);
  const finance = selectedPatient
    ? computePatientFinance(selectedPatient, payments)
    : { totalDue: 0, totalPaid: 0, remaining: 0 };
  const { totalDue, totalPaid } = finance;
  const remaining = Math.max(0, finance.remaining);

  const teethWithAmount = Object.entries(selectedPatient?.dentalChart ?? {}).filter(([, t]) => (t.amount ?? 0) > 0);

  const filteredPatients = patients.filter(
    (p) => p.fullName?.includes(search) || String(p.fileNumber).includes(search) || p.phoneNumber?.includes(search)
  );

  const handleSelectPatient = (p: Patient) => {
    setSelectedPatient(p);
    setSearch(p.fullName);
    setShowDropdown(false);
    setShowAddPayment(false);
    setPayForm({ amount: '', method: 'cash', date: new Date().toISOString().split('T')[0], note: '' });
  };

  const handleAddPayment = async () => {
    if (!selectedPatient || !payForm.amount) return;
    setSaving(true);
    const payClinicId = clinicId || selectedPatient.clinicId || '';
    const payment: Payment = {
      id: '',
      clinicId: payClinicId,
      patientId: selectedPatient.id,
      patientName: selectedPatient.fullName,
      amount: Number(payForm.amount),
      date: payForm.date,
      method: payForm.method,
      note: payForm.note,
    };
    createPayment({ ...payment });
    const updated = getPayments(payClinicId);
    setPayments(updated);
    setSaving(false);
    setSavedMsg('تم تسجيل الدفعة ✓');
    setTimeout(() => setSavedMsg(''), 3000);
    setShowAddPayment(false);
    setPayForm({ amount: '', method: 'cash', date: new Date().toISOString().split('T')[0], note: '' });
  };

  const handleDeletePayment = (id: string) => {
    const payClinicId = clinicId || selectedPatient?.clinicId || '';
    deletePayment(id, payClinicId);
    setPayments(getPayments(payClinicId));
  };

  return (
    <Layout>
      <div className="space-y-5" dir="rtl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-white">المالية</h1>
            <p className="text-xs text-slate-400 mt-0.5">تسجيل دفعات المرضى ومتابعة الأرصدة</p>
          </div>
        </div>

        {/* Patient search */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 space-y-4">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">اختر ملف مريض</p>
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setShowDropdown(true); setSelectedPatient(null); }}
              onFocus={() => setShowDropdown(true)}
              placeholder="ابحث بالاسم أو رقم الملف أو الجوال..."
              className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl pr-10 pl-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {showDropdown && search && (
              <div className="absolute z-20 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg max-h-52 overflow-y-auto">
                {loading ? (
                  <p className="px-4 py-3 text-sm text-slate-400">جارٍ التحميل...</p>
                ) : filteredPatients.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-slate-400">لا توجد نتائج</p>
                ) : filteredPatients.slice(0, 8).map((p) => {
                  const { totalDue: due, totalPaid: paid } = computePatientFinance(p, payments);
                  return (
                    <button
                      key={p.id}
                      onClick={() => handleSelectPatient(p)}
                      className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 text-right transition"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{p.fullName}</p>
                        <p className="text-xs text-slate-400">ملف #{p.fileNumber} — {p.phoneNumber}</p>
                      </div>
                      {due > 0 && (
                        <div className="text-left shrink-0">
                          <p className="text-xs text-red-500">مطلوب: ₪{due.toLocaleString('ar')}</p>
                          {paid > 0 && <p className="text-xs text-emerald-600">مدفوع: ₪{paid.toLocaleString('ar')}</p>}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {!selectedPatient && loading && (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-[3px] border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!selectedPatient && !loading && (
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                ملفات المرضى ({filteredPatients.length})
              </p>
              {filteredPatients.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-slate-400 gap-2">
                  <ReceiptText className="w-10 h-10 opacity-30" />
                  <p className="text-sm">لا توجد ملفات مطابقة</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[420px] overflow-y-auto pr-1">
                  {filteredPatients.map((p) => {
                    const { totalDue: due, remaining } = computePatientFinance(p, payments);
                    const rem = Math.max(0, remaining);
                    return (
                      <button
                        key={p.id}
                        onClick={() => handleSelectPatient(p)}
                        className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-emerald-400 hover:bg-emerald-50/40 dark:hover:bg-emerald-900/10 text-right transition"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center shrink-0">
                            <span className="text-emerald-600 dark:text-emerald-400 text-sm font-bold">{p.fullName?.charAt(0)}</span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{p.fullName}</p>
                            <p className="text-xs text-slate-400 truncate">ملف #{p.fileNumber} — {p.phoneNumber}</p>
                          </div>
                        </div>
                        <div className="text-left shrink-0">
                          {due > 0 ? (
                            <span className={`text-xs font-semibold ${rem > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                              {rem > 0 ? `متبقي ₪${rem.toLocaleString('ar')}` : 'مسدد ✓'}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-300">—</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {selectedPatient && (
          <>
            {/* Summary bar */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-800 dark:text-white">{selectedPatient.fullName}</p>
                  <p className="text-xs text-slate-400">ملف #{selectedPatient.fileNumber} — {selectedPatient.phoneNumber}</p>
                </div>
                <button onClick={() => { setSelectedPatient(null); setSearch(''); }}
                  className="text-slate-400 hover:text-slate-600 transition p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-3 divide-x divide-x-reverse divide-slate-100 dark:divide-slate-700">
                <div className="p-4 text-center">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-1">إجمالي التكلفة</p>
                  <p className="text-xl font-bold text-slate-800 dark:text-white">₪{totalDue.toLocaleString('ar')}</p>
                </div>
                <div className="p-4 text-center">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-1">المدفوع</p>
                  <p className="text-xl font-bold text-emerald-600">₪{totalPaid.toLocaleString('ar')}</p>
                </div>
                <div className="p-4 text-center">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-1">المتبقي</p>
                  <p className={`text-xl font-bold ${remaining > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                    ₪{remaining.toLocaleString('ar')}
                  </p>
                </div>
              </div>

              {remaining === 0 && totalDue > 0 && (
                <div className="px-5 pb-4">
                  <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl px-4 py-2.5">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm text-emerald-700 dark:text-emerald-400 font-semibold">تم سداد المبلغ كاملاً ✓</span>
                  </div>
                </div>
              )}
            </div>

            {/* Tooth treatment details */}
            {teethWithAmount.length > 0 && (
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
                <button
                  onClick={() => setExpandedTeeth((v) => !v)}
                  className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                >
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    🦷 تفاصيل علاجات الأسنان ({teethWithAmount.length} سن)
                  </span>
                  {expandedTeeth ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>
                {expandedTeeth && (
                  <div className="border-t border-slate-100 dark:border-slate-700 divide-y divide-slate-50 dark:divide-slate-700">
                    {teethWithAmount.map(([toothId, ts]) => {
                      const s = resolveVisualStatus(ts);
                      const sessTotal = (ts as { totalSessions?: number }).totalSessions ?? 0;
                      const sessDone = (ts as { completedSessions?: string[] }).completedSessions?.length ?? 0;
                      return (
                        <div key={toothId} className="flex items-center justify-between px-5 py-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center shrink-0">
                              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{toothId}</span>
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{describeTooth(toothId)}</p>
                              {(ts as { diagnosis?: string }).diagnosis && (
                                <p className="text-xs text-slate-500 dark:text-slate-400">{(ts as { diagnosis?: string }).diagnosis}</p>
                              )}
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${s === 'done' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : s === 'inprogress' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400' : s === 'treatment' ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400' : 'bg-slate-100 text-slate-600'}`}>
                                  {s === 'done' ? '✅ مكتمل' : s === 'inprogress' ? '🟡 قيد العلاج' : s === 'treatment' ? '🔴 جارٍ' : '⚪ سليم'}
                                </span>
                                {sessTotal > 1 && (
                                  <span className="text-[10px] text-slate-400">{sessDone}/{sessTotal} جلسات</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-200 shrink-0">₪{(ts as { amount: number }).amount.toLocaleString('ar')}</span>
                        </div>
                      );
                    })}
                    <div className="flex items-center justify-between px-5 py-3 bg-slate-50 dark:bg-slate-700/50">
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-200">الإجمالي</span>
                      <span className="text-base font-black text-slate-800 dark:text-white">₪{totalDue.toLocaleString('ar')}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Payments log */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
                <p className="font-semibold text-slate-700 dark:text-slate-200 text-sm">سجل الدفعات</p>
                <button
                  onClick={() => setShowAddPayment((v) => !v)}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-2 rounded-xl transition"
                >
                  <Plus className="w-3.5 h-3.5" /> تسجيل دفعة
                </button>
              </div>

              {showAddPayment && (
                <div className="p-5 border-b border-slate-100 dark:border-slate-700 space-y-4 bg-slate-50 dark:bg-slate-700/40">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">دفعة جديدة</p>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">المبلغ (₪) *</label>
                      <input
                        type="number" min={0} step={0.01}
                        value={payForm.amount}
                        onChange={(e) => setPayForm((f) => ({ ...f, amount: e.target.value }))}
                        placeholder="0.00" dir="ltr"
                        className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">تاريخ الدفع</label>
                      <input
                        type="date" value={payForm.date}
                        onChange={(e) => setPayForm((f) => ({ ...f, date: e.target.value }))}
                        className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Payment method buttons */}
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-2">طريقة الدفع *</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {(Object.entries(METHOD_META) as [PayMethod, typeof METHOD_META[PayMethod]][]).map(([key, meta]) => (
                        <button
                          key={key} type="button"
                          onClick={() => setPayForm((f) => ({ ...f, method: key }))}
                          className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-xs font-semibold transition-all ${
                            payForm.method === key
                              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 shadow-sm'
                              : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:border-emerald-300'
                          }`}
                        >
                          <span className="text-xl">{meta.icon}</span>
                          <span>{meta.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">ملاحظة</label>
                    <input
                      type="text" value={payForm.note}
                      onChange={(e) => setPayForm((f) => ({ ...f, note: e.target.value }))}
                      placeholder="اختياري..."
                      className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleAddPayment}
                      disabled={saving || !payForm.amount}
                      className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition"
                    >
                      {saving
                        ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        : <CheckCircle className="w-4 h-4" />}
                      تسجيل الدفعة
                    </button>
                    <button
                      onClick={() => setShowAddPayment(false)}
                      className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 text-sm transition"
                    >
                      إلغاء
                    </button>
                  </div>
                  {savedMsg && (
                    <p className="text-sm text-emerald-600 font-semibold flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4" /> {savedMsg}
                    </p>
                  )}
                </div>
              )}

              {patientPayments.length === 0 && !showAddPayment ? (
                <div className="flex flex-col items-center py-8 text-slate-400 gap-2">
                  <ReceiptText className="w-8 h-8 opacity-30" />
                  <p className="text-sm">لا توجد دفعات مسجلة لهذا المريض</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50 dark:divide-slate-700">
                  {patientPayments
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .map((pay) => {
                      const method = (pay as Payment & { method?: PayMethod }).method ?? 'cash';
                      const meta = METHOD_META[method] ?? METHOD_META.cash;
                      return (
                        <div key={pay.id} className="flex items-center justify-between px-5 py-3">
                          <div className="flex items-center gap-3">
                            <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${meta.color}`}>
                              {meta.icon} {meta.label}
                            </span>
                            <div>
                              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">₪{pay.amount.toLocaleString('ar')}</p>
                              {pay.note && <p className="text-xs text-slate-400">{pay.note}</p>}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-slate-400">{pay.date}</span>
                            <button onClick={() => handleDeletePayment(pay.id)}
                              className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
