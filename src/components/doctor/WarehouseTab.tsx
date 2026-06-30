import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  getWarehouseItems, createWarehouseItem, updateWarehouseItem, deleteWarehouseItem,
} from '../../firebase/firestoreService';
import type { WarehouseItem, WarehouseItemType } from '../../types';
import {
  Package, Plus, Trash2, AlertTriangle, CheckCircle, Edit2, X, Save,
} from 'lucide-react';

const TYPE_LABELS: Record<WarehouseItemType, string> = {
  medical: '🔧 مستلزم طبي',
  medicine: '💊 دواء',
  other: '📦 أخرى',
};

const TYPE_COLORS: Record<WarehouseItemType, string> = {
  medical: 'bg-blue-50 text-blue-700 border-blue-200',
  medicine: 'bg-purple-50 text-purple-700 border-purple-200',
  other: 'bg-slate-50 text-slate-700 border-slate-200',
};

const EMPTY: Omit<WarehouseItem, 'id' | 'createdAt'> = {
  clinicId: '',
  itemType: 'medical',
  customTypeName: '',
  name: '',
  quantity: 0,
  alertThreshold: 5,
  costPrice: 0,
  supplierName: '',
  supplierPhone: '',
  fullyPaid: false,
  remainingAmount: 0,
  notes: '',
};

export default function WarehouseTab() {
  const { clinicId } = useAuth();
  const [items, setItems] = useState<WarehouseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<WarehouseItem, 'id' | 'createdAt'>>({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [filterType, setFilterType] = useState<WarehouseItemType | 'all'>('all');

  const fetchItems = useCallback(async () => {
    if (!clinicId) { setLoading(false); return; }
    setLoading(true);
    try {
      setItems(await getWarehouseItems(clinicId));
    } finally {
      setLoading(false);
    }
  }, [clinicId]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const resetForm = () => {
    setForm({ ...EMPTY, clinicId: clinicId ?? '' });
    setEditingId(null);
    setShowForm(false);
  };

  const openEdit = (item: WarehouseItem) => {
    setForm({
      clinicId: item.clinicId,
      itemType: item.itemType,
      customTypeName: item.customTypeName ?? '',
      name: item.name,
      quantity: item.quantity,
      alertThreshold: item.alertThreshold,
      costPrice: item.costPrice,
      supplierName: item.supplierName,
      supplierPhone: item.supplierPhone,
      fullyPaid: item.fullyPaid,
      remainingAmount: item.remainingAmount,
      notes: item.notes ?? '',
    });
    setEditingId(item.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinicId) return;
    setSaving(true);
    try {
      const payload = { ...form, clinicId };
      if (editingId) {
        await updateWarehouseItem(editingId, payload);
      } else {
        await createWarehouseItem({ ...payload, createdAt: new Date().toISOString() });
      }
      await fetchItems();
      resetForm();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`حذف "${name}"؟`)) return;
    await deleteWarehouseItem(id);
    await fetchItems();
  };

  const filtered = filterType === 'all' ? items : items.filter(i => i.itemType === filterType);
  const lowStock = items.filter(i => i.quantity <= i.alertThreshold).length;
  const totalValue = items.reduce((s, i) => s + i.costPrice * i.quantity, 0);
  const unpaidTotal = items.filter(i => !i.fullyPaid).reduce((s, i) => s + i.remainingAmount, 0);

  return (
    <div className="space-y-5" dir="rtl">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">إجمالي الأصناف</p>
          <p className="text-2xl font-black text-slate-800 dark:text-white">{items.length}</p>
        </div>
        <div className={`border rounded-2xl p-4 ${lowStock > 0 ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">نقص المخزون</p>
          <p className={`text-2xl font-black ${lowStock > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{lowStock}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">قيمة المخزون</p>
          <p className="text-xl font-black text-blue-600">₪ {totalValue.toLocaleString('ar')}</p>
        </div>
        <div className={`border rounded-2xl p-4 ${unpaidTotal > 0 ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">مستحقات الموردين</p>
          <p className={`text-xl font-black ${unpaidTotal > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>₪ {unpaidTotal.toLocaleString('ar')}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-2">
          {(['all', 'medical', 'medicine', 'other'] as const).map(t => (
            <button key={t} onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${filterType === t ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}`}>
              {t === 'all' ? '🗂️ الكل' : TYPE_LABELS[t]}
            </button>
          ))}
        </div>
        <button onClick={() => { setShowForm(true); setEditingId(null); setForm({ ...EMPTY, clinicId: clinicId ?? '' }); }}
          className="mr-auto flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-xl transition">
          <Plus className="w-3.5 h-3.5" /> إضافة صنف
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-700 dark:text-slate-200 text-sm">
              {editingId ? 'تعديل الصنف' : 'إضافة صنف جديد'}
            </h3>
            <button onClick={resetForm} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Type */}
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">النوع</label>
              <select value={form.itemType} onChange={e => setForm(f => ({ ...f, itemType: e.target.value as WarehouseItemType }))}
                className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {(Object.entries(TYPE_LABELS) as [WarehouseItemType, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            {/* Name */}
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">اسم الصنف *</label>
              <input required type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="اسم المادة أو الدواء"
                className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            {/* Quantity */}
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">الكمية</label>
              <input type="number" min="0" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: Number(e.target.value) }))}
                className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" dir="ltr" />
            </div>
            {/* Alert threshold */}
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">حد التنبيه (نقص المخزون)</label>
              <input type="number" min="0" value={form.alertThreshold} onChange={e => setForm(f => ({ ...f, alertThreshold: Number(e.target.value) }))}
                className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" dir="ltr" />
            </div>
            {/* Cost */}
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">سعر التكلفة (₪)</label>
              <input type="number" min="0" step="0.01" value={form.costPrice} onChange={e => setForm(f => ({ ...f, costPrice: Number(e.target.value) }))}
                className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" dir="ltr" />
            </div>
            {/* Supplier name */}
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">اسم المورد</label>
              <input type="text" value={form.supplierName} onChange={e => setForm(f => ({ ...f, supplierName: e.target.value }))} placeholder="اسم المورد أو الشركة"
                className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            {/* Supplier phone */}
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">جوال المورد</label>
              <input type="tel" value={form.supplierPhone} onChange={e => setForm(f => ({ ...f, supplierPhone: e.target.value }))} placeholder="05xxxxxxxx"
                className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" dir="ltr" />
            </div>
            {/* Payment */}
            <div className="sm:col-span-2 flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.fullyPaid} onChange={e => setForm(f => ({ ...f, fullyPaid: e.target.checked, remainingAmount: e.target.checked ? 0 : f.remainingAmount }))}
                  className="w-4 h-4 rounded accent-emerald-600" />
                <span className="text-sm text-slate-600 dark:text-slate-300">مدفوع بالكامل</span>
              </label>
              {!form.fullyPaid && (
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">المبلغ المتبقي (₪)</label>
                  <input type="number" min="0" step="0.01" value={form.remainingAmount} onChange={e => setForm(f => ({ ...f, remainingAmount: Number(e.target.value) }))}
                    className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" dir="ltr" />
                </div>
              )}
            </div>
            {/* Notes */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">ملاحظات</label>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="أي ملاحظات إضافية..."
                className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>
            <div className="sm:col-span-2 flex gap-2">
              <button type="submit" disabled={saving}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium px-4 py-2.5 rounded-xl transition text-xs">
                {saving ? <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> جارٍ الحفظ...</> : <><Save className="w-3.5 h-3.5" /> {editingId ? 'تحديث' : 'إضافة'}</>}
              </button>
              <button type="button" onClick={resetForm} className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs transition hover:bg-slate-300">إلغاء</button>
            </div>
          </form>
        </div>
      )}

      {/* Items list */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16 gap-3 text-slate-400 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
          <Package className="w-12 h-12 opacity-30" />
          <p className="text-sm">لا توجد مواد في المخزن بعد</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
              <tr>
                {['النوع', 'الاسم', 'الكمية', 'سعر التكلفة', 'المورد', 'حالة الدفع', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-300">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filtered.map(item => (
                <tr key={item.id} className={`hover:bg-slate-50 dark:hover:bg-slate-700/30 transition ${item.quantity <= item.alertThreshold ? 'bg-red-50/50 dark:bg-red-900/10' : ''}`}>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${TYPE_COLORS[item.itemType]}`}>{TYPE_LABELS[item.itemType]}</span>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">
                    {item.name}
                    {item.notes && <p className="text-[10px] text-slate-400 mt-0.5">{item.notes}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className={`font-bold ${item.quantity <= item.alertThreshold ? 'text-red-600' : 'text-slate-800 dark:text-slate-200'}`}>{item.quantity}</span>
                      {item.quantity <= item.alertThreshold && <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
                    </div>
                    <p className="text-[10px] text-slate-400">حد التنبيه: {item.alertThreshold}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-800 dark:text-slate-200 font-mono text-xs">₪ {item.costPrice.toLocaleString('ar')}</td>
                  <td className="px-4 py-3">
                    <p className="text-xs text-slate-700 dark:text-slate-300">{item.supplierName || '—'}</p>
                    {item.supplierPhone && <p className="text-[10px] text-slate-400" dir="ltr">{item.supplierPhone}</p>}
                  </td>
                  <td className="px-4 py-3">
                    {item.fullyPaid ? (
                      <span className="flex items-center gap-1 text-xs text-emerald-600"><CheckCircle className="w-3 h-3" /> مدفوع</span>
                    ) : (
                      <span className="text-xs text-amber-600">متبقي: ₪{item.remainingAmount.toLocaleString('ar')}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(item)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(item.id, item.name)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
