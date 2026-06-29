import type { Patient, Payment } from '../../types';
import { computePatientFinance } from '../../lib/finance';

const METHOD_LABEL: Record<string, string> = {
  cash: '💵 كاش',
  bank_palestine: '🏦 بنك فلسطين',
  jawwal: '📲 جوال بي',
  palpal: '💳 بال بي',
};

interface Props {
  patient: Patient;
  payments?: Payment[];
}

export function FinancialSummary({ patient, payments = [] }: Props) {
  const { totalDue, totalPaid, remaining } = computePatientFinance(patient, payments);
  const patientPayments = payments
    .filter((p) => p.patientId === patient.id)
    .sort((a, b) => b.date.localeCompare(a.date));

  const cards = [
    { label: 'إجمالي المطلوب', value: totalDue, bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-100' },
    { label: 'إجمالي المدفوع', value: totalPaid, bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100' },
    { label: 'المبلغ المتبقي', value: remaining, bg: remaining > 0 ? 'bg-red-50' : 'bg-emerald-50', text: remaining > 0 ? 'text-red-700' : 'text-emerald-700', border: remaining > 0 ? 'border-red-100' : 'border-emerald-100' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-slate-800 dark:text-white text-lg">{patient.fullName}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">ملف رقم: {patient.fileNumber}</p>
        </div>
        <span className={`text-xs px-3 py-1 rounded-full font-medium ${patient.gender === 'male' ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'}`}>
          {patient.gender === 'male' ? 'ذكر' : 'أنثى'}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {cards.map((card) => (
          <div key={card.label} className={`${card.bg} border ${card.border} rounded-xl p-4 text-center`}>
            <p className="text-xs text-slate-500 mb-1">{card.label}</p>
            <p className={`text-xl font-bold ${card.text}`}>
              ₪ {card.value.toLocaleString('ar')}
            </p>
          </div>
        ))}
      </div>

      {/* Payments recorded by the secretary */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">سجل الدفعات المسجّلة</p>
        </div>
        {patientPayments.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-slate-400">لا توجد دفعات مسجّلة لهذا المريض</p>
        ) : (
          <div className="divide-y divide-slate-50 dark:divide-slate-700">
            {patientPayments.map((pay) => (
              <div key={pay.id} className="flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    {METHOD_LABEL[pay.method ?? 'cash'] ?? '💵 كاش'}
                  </span>
                  {pay.note && <span className="text-xs text-slate-400">{pay.note}</span>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-emerald-600">₪ {pay.amount.toLocaleString('ar')}</span>
                  <span className="text-xs text-slate-400">{pay.date}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
