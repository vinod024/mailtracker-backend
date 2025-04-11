const express = require('express');
const { logOpenByCid, insertTrackingRow } = require('./google');

const app = express();
const PORT = process.env.PORT || 3000;

// 🔐 DECODE Base64-SAFE CID
function decodeBase64UrlSafe(str) {
  try {
    const padded = str.replace(/-/g, '+').replace(/_/g, '/');
    const base64 = padded + '='.repeat((4 - padded.length % 4) % 4);
    const decoded = Buffer.from(base64, 'base64').toString('utf-8');
    return decoded;
  } catch (err) {
    console.error('❌ Failed to decode CID:', str, '| Error:', err.message);
    return null;
  }
}

// 📬 Tracking Pixel Route
app.get('/open', async (req, res) => {
  const { cid } = req.query;
  if (!cid) {
    console.warn('❌ Missing cid');
    return res.status(400).send('Missing cid');
  }

  const decoded = decodeBase64UrlSafe(cid);
  if (!decoded) return res.status(400).send('Invalid CID');

  const parts = decoded.split('|');
  if (parts.length < 5) return res.status(400).send('CID must include 5 parts');

  const [company, email, subject, type, sentTime] = parts;

  console.log('📬 Open Tracking:', { company, email, subject, type, sentTime });

  try {
    await insertTrackingRow(company, email, subject, type, sentTime, cid);
    await logOpenByCid(cid);
    console.log('✅ Email open tracked and logged.');
  } catch (err) {
    console.error('❌ Failed to log open:', err.message);
  }

  res.set('Content-Type', 'image/gif');
  const transparentGif = Buffer.from(
    'R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',
    'base64'
  );
  res.end(transparentGif);
});

app.get('/', (_, res) => res.send('📡 Mailtracker backend is live!'));

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
