import { useState } from 'react';
import { X, Save, Plus, Minus } from 'lucide-react';
import type { ToothState, ToothStatus } from '../../types';

interface Props {
  toothId: string;
  state: ToothState;
  onSave: (toothId: string, state: ToothState) => void;
  onClose: () => void;
}

function resolveStatus(state: ToothState): ToothStatus {
  if (state.treatmentStatus) return state.treatmentStatus;
  if (state.status) return state.status;
  if (state.workedOn) return 'done';
  return 'none';
}

export function ToothModal({ toothId, state, onSave, onClose }: Props) {
  const [diagnosis, setDiagnosis] = useState(state.diagnosis ?? state.notes ?? '');
  const [amount, setAmount] = useState<number>(state.amount ?? 0);
  const [treatmentStatus, setTreatmentStatus] = useState<ToothStatus>(resolveStatus(state));
  const [totalSessions, setTotalSessions] = useState<number>(state.totalSessions ?? 1);
  const [completedSessions, setCompletedSessions] = useState<number[]>(state.completedSessions ?? []);
  const [sessionNotes, setSessionNotes] = useState<Record<string, string>>(state.sessionNotes ?? {});

  const allDone = totalSessions > 0 && completedSessions.length >= totalSessions;
  const someDone = completedSessions.length > 0 && !allDone;

  const toggleSession = (n: number) => {
    setCompletedSessions((prev) => {
      const next = prev.includes(n) ? prev.filter((s) => s !== n) : [...prev, n].sort((a, b) => a - b);
      return next;
    });
  };

  const handleSave = () => {
    // A tooth turns green (done) only when ALL sessions are complete. For a
    // single-session treatment, marking it done counts as completing that one
    // session. For multi-session treatment, a manual "done" is downgraded to
    // 'treatment' (shown red/yellow) until every session is checked off.
    const isMultiSession = totalSessions > 1;
    let finalStatus: ToothStatus = treatmentStatus;
    let finalCompleted = completedSessions;
    if (treatmentStatus === 'done') {
      if (isMultiSession && !allDone) {
        finalStatus = 'treatment';
      } else {
        finalStatus = 'done';
        if (!isMultiSession) finalCompleted = [1];
      }
    } else if (treatmentStatus === 'treatment' && allDone) {
      finalStatus = 'done';
    }
    onSave(toothId, {
      diagnosis,
      amount,
      treatmentStatus: finalStatus,
      totalSessions: treatmentStatus !== 'none' ? totalSessions : undefined,
      completedSessions: treatmentStatus !== 'none' ? finalCompleted : undefined,
      sessionNotes: treatmentStatus !== 'none' ? sessionNotes : undefined,
      notes: diagnosis,
      status: finalStatus,
      workedOn: finalStatus === 'done',
    });
    onClose();
  };

  const statusOptions: { value: ToothStatus; label: string; color: string; bg: string; border: string }[] = [
    { value: 'none',      label: 'سليم',          color: 'text-slate-600 dark:text-slate-300', bg: 'bg-slate-50 dark:bg-slate-700',   border: 'border-slate-300 dark:border-slate-500' },
    { value: 'treatment', label: '🔴 علاج مطلوب', color: 'text-red-700 dark:text-red-400',     bg: 'bg-red-50 dark:bg-red-900/20',     border: 'border-red-400 dark:border-red-600'     },
    { value: 'done',      label: '🟢 تم العلاج',  color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-400 dark:border-emerald-600' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" dir="rtl">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🦷</span>
            <h2 className="font-bold text-slate-800 dark:text-white text-lg">السن رقم {toothId}</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">تشخيص السن</label>
            <textarea
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              rows={3}
              placeholder="أدخل تشخيص السن (مثال: تسوس، كسر، التهاب عصب...)"
              className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-white dark:bg-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">المبلغ (₪)</label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              placeholder="0.00"
              dir="ltr"
              className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-white dark:bg-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">حالة العلاج</label>
            <div className="grid grid-cols-3 gap-2">
              {statusOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTreatmentStatus(opt.value)}
                  className={`px-3 py-2.5 rounded-xl border-2 text-xs font-semibold transition-all ${
                    treatmentStatus === opt.value
                      ? `${opt.bg} ${opt.border} ${opt.color} shadow-sm scale-105`
                      : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-500'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {treatmentStatus !== 'none' && (
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 space-y-3">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                  عدد الجلسات المطلوبة
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setTotalSessions((n) => Math.max(1, n - 1))}
                    className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 flex items-center justify-center transition"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-12 text-center font-bold text-slate-800 dark:text-white text-lg">{totalSessions}</span>
                  <button
                    type="button"
                    onClick={() => setTotalSessions((n) => Math.min(20, n + 1))}
                    className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 flex items-center justify-center transition"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-slate-500 dark:text-slate-400">جلسة</span>
                </div>
              </div>

              {totalSessions > 1 && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                    الجلسات العلاجية
                    {completedSessions.length > 0 && (
                      <span className="mr-2 text-xs font-normal text-slate-500">
                        ({completedSessions.length}/{totalSessions})
                      </span>
                    )}
                  </label>
                  <div className="space-y-2">
                    {Array.from({ length: totalSessions }, (_, i) => i + 1).map((n) => {
                      const done = completedSessions.includes(n);
                      return (
                        <div
                          key={n}
                          className={`flex items-start gap-2 rounded-xl border-2 p-2 transition-all ${
                            done
                              ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/60 dark:bg-emerald-900/10'
                              : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => toggleSession(n)}
                            title={done ? 'إلغاء إتمام الجلسة' : 'إتمام جلسة العلاج'}
                            className={`w-9 h-9 shrink-0 rounded-lg border-2 text-sm font-bold transition-all ${
                              done
                                ? 'bg-emerald-500 border-emerald-600 text-white shadow-sm'
                                : 'bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-500 text-slate-500 dark:text-slate-400 hover:border-emerald-400'
                            }`}
                          >
                            {done ? '✓' : n}
                          </button>
                          <input
                            type="text"
                            value={sessionNotes[String(n)] ?? ''}
                            onChange={(e) =>
                              setSessionNotes((prev) => ({ ...prev, [String(n)]: e.target.value }))
                            }
                            placeholder={`ملاحظات الجلسة ${n}...`}
                            className="flex-1 min-w-0 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-white dark:bg-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      );
                    })}
                  </div>
                  {someDone && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5 font-semibold">
                      🟡 العلاج قيد التنفيذ — سيبقى السن أصفر حتى إتمام جميع الجلسات
                    </p>
                  )}
                  {allDone && treatmentStatus === 'treatment' && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1.5 font-semibold">
                      ✅ جميع الجلسات مكتملة — سيتم تحديث حالة السن إلى "تم العلاج"
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={handleSave}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-xl transition"
          >
            <Save className="w-4 h-4" />
            حفظ
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-medium py-2.5 rounded-xl transition"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}
