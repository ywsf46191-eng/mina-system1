const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

export interface SendResult {
  ok: boolean;
  code?: string;
  error?: string;
}

export async function sendSms(
  apiUrl: string,
  sender: string,
  mobile: string,
  text: string,
): Promise<SendResult> {
  try {
    const res = await fetch(`${API_BASE}/api/sms/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiUrl, sender, mobile, text }),
    });
    return (await res.json()) as SendResult;
  } catch {
    return { ok: false, error: 'تعذّر الاتصال بالخادم' };
  }
}

export interface SmsTemplate {
  id: string;
  label: string;
  text: string;
}

export const SMS_TEMPLATES: SmsTemplate[] = [
  {
    id: 'appointment',
    label: '📅 تذكير موعد',
    text: 'مرحباً {الاسم}، نذكّركم بموعدكم غداً في {العيادة} الساعة {الوقت}. نتطلع لرؤيتكم 🦷',
  },
  {
    id: 'payment',
    label: '💰 متابعة دفع',
    text: 'مرحباً {الاسم}، نود إعلامكم بأن لديكم رصيداً مستحقاً في {العيادة}. يرجى التواصل معنا لترتيب التسوية.',
  },
  {
    id: 'followup',
    label: '🔄 متابعة علاج',
    text: 'مرحباً {الاسم}، تذكيركم بمتابعة خطة العلاج الخاصة بكم. يسعدنا حجز موعدكم القادم في {العيادة}.',
  },
  {
    id: 'thanks',
    label: '🌟 شكر وتقدير',
    text: 'مرحباً {الاسم}، نشكركم على ثقتكم بـ {العيادة}. نرجو أن تكونوا بصحة وعافية. سعداء بخدمتكم دائماً ✨',
  },
];

export function formatTime(time: string): string {
  if (!time) return '';
  const [h, m] = time.split(':');
  const hour = parseInt(h, 10);
  if (Number.isNaN(hour)) return time;
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'مساءً' : 'صباحاً'}`;
}

export function fillTemplate(
  text: string,
  vars: { name?: string; time?: string; date?: string; clinic?: string },
): string {
  return text
    .replace(/\{الاسم\}/g, vars.name ?? '')
    .replace(/\{الوقت\}/g, vars.time ?? '')
    .replace(/\{التاريخ\}/g, vars.date ?? '')
    .replace(/\{العيادة\}/g, vars.clinic ?? 'عيادتنا');
}

function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function tomorrowStr(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return localDateStr(d);
}

export function todayStr(): string {
  return localDateStr(new Date());
}
