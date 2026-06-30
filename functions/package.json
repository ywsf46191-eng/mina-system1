// functions/index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch'); // v2
const twilio = require('twilio');
const { v4: uuidv4 } = require('uuid');

admin.initializeApp();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: '100kb' }));

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

async function persistSmsLog({ clinicId, to, message, patientId, status, notes, createdBy }) {
  const docId = uuidv4();
  const payload = {
    id: docId,
    clinicId: clinicId || '',
    to: to || '',
    message: message || '',
    patientId: patientId || null,
    status: status || 'queued',
    notes: notes || '',
    createdBy: createdBy || '',
    createdAt: new Date().toISOString(),
  };
  await admin.firestore().collection('smslog').doc(docId).set(payload);
  return payload;
}

app.post('/sendSms', verifyIdToken, async (req, res) => {
  try {
    const { clinicId, to, message, patientId } = req.body;
    if (!to || !message) {
      return res.status(400).json({ success: false, message: 'Missing "to" or "message"' });
    }

    const createdBy = req.user?.uid || '';
    const log = await persistSmsLog({ clinicId, to, message, patientId, status: 'queued', notes: '', createdBy });

    const cfg = functions.config();
    const provider = (cfg.sms && cfg.sms.provider) || 'twilio';

    if (provider === 'twilio') {
      const sid = cfg.sms.twilio.sid;
      const token = cfg.sms.twilio.token;
      const from = cfg.sms.twilio.from;
      if (!sid || !token || !from) {
        await admin.firestore().collection('smslog').doc(log.id).update({
          status: 'failed',
          notes: 'Twilio config missing',
        });
        return res.status(500).json({ success: false, message: 'Twilio not configured' });
      }
      try {
        const client = twilio(sid, token);
        const msg = await client.messages.create({ body: message, from, to });
        await admin.firestore().collection('smslog').doc(log.id).update({
          status: 'sent',
          notes: `twilio_sid:${msg.sid}`,
        });
        return res.json({ success: true, id: log.id, provider: 'twilio', providerId: msg.sid });
      } catch (err) {
        console.error('Twilio send error', err);
        await admin.firestore().collection('smslog').doc(log.id).update({
          status: 'failed',
          notes: `twilio_error:${err.message || String(err)}`,
        });
        return res.status(500).json({ success: false, message: 'Twilio send failed', error: err.message || String(err) });
      }
    }

    if (provider === 'http') {
      const url = cfg.sms.provider_url;
      const apiKey = cfg.sms.provider_key;
      if (!url) {
        await admin.firestore().collection('smslog').doc(log.id).update({
          status: 'failed',
          notes: 'HTTP provider URL missing',
        });
        return res.status(500).json({ success: false, message: 'HTTP provider not configured' });
      }
      try {
        const headers = { 'Content-Type': 'application/json' };
        if (apiKey) headers['X-API-KEY'] = apiKey;
        const resp = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify({ to, message, clinicId, patientId }),
        });
        const text = await resp.text();
        if (!resp.ok) {
          await admin.firestore().collection('smslog').doc(log.id).update({
            status: 'failed',
            notes: `provider_http_status:${resp.status} body:${text}`,
          });
          return res.status(500).json({ success: false, message: 'Provider returned non-OK', details: text });
        }
        await admin.firestore().collection('smslog').doc(log.id).update({
          status: 'sent',
          notes: `provider_response:${text}`,
        });
        return res.json({ success: true, id: log.id, provider: 'http', providerResponse: text });
      } catch (err) {
        console.error('HTTP provider error', err);
        await admin.firestore().collection('smslog').doc(log.id).update({
          status: 'failed',
          notes: `provider_error:${err.message || String(err)}`,
        });
        return res.status(500).json({ success: false, message: 'Provider send failed', error: err.message || String(err) });
      }
    }

    await admin.firestore().collection('smslog').doc(log.id).update({
      status: 'failed',
      notes: `unknown_provider:${provider}`,
    });
    return res.status(500).json({ success: false, message: `Unknown provider: ${provider}` });
  } catch (err) {
    console.error('sendSms unexpected error', err);
    return res.status(500).json({ success: false, message: 'Internal error', error: err.message || String(err) });
  }
});

exports.sendSms = functions.https.onRequest(app);
