import { useEffect, useState, useCallback, useRef } from 'react';
import { Layout } from '../components/shared/Layout';
import { useAuth } from '../contexts/AuthContext';
import {
  getPatients, getClinicSettings, saveClinicSettings,
  getSmsLog, addSmsLog, deleteSmsLog, clearSmsLog,
} from '../firebase/firestoreService';
import type { Patient, ClinicSettings, SmsLogEntry, SmsSource } from '../types';
import { sendSms, type SendResult, tomorrowStr, todayStr } from '../lib/sms';
import { SmsComposer } from '../components/sms/SmsComposer';
import { SmsTracking } from '../components/sms/SmsTracking';
import { SmsSettings } from '../components/sms/SmsSettings';
import { MessageSquare, Send, ListChecks, Settings } from 'lucide-react';

type Tab = 'send' | 'tracking' | 'settings';

export default function SecretarySmsPage() {
  const { clinicId } = useAuth();
  const [tab, setTab] = useState<Tab>('send');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [settings, setSettings] = useState<ClinicSettings>({});
  const [log, setLog] = useState<SmsLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const autoSendRan = useRef(false);

  const ready = Boolean(settings.hotSmsApiUrl && settings.hotSmsSender);

  const refreshLog = useCallback(async () => {
    const newLog = await getSmsLog(clinicId);
    setLog(newLog);
  }, [clinicId]);

  useEffect(() => {
    autoSendRan.current = false;
    let cancelled = false;
    setLoading(true);
    Promise.all([getPatients(clinicId), getClinicSettings(clinicId)])
      .then(async ([pts, s]) => {
        if (cancelled) return;
        setPatients(pts);
        setSettings(s);
        const newLog = await getSmsLog(clinicId);
        setLog(newLog);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [clinicId]);

  const doSend = useCallback(async (opts: {
    patientId?: string;
    patientName: string;
    phoneNumber: string;
    message: string;
    templateId?: string;
    source: SmsSource;
    appointmentDate?: string;
  }): Promise<SendResult> => {
    if (!settings.hotSmsApiUrl || !settings.hotSmsSender) {
      const result: SendResult = { ok: false, error: 'يرجى إعداد رابط API واسم المرسل أولاً' };
      await addSmsLog({ ...opts, clinicId, status: 'failed', error: result.error });
      await refreshLog();
      return result;
    }
    const result = await sendSms(settings.hotSmsApiUrl, settings.hotSmsSender, opts.phoneNumber, opts.message);
    await addSmsLog({
      ...opts,
      clinicId,
      status: result.ok ? 'sent' : 'failed',
      code: result.code,
      error: result.ok ? undefined : result.error,
    });
    await refreshLog();
    return result;
  }, [settings.hotSmsApiUrl, settings.hotSmsSender, clinicId, refreshLog]);

  // Automatic appointment reminders, once per day
  useEffect(() => {
    if (loading || autoSendRan.current) return;
    if (!settings.hotSmsAutoSend || !ready) return;
    const today = todayStr();
    if (settings.hotSmsLastAutoSend === today) return;

    autoSendRan.current = true;
    const tomorrow = tomorrowStr();
    const targets = patients.filter((p) => p.nextAppointmentDate === tomorrow && p.nextAppointmentTime);
    if (targets.length === 0) {
      saveClinicSettings(clinicId, { hotSmsLastAutoSend: today });
      setSettings((s) => ({ ...s, hotSmsLastAutoSend: today }));
      return;
    }

    // Mark the day done up-front to avoid duplicate runs (e.g. reload mid-loop
    // or a second open tab) before sends finish.
    saveClinicSettings(clinicId, { hotSmsLastAutoSend: today });
    setSettings((s) => ({ ...s, hotSmsLastAutoSend: today }));

    (async () => {
      const allLog = await getSmsLog(clinicId);
      const alreadySent = new Set(
        allLog
          .filter((e) => e.status === 'sent' && e.source === 'auto' && e.appointmentDate === tomorrow)
          .map((e) => e.patientId),
      );
      for (const p of targets) {
        if (alreadySent.has(p.id)) continue;
        const message = `مرحباً ${p.fullName}، نذكّركم بموعدكم غداً في عيادتنا الساعة ${p.nextAppointmentTime}. نتطلع لرؤيتكم 🦷`;
        await doSend({
          patientId: p.id,
          patientName: p.fullName,
          phoneNumber: p.phoneNumber,
          message,
          templateId: 'appointment',
          source: 'auto',
          appointmentDate: tomorrow,
        });
      }
      await saveClinicSettings(clinicId, { hotSmsLastAutoSend: today });
      setSettings((s) => ({ ...s, hotSmsLastAutoSend: today }));
    })();
  }, [loading, settings.hotSmsAutoSend, settings.hotSmsLastAutoSend, ready, patients, clinicId, doSend]);

  const handleDelete = async (id: string) => {
    await deleteSmsLog(id, clinicId);
    await refreshLog();
  };
  const handleClear = async () => {
    await clearSmsLog(clinicId);
    await refreshLog();
  };

  const TABS: { key: Tab; label: string; icon: typeof Send }[] = [
    { key: 'send', label: 'إرسال الرسائل', icon: Send },
    { key: 'tracking', label: 'المتابعة والسجل', icon: ListChecks },
    { key: 'settings', label: 'الإعدادات', icon: Settings },
  ];

  const failedCount = log.filter((e) => e.status === 'failed').length;

  return (
    <Layout>
      <div dir="rtl" className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-white">إرسال الرسائل SMS</h1>
            <p className="text-xs text-slate-400 mt-0.5">تذكيرات المواعيد والرسائل عبر خدمة HotSMS</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 text-sm font-semibold px-4 py-2.5 -mb-px border-b-2 transition ${
                tab === key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700'
              }`}>
              <Icon className="w-4 h-4" />
              {label}
              {key === 'tracking' && failedCount > 0 && (
                <span className="bg-red-100 text-red-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{failedCount}</span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {tab === 'send' && <SmsComposer patients={patients} ready={ready} onSend={doSend} />}
            {tab === 'tracking' && (
              <SmsTracking log={log} ready={ready} onResend={doSend} onDelete={handleDelete} onClear={handleClear} />
            )}
            {tab === 'settings' && (
              <SmsSettings onSaved={(s) => setSettings((prev) => ({ ...prev, ...s }))} />
            )}
          </>
        )}
      </div>
    </Layout>
  );
}