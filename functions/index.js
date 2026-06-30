// functions/index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch'); // v2
const { v4: uuidv4 } = require('uuid');

admin.initializeApp();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: '100kb' }));

// Verify Firebase ID token middleware
async function verifyIdToken(req, res, next) {
  const authHeader = req.get('Authorization') || '';
  const match = authHeader.match(/^Bearer (.+)$/);
  if (!match) {
    return res.status(401).json({ success: false, message: 'Missing Authorization header' });
  }
  const idToken = match[1];
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    req.user = decoded;
    return next();
  } catch (err) {
    console.error('verifyIdToken error', err);
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
}

async function persistSmsLog({ clinicId, to, message, patientId, status, notes, createdBy, providerResult }) {
  const docId = uuidv4();
  const payload = {
    id: docId,
    clinicId: clinicId || '',
    to: to || '',
    message: message || '',
    patientId: patientId || null,
    status: status || 'queued',
    notes: notes || '',
    providerResult: providerResult || null,
    createdBy: createdBy || '',
    createdAt: new Date().toISOString(),
  };
  await admin.firestore().collection('smslog').doc(docId).set(payload);
  return payload;
}

// POST /sendSms (client calls this function)
app.post('/sendSms', verifyIdToken, async (req, res) => {
  try {
    const { clinicId, to, message, patientId } = req.body;
    if (!to || !message) {
      return res.status(400).json({ success: false, message: 'Missing "to" or "message" in request body' });
    }

    const createdBy = req.user?.uid || '';
    // create queued log
    const log = await persistSmsLog({ clinicId, to, message, patientId, status: 'queued', notes: '', createdBy });

    const cfg = functions.config();
    const provider = (cfg.sms && cfg.sms.provider) || 'hotsms';

    // HOTSMS provider implementation
    if (provider === 'hotsms') {
      // You can provide either api_token or user_name+user_pass
      const apiToken = cfg.sms.hotsms && cfg.sms.hotsms.api_token;
      const userName = cfg.sms.hotsms && cfg.sms.hotsms.user_name;
      const userPass = cfg.sms.hotsms && cfg.sms.hotsms.user_pass;
      const sender = (cfg.sms.hotsms && cfg.sms.hotsms.sender) || 'SMS';
      const usePost = !!(cfg.sms.hotsms && cfg.sms.hotsms.use_post); // optional flag

      // build HOTSMS URL and params
      const base = (cfg.sms.hotsms && cfg.sms.hotsms.base_url) || 'http://hotsms.ps/sendbulksms.php';
      const mobile = to; // ensure number format expected by HOTSMS (e.g. 9725...)
      const text = String(message);

      // prefer api_token if present
      const params = new URLSearchParams();
      if (apiToken) params.append('api_token', apiToken);
      else if (userName && userPass) {
        params.append('user_name', userName);
        params.append('user_pass', userPass);
      } else {
        await admin.firestore().collection('smslog').doc(log.id).update({
          status: 'failed',
          notes: 'HOTSMS credentials missing in functions config',
        });
        return res.status(500).json({ success: false, message: 'HOTSMS not configured' });
      }
      params.append('sender', sender);
      params.append('mobile', mobile);
      params.append('type', '0'); // type param per HOTSMS docs (0 = text?)
      params.append('text', text);

      try {
        let resp;
        if (usePost) {
          resp = await fetch(base, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString(),
          });
        } else {
          // GET
          const url = `${base}?${params.toString()}`;
          resp = await fetch(url, { method: 'GET' });
        }

        const bodyText = await resp.text().catch(() => '');
        // HOTSMS returns success code like "1001" or "1001_MessageID..." per screenshots
        const success = /(^|_|\b)1001\b/.test(bodyText) || bodyText.includes('1001');
        if (resp.ok && success) {
          // try to extract message id if present
          const match = bodyText.match(/1001[_\-]?([A-Za-z0-9]+)/);
          const providerId = match ? match[1] : null;
          await admin.firestore().collection('smslog').doc(log.id).update({
            status: 'sent',
            notes: 'sent via HOTSMS',
            providerResult: bodyText,
          });
          return res.json({ success: true, id: log.id, provider: 'hotsms', providerResponse: bodyText, providerId });
        } else {
          // treat as failure, include provider response
          await admin.firestore().collection('smslog').doc(log.id).update({
            status: 'failed',
            notes: `hotsms_response:${bodyText}`,
            providerResult: bodyText,
          });
          return res.status(500).json({ success: false, message: 'HOTSMS returned error', providerResponse: bodyText });
        }
      } catch (err) {
        console.error('HOTSMS send error', err);
        await admin.firestore().collection('smslog').doc(log.id).update({
          status: 'failed',
          notes: `hotsms_error:${err.message || String(err)}`,
        });
        return res.status(500).json({ success: false, message: 'HOTSMS send failed', error: err.message || String(err) });
      }
    }

    // fallback: unknown provider
    await admin.firestore().collection('smslog').doc(log.id).update({
      status: 'failed',
      notes: `unknown_provider:${provider}`,
    });
    return res.status(500).json({ success: false, message: `Unknown SMS provider: ${provider}` });
  } catch (err) {
    console.error('sendSms unexpected error', err);
    return res.status(500).json({ success: false, message: 'Internal error', error: err.message || String(err) });
  }
});

exports.sendSms = functions.https.onRequest(app);
