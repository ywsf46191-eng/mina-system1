// أعلى الملف: تأكد أن import موجود
import { auth } from './config';

// إرسال رسالة مع fallback إلى smslog
export async function sendSms(
  clinicId: string,
  to: string,
  message: string,
  patientId?: string,
): Promise<SmsLogEntry> {
  const payload: Omit<SmsLogEntry, 'id' | 'createdAt'> = {
    clinicId,
    to,
    message,
    patientId,
    status: 'queued',
    notes: undefined,
  };

  try {
    // رابط Cloud Function الحقيقي - عيّنه لمشروعك بعد النشر
    const SMS_API_URL = 'https://us-central1-<project-id>.cloudfunctions.net/sendSms';

    // حاول الحصول على Firebase ID token واضيفه إلى الهيدر
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    try {
      const user = auth.currentUser;
      if (user) {
        const idToken = await user.getIdToken();
        if (idToken) headers['Authorization'] = `Bearer ${idToken}`;
      }
    } catch (tokenErr) {
      console.warn('sendSms: failed to get ID token', tokenErr);
    }

    const resp = await fetch(SMS_API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ clinicId, to, message, patientId }),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => `${resp.status}`);
      payload.status = 'failed';
      payload.notes = `SMS API responded ${resp.status}: ${text}`;
      return await addSmsLog(payload);
    }

    let json: any = null;
    try { json = await resp.json(); } catch (_) { /* ignore parse error */ }

    const apiSuccess = json?.success === true || resp.status === 200;
    payload.status = apiSuccess ? 'sent' : 'failed';
    payload.notes = json?.message ?? (apiSuccess ? 'sent via cloud function' : `API returned ${resp.status}`);

    return await addSmsLog(payload);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.warn('sendSms: external API call failed, falling back to smslog', err);
    payload.status = 'failed';
    payload.notes = errMsg;
    return await addSmsLog(payload);
  }
}
