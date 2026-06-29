import { useState } from 'react';
import {
  Send, CheckCircle, XCircle, Loader2, FileText, Phone, Clock,
  ChevronDown, ChevronUp, AlertTriangle,
} from 'lucide-react';
import type { Patient, SmsSource } from '../../types';
import { SMS_TEMPLATES, fillTemplate, formatTime, tomorrowStr, type SendResult } from '../../lib/sms';

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
  patients: Patient[];
  ready: boolean;
  onSend: SendFn;
}

type LocalStatus = 'idle' | 'sending' | 'success' | 'error';

export function SmsComposer({ patients, ready, onSend }: Props) {
  const tomorrow = tomorrowStr();
  const upcoming = patients.filter((p) => p.nextAppointmentDate === tomorrow && p.nextAppointmentTime);

  const [activeTemplateId, setActiveTemplateId] = useState(SMS_TEMPLATES[0].id);
  const [showTemplates, setShowTemplates] = useState(true);
  const [showCustom, setShowCustom] = useState(false);
  const [statuses, setStatuses] = useState<Record<string, LocalStatus>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [customName, setCustomName] = useState('');
  const [customPhone, setCustomPhone] = useState('');
  const [customText, setCustomText] = useState('');
  const [customStatus, setCustomStatus] = useState<LocalStatus>('idle');
  const [customError, setCustomError] = useState('');

  const activeTemplate = SMS_TEMPLATES.find((t) => t.id === activeTemplateId) ?? SMS_TEMPLATES[0];

  const buildText = (p: Patient) =>
    fillTemplate(activeTemplate.text, {
      name: p.fullName,
      time: p.nextAppointmentTime ? formatTime(p.nextAppointmentTime) : '',
      date: p.nextAppointmentDate,
    });

  const sendOne = async (p: Patient) => {
    setStatuses((s) => ({ ...s, [p.id]: 'sending' }));
    setErrors((e) => ({ ...e, [p.id]: '' }));
    const result = await onSend({
      patientId: p.id,
      patientName: p.fullName,
      phoneNumber: p.phoneNumber,
      message: buildText(p),
      templateId: activeTemplate.id,
      source: 'reminder',
      appointmentDate: p.nextAppointmentDate,
    });
    if (result.ok) {
      setStatuses((s) => ({ ...s, [p.id]: 'success' }));
    } else {
      setStatuses((s) => ({ ...s, [p.id]: 'error' }));
      setErrors((e) => ({ ...e, [p.id]: result.error ?? 'خطأ غير متوقع' }));
    }
  };

  const sendAll = async () => {
    for (const p of upcoming) {
      if (statuses[p.id] !== 'success') await sendOne(p);
    }
  };

  const sendCustom = async () => {
    if (!customPhone) { setCustomError('يرجى إدخال رقم الجوال'); return; }
    if (!customText) { setCustomError('يرجى إدخال نص الرسالة'); return; }
    setCustomStatus('sending');
    setCustomError('');
    const result = await onSend({
      patientName: customName || 'غير محدد',
      phoneNumber: customPhone,
      message: customText,
      source: 'manual',
    });
    if (result.ok) {
      setCustomStatus('success');
      setTimeout(() => setCustomStatus('idle'), 3000);
      setCustomPhone(''); setCustomName(''); setCustomText('');
    } else {
      setCustomStatus('error');
      setCustomError(result.error ?? 'خطأ غير متوقع');
    }
  };

  const applyTemplateToCustom = (id: string) => {
    setActiveTemplateId(id);
    const t = SMS_TEMPLATES.find((x) => x.id === id) ?? SMS_TEMPLATES[0];
    setCustomText(fillTemplate(t.text, { name: customName }));
  };

  return (
    <div className="space-y-4" dir="rtl">
      {!ready && (
        <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          لم يتم إعداد بيانات HotSMS بعد. انتقل لتبويب «الإعدادات» وأدخل رابط API واسم المرسل.
        </div>
      )}

      {/* Templates */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
        <button onClick={() => setShowTemplates((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-700 transition">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            <FileText className="w-4 h-4 text-purple-500" />
            قوالب الرسائل
            <span className="text-xs font-normal text-slate-400">({SMS_TEMPLATES.length})</span>
          </div>
          {showTemplates ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>
        {showTemplates && (
          <div className="p-4 space-y-2 border-t border-slate-100 dark:border-slate-700">
            <p className="text-[11px] text-slate-400 mb-2">
              اختر القالب الذي يُستخدم عند إرسال التذكيرات. المتغيرات المتاحة: &#123;الاسم&#125; &#123;الوقت&#125; &#123;التاريخ&#125; &#123;العيادة&#125;
            </p>
            {SMS_TEMPLATES.map((tmpl) => (
              <button key={tmpl.id} type="button" onClick={() => setActiveTemplateId(tmpl.id)}
                className={`w-full text-right p-3 rounded-xl border-2 transition-all ${
                  activeTemplateId === tmpl.id
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                    : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 hover:border-purple-300'
                }`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{tmpl.label}</span>
                  {activeTemplateId === tmpl.id && (
                    <span className="text-[10px] bg-purple-600 text-white px-2 py-0.5 rounded-full">مفعّل</span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">{tmpl.text}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Custom send */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
        <button onClick={() => setShowCustom((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-700 transition">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            <Phone className="w-4 h-4 text-green-500" />
            إرسال رسالة مخصصة
          </div>
          {showCustom ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>
        {showCustom && (
          <div className="p-4 space-y-3 border-t border-slate-100 dark:border-slate-700">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">اسم المستلم</label>
                <input value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="اسم المريض"
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">رقم الجوال</label>
                <input value={customPhone} onChange={(e) => setCustomPhone(e.target.value)} placeholder="05xxxxxxxx" dir="ltr"
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-right" />
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {SMS_TEMPLATES.map((t) => (
                <button key={t.id} type="button" onClick={() => applyTemplateToCustom(t.id)}
                  className="text-[11px] px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition">
                  {t.label}
                </button>
              ))}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">نص الرسالة</label>
              <textarea value={customText} onChange={(e) => setCustomText(e.target.value)} rows={3}
                placeholder="اكتب الرسالة أو اختر قالباً..."
                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-white resize-none" />
              <p className="text-[10px] text-slate-400 mt-0.5">{customText.length} حرف</p>
            </div>
            {customError && <p className="text-xs text-red-500">{customError}</p>}
            <button onClick={sendCustom} disabled={!ready || customStatus === 'sending'}
              className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg transition disabled:opacity-50 ${
                customStatus === 'success' ? 'bg-emerald-50 text-emerald-600' : customStatus === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-600 hover:bg-green-700 text-white'
              }`}>
              {customStatus === 'sending' && <Loader2 className="w-4 h-4 animate-spin" />}
              {customStatus === 'success' && <CheckCircle className="w-4 h-4" />}
              {(customStatus === 'idle' || customStatus === 'error') && <Send className="w-4 h-4" />}
              {customStatus === 'success' ? 'تم الإرسال!' : customStatus === 'sending' ? 'جارٍ...' : 'إرسال الرسالة'}
            </button>
          </div>
        )}
      </div>

      {/* Tomorrow reminders */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            <Clock className="w-4 h-4 text-blue-600" />
            تذكيرات مواعيد الغد
            {upcoming.length > 0 && <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">{upcoming.length}</span>}
          </div>
          {upcoming.length > 1 && (
            <button onClick={sendAll} disabled={!ready}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold px-3 py-2 rounded-lg transition">
              <Send className="w-3.5 h-3.5" /> إرسال للكل
            </button>
          )}
        </div>

        {upcoming.length === 0 ? (
          <div className="flex flex-col items-center py-8 gap-2 text-slate-400">
            <Clock className="w-9 h-9 opacity-30" />
            <p className="text-sm">لا توجد مواعيد غداً تحتاج تذكيراً</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {upcoming.map((p) => {
              const status = statuses[p.id] ?? 'idle';
              const errMsg = errors[p.id];
              return (
                <div key={p.id} className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 rounded-xl gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm truncate">{p.fullName}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{p.nextAppointmentDate} — {formatTime(p.nextAppointmentTime)}</p>
                    <p className="text-xs text-slate-400 font-mono" dir="ltr">{p.phoneNumber}</p>
                    {errMsg && <p className="text-xs text-red-500 mt-1">{errMsg}</p>}
                  </div>
                  <button onClick={() => sendOne(p)} disabled={!ready || status === 'sending' || status === 'success'}
                    className={`flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg transition whitespace-nowrap shrink-0 disabled:opacity-60 ${
                      status === 'success' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20'
                      : status === 'error' ? 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20'
                      : status === 'sending' ? 'bg-blue-50 text-blue-400'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}>
                    {status === 'sending' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    {status === 'success' && <CheckCircle className="w-4 h-4" />}
                    {status === 'error' && <XCircle className="w-4 h-4" />}
                    {status === 'idle' && <Send className="w-4 h-4" />}
                    {status === 'success' ? 'تم الإرسال' : status === 'error' ? 'إعادة' : status === 'sending' ? 'جارٍ...' : 'إرسال'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
