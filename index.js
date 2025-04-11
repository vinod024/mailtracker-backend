const express = require('express');
const { logOpenByCid, insertTrackingRow } = require('./google'); // Correct import
const app = express();

const transparentPixel = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',
  'base64'
);      

// Safe Base64 URL decoder (Mailtracker-compatible)
function decodeBase64UrlSafe(str) {
  try {
    const padded = str.replace(/-/g, '+').replace(/_/g, '/')
      + '==='.slice((str.length + 3) % 4); // Add necessary padding
    return Buffer.from(padded, 'base64').toString('utf-8');
  } catch (err) {
    console.error('❌ Failed to decode base64:', str, '| error:', err.message);
    return null;
  }
}

// 📨 Email open pixel endpoint
app.get('/open', async (req, res) => {
  const { cid } = req.query;

  if (!cid) {
    console.warn('❌ Missing cid');
    return res.status(400).send('Missing cid');
  }

  const decoded = decodeBase64UrlSafe(cid);
  if (!decoded) return res.status(400).send('Invalid CID');

  const parts = decoded.split('|');
  if (parts.length !== 5) {
    console.warn('❌ Invalid CID format:', decoded);
    return res.status(400).send('Invalid CID format');
  }

  const [company, email, subject, type, sentTime] = parts;

  console.log('📬 Open Tracking:', {
    company,
    email,
    subject,
    type,
    sentTime
  });

  try {
    await insertTrackingRow(company, email, subject, type, sentTime, cid);
    await logOpenByCid(cid);
    console.log('✅ Open tracked and logged');
  } catch (err) {
    console.error('❌ Failed to log open:', err.message);
  }

  res.set('Content-Type', 'image/gif');
  return res.send(transparentPixel);
});

// 🌐 Root check
app.get('/', (req, res) => {
  res.send('📡 Mailtracker backend is live!');
});

// 🚀 Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
