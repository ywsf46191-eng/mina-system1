import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  getSalaries, createSalary, deleteSalary,
  getBills, createBill, deleteBill,
} from '../../firebase/firestoreService';
import type { Salary, Bill, BillType, BillStatus } from '../../types';
import { Banknote, Receipt, Plus, Trash2, X, TrendingDown, TrendingUp } from 'lucide-react';

const BILL_TYPE_LABELS: Record<BillType, string> = {
  electricity: '⚡ كهرباء',
  water: '💧 ماء',
  rent: '🏠 إيجار',
  other: '📄 أخرى',
};

const STATUS_STYLES: Record<BillStatus, string> = {
  paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  partial: 'bg-amber-50 text-amber-700 border-amber-200',
  unpaid: 'bg-red-50 text-red-700 border-red-200',
};
const STATUS_LABELS: Record<BillStatus, string> = {
  paid: '✓ مدفوع',
  partial: '◑ جزئي',
  unpaid: '✗ غير مدفوع',
};

function formatDate(iso: string) {
  try { return new Date(iso).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return iso; }
}

type ActiveView = 'salaries' | 'bills' | 'summary';

export default function AccountingTab() {
  const { clinicId } = useAuth();
  const [view, setView] = useState<ActiveView>('summary');
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);

  // Salary form
  const [showSalaryForm, setShowSalaryForm] = useState(false);
  const [salaryForm, setSalaryForm] = useState({ employeeName: '', monthlySalary: '', paidAmount: '', paymentDate: '', notes: '' });
  const [savingSalary, setSavingSalary] = useState(false);

  // Bill form
  const [showBillForm, setShowBillForm] = useState(false);
  const [billForm, setBillForm] = useState({ billType: 'electricity' as BillType, customTypeName: '', period: '', totalAmount: '', paidAmount: '', paymentStatus: 'unpaid' as BillStatus, notes: '' });
  const [savingBill, setSavingBill] = useState(false);

  const fetchData = useCallback(async () => {
    if (!clinicId) { setLoading(false); return; }
    setLoading(true);
    try {
      const [s, b] = await Promise.all([getSalaries(clinicId), getBills(clinicId)]);
      setSalaries(s);
      setBills(b);
    } finally {
      setLoading(false);
    }
  }, [clinicId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSalarySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinicId) return;
    setSavingSalary(true);
    try {
      await createSalary({
        clinicId,
        employeeName: salaryForm.employeeName,
        monthlySalary: Number(salaryForm.monthlySalary),
        paidAmount: Number(salaryForm.paidAmount),
        paymentDate: salaryForm.paymentDate,
        notes: salaryForm.notes,
        createdAt: new Date().toISOString(),
      });
      setSalaryForm({ employeeName: '', monthlySalary: '', paidAmount: '', paymentDate: '', notes: '' });
      setShowSalaryForm(false);
      await fetchData();
    } finally {
      setSavingSalary(false);
    }
  };

  const handleBillSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinicId) return;
    setSavingBill(true);
    const total = Number(billForm.totalAmount);
    const paid = Number(billForm.paidAmount);
    try {
      await createBill({
        clinicId,
        billType: billForm.billType,
        customTypeName: billForm.customTypeName,
        period: billForm.period,
        totalAmount: total,
        paidAmount: paid,
        dueAmount: total - paid,
        paymentStatus: billForm.paymentStatus,
        notes: billForm.notes,
        createdAt: new Date().toISOString(),
      });
      setBillForm({ billType: 'electricity', customTypeName: '', period: '', totalAmount: '', paidAmount: '', paymentStatus: 'unpaid', notes: '' });
      setShowBillForm(false);
      await fetchData();
    } finally {
      setSavingBill(false);
    }
  };

  const totalSalaries = salaries.reduce((s, x) => s + x.monthlySalary, 0);
  const paidSalaries = salaries.reduce((s, x) => s + x.paidAmount, 0);
  const totalBills = bills.reduce((s, x) => s + x.totalAmount, 0);
  const paidBills = bills.reduce((s, x) => s + x.paidAmount, 0);
  const unpaidBills = bills.reduce((s, x) => s + x.dueAmount, 0);

  const input = 'w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="space-y-5" dir="rtl">
      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {([['summary', '📊 الملخص'], ['salaries', '💼 الرواتب'], ['bills', '🧾 الفواتير']] as const).map(([k, label]) => (
          <button key={k} onClick={() => setView(k)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${view === k ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}`}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <>
          {/* Summary */}
          {view === 'summary' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 sm:col-span-1 col-span-2">
                  <div className="flex items-center gap-2 mb-2"><TrendingDown className="w-4 h-4 text-red-500" /><p className="text-xs text-slate-500">إجمالي المصاريف</p></div>
                  <p className="text-2xl font-black text-red-600">₪ {(totalSalaries + totalBills).toLocaleString('ar')}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2"><Banknote className="w-4 h-4 text-blue-500" /><p className="text-xs text-slate-500">الرواتب</p></div>
                  <p className="text-xl font-black text-slate-800 dark:text-white">₪ {totalSalaries.toLocaleString('ar')}</p>
                  <p className="text-xs text-slate-400 mt-1">مدفوع: ₪{paidSalaries.toLocaleString('ar')}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2"><Receipt className="w-4 h-4 text-purple-500" /><p className="text-xs text-slate-500">الفواتير التشغيلية</p></div>
                  <p className="text-xl font-black text-slate-800 dark:text-white">₪ {totalBills.toLocaleString('ar')}</p>
                  <p className="text-xs text-red-400 mt-1">متبقي: ₪{unpaidBills.toLocaleString('ar')}</p>
                </div>
              </div>

              {/* Quick recent */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                    <Banknote className="w-4 h-4 text-blue-500" /><h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">آخر الرواتب</h3>
                  </div>
                  {salaries.slice(0, 5).map(s => (
                    <div key={s.id} className="flex items-center justify-between px-4 py-2.5 border-b border-slate-50 dark:border-slate-700 last:border-0">
                      <div>
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{s.employeeName}</p>
                        <p className="text-[10px] text-slate-400">{formatDate(s.paymentDate)}</p>
                      </div>
                      <p className="text-xs font-bold text-blue-600">₪{s.paidAmount.toLocaleString('ar')}</p>
                    </div>
                  ))}
                  {salaries.length === 0 && <p className="text-center py-6 text-xs text-slate-400">لا توجد رواتب مسجلة</p>}
                </div>
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                    <Receipt className="w-4 h-4 text-purple-500" /><h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">آخر الفواتير</h3>
                  </div>
                  {bills.slice(0, 5).map(b => (
                    <div key={b.id} className="flex items-center justify-between px-4 py-2.5 border-b border-slate-50 dark:border-slate-700 last:border-0">
                      <div>
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{BILL_TYPE_LABELS[b.billType]} {b.period && `(${b.period})`}</p>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${STATUS_STYLES[b.paymentStatus]}`}>{STATUS_LABELS[b.paymentStatus]}</span>
                      </div>
                      <p className="text-xs font-bold text-red-600">₪{b.totalAmount.toLocaleString('ar')}</p>
                    </div>
                  ))}
                  {bills.length === 0 && <p className="text-center py-6 text-xs text-slate-400">لا توجد فواتير مسجلة</p>}
                </div>
              </div>
            </div>
          )}

          {/* Salaries */}
          {view === 'salaries' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">إجمالي الرواتب: <span className="font-bold text-slate-800 dark:text-white">₪{totalSalaries.toLocaleString('ar')}</span></p>
                <button onClick={() => setShowSalaryForm(v => !v)}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-xl transition">
                  <Plus className="w-3.5 h-3.5" /> إضافة راتب
                </button>
              </div>
              {showSalaryForm && (
                <div className="bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">تسجيل راتب</h4>
                    <button onClick={() => setShowSalaryForm(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
                  </div>
                  <form onSubmit={handleSalarySubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div><label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">اسم الموظف *</label>
                      <input required type="text" value={salaryForm.employeeName} onChange={e => setSalaryForm(f => ({ ...f, employeeName: e.target.value }))} className={input} /></div>
                    <div><label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">الراتب الشهري (₪)</label>
                      <input type="number" min="0" value={salaryForm.monthlySalary} onChange={e => setSalaryForm(f => ({ ...f, monthlySalary: e.target.value }))} className={input} dir="ltr" /></div>
                    <div><label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">المبلغ المدفوع (₪)</label>
                      <input type="number" min="0" value={salaryForm.paidAmount} onChange={e => setSalaryForm(f => ({ ...f, paidAmount: e.target.value }))} className={input} dir="ltr" /></div>
                    <div><label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">تاريخ الدفع</label>
                      <input type="date" value={salaryForm.paymentDate} onChange={e => setSalaryForm(f => ({ ...f, paymentDate: e.target.value }))} className={input} dir="ltr" /></div>
                    <div className="sm:col-span-2"><label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">ملاحظات</label>
                      <input type="text" value={salaryForm.notes} onChange={e => setSalaryForm(f => ({ ...f, notes: e.target.value }))} className={input} /></div>
                    <div className="sm:col-span-2 flex gap-2">
                      <button type="submit" disabled={savingSalary} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-medium px-4 py-2.5 rounded-xl transition">
                        {savingSalary ? <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> جارٍ الحفظ...</> : 'حفظ'}
                      </button>
                      <button type="button" onClick={() => setShowSalaryForm(false)} className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs transition">إلغاء</button>
                    </div>
                  </form>
                </div>
              )}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                {salaries.length === 0 ? (
                  <div className="flex flex-col items-center py-12 gap-3 text-slate-400"><Banknote className="w-10 h-10 opacity-30" /><p className="text-sm">لا توجد رواتب مسجلة</p></div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                      <tr>{['الموظف', 'الراتب الشهري', 'المدفوع', 'تاريخ الدفع', 'ملاحظات', ''].map(h => <th key={h} className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-300">{h}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {salaries.map(s => (
                        <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition">
                          <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{s.employeeName}</td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-400">₪{s.monthlySalary.toLocaleString('ar')}</td>
                          <td className="px-4 py-3"><span className="text-emerald-600 font-semibold">₪{s.paidAmount.toLocaleString('ar')}</span></td>
                          <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(s.paymentDate)}</td>
                          <td className="px-4 py-3 text-slate-400 text-xs">{s.notes || '—'}</td>
                          <td className="px-4 py-3"><button onClick={() => { if (confirm('حذف؟')) deleteSalary(s.id).then(fetchData); }} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"><Trash2 className="w-3.5 h-3.5" /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* Bills */}
          {view === 'bills' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">متبقي: <span className="font-bold text-red-600">₪{unpaidBills.toLocaleString('ar')}</span> | مدفوع: <span className="font-bold text-emerald-600">₪{paidBills.toLocaleString('ar')}</span></p>
                <button onClick={() => setShowBillForm(v => !v)}
                  className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold px-3 py-2 rounded-xl transition">
                  <Plus className="w-3.5 h-3.5" /> إضافة فاتورة
                </button>
              </div>
              {showBillForm && (
                <div className="bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">تسجيل فاتورة</h4>
                    <button onClick={() => setShowBillForm(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
                  </div>
                  <form onSubmit={handleBillSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div><label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">نوع الفاتورة</label>
                      <select value={billForm.billType} onChange={e => setBillForm(f => ({ ...f, billType: e.target.value as BillType }))} className={input}>
                        {(Object.entries(BILL_TYPE_LABELS) as [BillType, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select></div>
                    <div><label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">الفترة (مثال: يناير 2025)</label>
                      <input type="text" value={billForm.period} onChange={e => setBillForm(f => ({ ...f, period: e.target.value }))} placeholder="الشهر / السنة" className={input} /></div>
                    <div><label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">المبلغ الكلي (₪)</label>
                      <input type="number" min="0" step="0.01" value={billForm.totalAmount} onChange={e => setBillForm(f => ({ ...f, totalAmount: e.target.value }))} className={input} dir="ltr" /></div>
                    <div><label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">المبلغ المدفوع (₪)</label>
                      <input type="number" min="0" step="0.01" value={billForm.paidAmount} onChange={e => setBillForm(f => ({ ...f, paidAmount: e.target.value }))} className={input} dir="ltr" /></div>
                    <div><label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">حالة الدفع</label>
                      <select value={billForm.paymentStatus} onChange={e => setBillForm(f => ({ ...f, paymentStatus: e.target.value as BillStatus }))} className={input}>
                        {(Object.entries(STATUS_LABELS) as [BillStatus, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select></div>
                    <div><label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">ملاحظات</label>
                      <input type="text" value={billForm.notes} onChange={e => setBillForm(f => ({ ...f, notes: e.target.value }))} className={input} /></div>
                    <div className="sm:col-span-2 flex gap-2">
                      <button type="submit" disabled={savingBill} className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white text-xs font-medium px-4 py-2.5 rounded-xl transition">
                        {savingBill ? <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> جارٍ الحفظ...</> : 'حفظ'}
                      </button>
                      <button type="button" onClick={() => setShowBillForm(false)} className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs transition">إلغاء</button>
                    </div>
                  </form>
                </div>
              )}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                {bills.length === 0 ? (
                  <div className="flex flex-col items-center py-12 gap-3 text-slate-400"><Receipt className="w-10 h-10 opacity-30" /><p className="text-sm">لا توجد فواتير مسجلة</p></div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                      <tr>{['النوع', 'الفترة', 'الإجمالي', 'المدفوع', 'المتبقي', 'الحالة', ''].map(h => <th key={h} className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-300">{h}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {bills.map(b => (
                        <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition">
                          <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{BILL_TYPE_LABELS[b.billType]}</td>
                          <td className="px-4 py-3 text-slate-500 text-xs">{b.period || '—'}</td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-400">₪{b.totalAmount.toLocaleString('ar')}</td>
                          <td className="px-4 py-3 text-emerald-600 font-semibold">₪{b.paidAmount.toLocaleString('ar')}</td>
                          <td className="px-4 py-3 text-red-500">₪{b.dueAmount.toLocaleString('ar')}</td>
                          <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_STYLES[b.paymentStatus]}`}>{STATUS_LABELS[b.paymentStatus]}</span></td>
                          <td className="px-4 py-3"><button onClick={() => { if (confirm('حذف؟')) deleteBill(b.id).then(fetchData); }} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"><Trash2 className="w-3.5 h-3.5" /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* summary total */}
      {view === 'summary' && (
        <div className="bg-slate-800 dark:bg-slate-900 rounded-2xl p-4 flex items-center gap-3">
          <TrendingUp className="w-5 h-5 text-blue-400" />
          <div>
            <p className="text-xs text-slate-400">إجمالي المصاريف المسجلة</p>
            <p className="text-xl font-black text-white">₪ {(totalSalaries + totalBills).toLocaleString('ar')}</p>
          </div>
        </div>
      )}
    </div>
  );
}
