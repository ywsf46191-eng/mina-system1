import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getPatients, getPayments, getWarehouseItems, getSalaries, getBills } from '../../firebase/firestoreService';
import type { Patient, Payment, WarehouseItem } from '../../types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts';
import { Users, TrendingUp, Package, Banknote, Activity } from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

function formatDate(iso: string) {
  try { return new Date(iso).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' }); }
  catch { return iso; }
}

function formatMonth(iso: string) {
  try { return new Date(iso).toLocaleDateString('ar-SA', { month: 'short', year: '2-digit' }); }
  catch { return iso; }
}

export default function StatisticsTab() {
  const { clinicId } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [warehouse, setWarehouse] = useState<WarehouseItem[]>([]);
  const [expenses, setExpenses] = useState({ salaries: 0, bills: 0 });
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!clinicId) return;
    setLoading(true);
    try {
      const [p, pay, w, sal, bil] = await Promise.all([
        getPatients(clinicId),
        getPayments(clinicId),
        getWarehouseItems(clinicId),
        getSalaries(clinicId),
        getBills(clinicId),
      ]);
      setPatients(p);
      setPayments(pay);
      setWarehouse(w);
      setExpenses({
        salaries: sal.reduce((s, x) => s + x.paidAmount, 0),
        bills: bil.reduce((s, x) => s + x.paidAmount, 0),
      });
    } finally {
      setLoading(false);
    }
  }, [clinicId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Computed data ──────────────────────────────────────────────────────────

  const totalRevenue = payments.reduce((s, p) => s + p.amount, 0);
  const totalExpenses = expenses.salaries + expenses.bills;
  const netProfit = totalRevenue - totalExpenses;
  const maleCount = patients.filter(p => p.gender === 'male').length;
  const femaleCount = patients.filter(p => p.gender === 'female').length;
  const totalDue = patients.reduce((s, p) => s + p.dentalRows.reduce((r, row) => r + Number(row.price), 0), 0);
  const totalPaid = patients.reduce((s, p) => s + p.dentalRows.reduce((r, row) => r + Number(row.payment), 0), 0);
  const lowStockCount = warehouse.filter(i => i.quantity <= i.alertThreshold).length;

  // Monthly revenue chart
  const monthlyRevMap: Record<string, number> = {};
  payments.forEach(p => {
    const m = formatMonth(p.createdAt);
    monthlyRevMap[m] = (monthlyRevMap[m] ?? 0) + p.amount;
  });
  const monthlyRevData = Object.entries(monthlyRevMap).slice(-6).map(([month, amount]) => ({ month, amount }));

  // Patient registration trend (last 30 days)
  const last30 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });
  const dailyPatients = last30.map(date => ({
    date: formatDate(date),
    count: patients.filter(p => p.createdAt.startsWith(date)).length,
  }));

  // Payment method breakdown
  const methodMap: Record<string, number> = {};
  payments.forEach(p => {
    const labels: Record<string, string> = { cash: 'كاش', bank: 'بنك', paybefore: 'PayBefore', jowal_pay: 'جوال باي' };
    const label = labels[p.method] ?? p.method;
    methodMap[label] = (methodMap[label] ?? 0) + p.amount;
  });
  const paymentMethodData = Object.entries(methodMap).map(([name, value]) => ({ name, value }));

  // Gender pie
  const genderData = [
    { name: 'ذكر', value: maleCount },
    { name: 'أنثى', value: femaleCount },
  ].filter(d => d.value > 0);

  // Warehouse by type
  const warehouseTypeMap: Record<string, number> = {};
  warehouse.forEach(i => {
    const labels: Record<string, string> = { medical: 'مستلزمات', medicine: 'أدوية', other: 'أخرى' };
    const label = labels[i.itemType] ?? i.itemType;
    warehouseTypeMap[label] = (warehouseTypeMap[label] ?? 0) + 1;
  });
  const warehouseTypeData = Object.entries(warehouseTypeMap).map(([name, value]) => ({ name, value }));

  // Recent activity
  const recentActivity = [
    ...patients.slice(0, 5).map(p => ({ type: 'patient', name: p.fullName, date: p.createdAt, label: 'مريض جديد' })),
    ...payments.slice(0, 5).map(p => ({ type: 'payment', name: p.patientName, date: p.createdAt, label: `دفعة ₪${p.amount}` })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8);

  const stat = 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4';

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className={stat}>
          <div className="flex items-center gap-2 mb-2"><Users className="w-4 h-4 text-blue-500" /><p className="text-xs text-slate-500">إجمالي المرضى</p></div>
          <p className="text-3xl font-black text-blue-600">{patients.length}</p>
          <p className="text-[10px] text-slate-400 mt-1">♂ {maleCount} | ♀ {femaleCount}</p>
        </div>
        <div className={stat}>
          <div className="flex items-center gap-2 mb-2"><TrendingUp className="w-4 h-4 text-emerald-500" /><p className="text-xs text-slate-500">الإيرادات</p></div>
          <p className="text-2xl font-black text-emerald-600">₪{totalRevenue.toLocaleString('ar')}</p>
          <p className="text-[10px] text-slate-400 mt-1">{payments.length} دفعة</p>
        </div>
        <div className={`${stat} ${netProfit >= 0 ? '' : 'border-red-200 dark:border-red-700'}`}>
          <div className="flex items-center gap-2 mb-2"><Banknote className="w-4 h-4 text-purple-500" /><p className="text-xs text-slate-500">صافي الربح</p></div>
          <p className={`text-2xl font-black ${netProfit >= 0 ? 'text-purple-600' : 'text-red-600'}`}>₪{netProfit.toLocaleString('ar')}</p>
          <p className="text-[10px] text-slate-400 mt-1">مصاريف: ₪{totalExpenses.toLocaleString('ar')}</p>
        </div>
        <div className={`${stat} ${lowStockCount > 0 ? 'border-red-200 dark:border-red-700' : ''}`}>
          <div className="flex items-center gap-2 mb-2"><Package className="w-4 h-4 text-amber-500" /><p className="text-xs text-slate-500">المخزون</p></div>
          <p className="text-3xl font-black text-amber-600">{warehouse.length}</p>
          {lowStockCount > 0 && <p className="text-[10px] text-red-500 mt-1">⚠ {lowStockCount} صنف ناقص</p>}
        </div>
      </div>

      {/* Financial overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={stat}>
          <p className="text-xs text-slate-500 mb-1">إجمالي المطلوب (سجلات علاج)</p>
          <p className="text-xl font-black text-slate-800 dark:text-white">₪{totalDue.toLocaleString('ar')}</p>
        </div>
        <div className={stat}>
          <p className="text-xs text-slate-500 mb-1">إجمالي المحصّل</p>
          <p className="text-xl font-black text-emerald-600">₪{totalPaid.toLocaleString('ar')}</p>
        </div>
        <div className={stat}>
          <p className="text-xs text-slate-500 mb-1">المبلغ المتبقي</p>
          <p className="text-xl font-black text-red-500">₪{(totalDue - totalPaid).toLocaleString('ar')}</p>
        </div>
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className={stat}>
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">الإيرادات الشهرية (₪)</h3>
          {monthlyRevData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyRevData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => `₪${v.toLocaleString('ar')}`} />
                <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} name="الإيراد" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-slate-400 text-sm">لا توجد بيانات كافية</div>
          )}
        </div>

        <div className={stat}>
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">المرضى الجدد (آخر 7 أيام)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={dailyPatients}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} name="مريض جديد" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Payment method pie */}
        <div className={stat}>
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">طرق الدفع</h3>
          {paymentMethodData.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={paymentMethodData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                  {paymentMethodData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => `₪${v.toLocaleString('ar')}`} />
                <Legend iconType="circle" iconSize={8} />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="flex items-center justify-center h-40 text-slate-400 text-xs">لا توجد مدفوعات</div>}
        </div>

        {/* Gender pie */}
        <div className={stat}>
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">توزيع المرضى</h3>
          {genderData.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={genderData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                  {genderData.map((_, i) => <Cell key={i} fill={i === 0 ? '#3b82f6' : '#ec4899'} />)}
                </Pie>
                <Tooltip />
                <Legend iconType="circle" iconSize={8} />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="flex items-center justify-center h-40 text-slate-400 text-xs">لا توجد بيانات</div>}
        </div>

        {/* Warehouse type */}
        <div className={stat}>
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">المخزون حسب النوع</h3>
          {warehouseTypeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={warehouseTypeData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                  {warehouseTypeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend iconType="circle" iconSize={8} />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="flex items-center justify-center h-40 text-slate-400 text-xs">لا توجد بيانات مخزون</div>}
        </div>
      </div>

      {/* Recent activity */}
      <div className={stat}>
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4 text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">النشاط الأخير</h3>
        </div>
        {recentActivity.length === 0 ? (
          <p className="text-center py-4 text-slate-400 text-sm">لا يوجد نشاط مسجل بعد</p>
        ) : (
          <div className="space-y-2">
            {recentActivity.map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700 last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs shrink-0 ${item.type === 'patient' ? 'bg-blue-500' : 'bg-emerald-500'}`}>
                    {item.type === 'patient' ? '👤' : '₪'}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-200">{item.name}</p>
                    <p className="text-[10px] text-slate-400">{item.label}</p>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400">{formatDate(item.date)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
