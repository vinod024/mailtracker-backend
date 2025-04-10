const express = require('express');
const { logOpenByCid } = require('./google');
const app = express();

// 1x1 Transparent Pixel Buffer (GIF)
const transparentPixel = Buffer.from(
  'R0lGODlhAQABAPAAAAAAAAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==',
  'base64'
);

// Gmail-safe base64 decoder function
function decodeBase64UrlSafe(cid) {
  try {
    const base64 = cid.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
    return Buffer.from(padded, 'base64').toString('utf-8');
  } catch (err) {
    console.error('❌ Failed to decode CID:', cid, '| Error:', err.message);
    return null;
  }
}

// ✅ Open tracking endpoint (used by pixel)
app.get('/open', async (req, res) => {
  const { cid } = req.query;

  if (!cid) {
    console.log('❌ Missing cid');
    return res.status(400).send('Missing cid');
  }

  const decoded = decodeBase64UrlSafe(cid);
  if (!decoded) {
    return res.status(400).send('Invalid CID');
  }

  const parts = decoded.split('|');
  if (parts.length !== 5) {
    console.error('❌ Invalid decoded CID format:', decoded);
    return res.status(400).send('CID format must include 5 parts');
  }

  const [company, email, subject, type, sentTime] = parts;
  console.log('📩 Open Tracking:', {
    company,
    email,
    subject,
    type,
    sentTime
  });

  try {
    await logOpenByCid(decoded); // Pass full decoded CID to google.js
    console.log('✅ Open tracked and logged in sheet.');
  } catch (err) {
    console.error('❌ Failed to log open:', err.message);
  }

  res.set('Content-Type', 'image/gif');
  res.send(transparentPixel);
});

// Default route (optional)
app.get('/', (req, res) => {
  res.send('📬 Mailtracker backend is live!');
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
