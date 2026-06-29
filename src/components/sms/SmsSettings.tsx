import { useState, useEffect } from 'react';
import {
  Eye, EyeOff, Save, Loader2, CheckCircle, KeyRound, Tag, Link2, Zap, Info,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getClinicSettings, saveClinicSettings } from '../../firebase/firestoreService';
import type { ClinicSettings } from '../../types';

interface Props {
  onSaved?: (s: ClinicSettings) => void;
}

export function SmsSettings({ onSaved }: Props) {
  const { clinicId } = useAuth();
  const [token, setToken] = useState('');
  const [sender, setSender] = useState('');
  const [apiUrl, setApiUrl] = useState('');
  const [autoSend, setAutoSend] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getClinicSettings(clinicId).then((s) => {
      setToken(s.hotSmsToken ?? '');
      setSender(s.hotSmsSender ?? '');
      setApiUrl(s.hotSmsApiUrl ?? '');
      setAutoSend(s.hotSmsAutoSend ?? false);
    }).catch(() => null);
  }, [clinicId]);

  const handleSave = async () => {
    setSaving(true);
    const data = {
      hotSmsToken: token.trim(),
      hotSmsSender: sender.trim(),
      hotSmsApiUrl: apiUrl.trim(),
      hotSmsAutoSend: autoSend,
    };
    await saveClinicSettings(clinicId, data);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    onSaved?.(data);
  };

  return (
    <div className="max-w-2xl mx-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 space-y-6" dir="rtl">
      <div className="text-right">
        <h2 className="text-lg font-bold text-slate-800 dark:text-white">بيانات الاعتماد</h2>
        <p className="text-xs text-slate-400 mt-1">إعدادات خدمة HotSMS الخاصة بهذه العيادة</p>
      </div>

      {/* API code */}
      <div>
        <label className="flex items-center gap-1.5 justify-end text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
          رمز API (HotSMS)
          <KeyRound className="w-3.5 h-3.5 text-slate-400" />
        </label>
        <div className="relative">
          <input
            type={showToken ? 'text' : 'password'}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="رمز API من لوحة HotSMS"
            dir="ltr"
            className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white pr-4 pl-10"
          />
          <button type="button" onClick={() => setShowToken((v) => !v)}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {token && !showToken && (
          <p className="text-[11px] text-slate-400 mt-1 font-mono text-left">
            {token.slice(0, 6)}{'•'.repeat(Math.max(0, token.length - 10))}{token.slice(-4)}
          </p>
        )}
      </div>

      {/* Sender name */}
      <div>
        <label className="flex items-center gap-1.5 justify-end text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
          اسم المرسل
          <Tag className="w-3.5 h-3.5 text-slate-400" />
        </label>
        <input
          type="text"
          value={sender}
          onChange={(e) => setSender(e.target.value)}
          placeholder="مثال: VETNITY"
          maxLength={11}
          dir="ltr"
          className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white text-right"
        />
        <p className="text-[11px] text-slate-400 mt-1">الاسم الذي يظهر للمستلم بدلاً من الرقم (حد أقصى 11 حرفاً).</p>
      </div>

      {/* API URL */}
      <div>
        <label className="flex items-center gap-1.5 justify-end text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
          رابط API لـ HotSMS
          <Link2 className="w-3.5 h-3.5 text-slate-400" />
        </label>
        <textarea
          value={apiUrl}
          onChange={(e) => setApiUrl(e.target.value)}
          placeholder="http://hotsms.ps/sendbulksms.php?user_name=...&user_pass=...&sender=...&mobile=972"
          rows={3}
          dir="ltr"
          className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white font-mono resize-none text-left"
        />
        <div className="flex items-start gap-1.5 mt-1.5 text-[11px] text-slate-400">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>الصق الرابط من تبويب «أدوات المطورين» في لوحة HotSMS كما هو. سيُضاف رقم الجوال ونص الرسالة تلقائياً عند الإرسال.</span>
        </div>
      </div>

      {/* Auto send toggle */}
      <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-700/50 rounded-xl px-4 py-3 border border-slate-200 dark:border-slate-600">
        <button onClick={() => setAutoSend((v) => !v)}
          className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${autoSend ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
          <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${autoSend ? 'left-6' : 'left-0.5'}`} />
        </button>
        <div className="flex items-center gap-2 text-right">
          <div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">تفعيل الإرسال التلقائي</p>
            <p className="text-[11px] text-slate-400">إرسال تذكير تلقائي لمواعيد الغد مرة واحدة يومياً.</p>
          </div>
          <Zap className={`w-4 h-4 ${autoSend ? 'text-emerald-500' : 'text-slate-400'}`} />
        </div>
      </div>

      <button onClick={handleSave} disabled={saving}
        className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-3 rounded-xl transition disabled:opacity-60">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
        {saved ? 'تم الحفظ ✓' : 'حفظ الإعدادات'}
      </button>
    </div>
  );
}
