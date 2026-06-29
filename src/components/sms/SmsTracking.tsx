import { useState } from 'react';
import {
  CheckCircle, XCircle, Send, Loader2, Trash2, Inbox, Search,
} from 'lucide-react';
import type { SmsLogEntry, SmsSource } from '../../types';
import type { SendResult } from '../../lib/sms';

type SendFn = (opts: {
  patientId?: string;
  patientName: string;
  phoneNumber: string;
  message: string;
  templateId?: string;
  source: SmsSource;
  appointmentDate?: string;
}) => Promise<SendResult>;

interface Props {
  log: SmsLogEntry[];
  ready: boolean;
  onResend: SendFn;
  onDelete: (id: string) => void;
  onClear: () => void;
}

type Filter = 'all' | 'sent' | 'failed';

const SOURCE_LABEL: Record<SmsSource, string> = {
  reminder: 'تذكير موعد',
  manual: 'إرسال يدوي',
  auto: 'إرسال تلقائي',
};

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('ar', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

export function SmsTracking({ log, ready, onResend, onDelete, onClear }: Props) {
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [resending, setResending] = useState<Record<string, boolean>>({});

  const sentCount = log.filter((e) => e.status === 'sent').length;
  const failedCount = log.filter((e) => e.status === 'failed').length;

  const filtered = log.filter((e) => {
    if (filter !== 'all' && e.status !== filter) return false;
    if (search && !(e.patientName.includes(search) || e.phoneNumber.includes(search))) return false;
    return true;
  });

  const handleResend = async (entry: SmsLogEntry) => {
    setResending((r) => ({ ...r, [entry.id]: true }));
    await onResend({
      patientId: entry.patientId,
      patientName: entry.patientName,
      phoneNumber: entry.phoneNumber,
      message: entry.message,
      templateId: entry.templateId,
      source: entry.source,
      appointmentDate: entry.appointmentDate,
    });
    setResending((r) => ({ ...r, [entry.id]: false }));
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-slate-800 dark:text-white">{log.length}</p>
          <p className="text-[11px] text-slate-400 mt-1">الإجمالي</p>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-emerald-600">{sentCount}</p>
          <p className="text-[11px] text-emerald-600/70 mt-1">تم الإرسال</p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-red-500">{failedCount}</p>
          <p className="text-[11px] text-red-500/70 mt-1">لم يُرسل</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {([['all', 'الكل'], ['sent', 'المُرسلة'], ['failed', 'غير المُرسلة']] as [Filter, string][]).map(([key, label]) => (
          <button key={key} onClick={() => setFilter(key)}
            className={`text-xs font-semibold px-3.5 py-2 rounded-xl transition ${
              filter === key
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
            }`}>
            {label}
          </button>
        ))}
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث بالاسم أو الجوال..."
            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pr-9 pl-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        {log.length > 0 && (
          <button onClick={onClear}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-500 px-3 py-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition">
            <Trash2 className="w-3.5 h-3.5" /> مسح السجل
          </button>
        )}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center py-12 gap-3 text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl">
          <Inbox className="w-10 h-10 opacity-30" />
          <p className="text-sm">{log.length === 0 ? 'لا توجد رسائل في السجل بعد' : 'لا توجد نتائج مطابقة'}</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((entry) => {
            const isSent = entry.status === 'sent';
            const busy = resending[entry.id];
            return (
              <div key={entry.id}
                className={`bg-white dark:bg-slate-800 border rounded-2xl p-4 ${
                  isSent ? 'border-slate-200 dark:border-slate-700' : 'border-red-200 dark:border-red-800/60'
                }`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        isSent ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {isSent ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {isSent ? 'تم الإرسال' : 'لم يُرسل'}
                      </span>
                      <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">{SOURCE_LABEL[entry.source]}</span>
                      <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{entry.patientName}</p>
                      <span className="text-xs text-slate-400 font-mono" dir="ltr">{entry.phoneNumber}</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed line-clamp-2">{entry.message}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[10px] text-slate-400">{formatDateTime(entry.createdAt)}</span>
                      {!isSent && entry.error && <span className="text-[10px] text-red-500">{entry.error}</span>}
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-1.5 shrink-0">
                    <button onClick={() => handleResend(entry)} disabled={!ready || busy}
                      className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg transition disabled:opacity-50 ${
                        isSent ? 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200' : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}>
                      {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      {isSent ? 'إعادة' : 'إرسال'}
                    </button>
                    <button onClick={() => onDelete(entry.id)}
                      className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
