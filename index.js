const express = require('express');
const { logOpenByCid, insertTrackingRow } = require('./google'); // ✅ both functions used
const app = express();

const transparentPixel = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',
  'base64'
);

// --- ✅ Improved CID decoder ---
function decodeBase64UrlSafe(input) {
  try {
    const base64 = input
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(input.length + (4 - input.length % 4) % 4, '=');

    const buffer = Buffer.from(base64, 'base64');
    return buffer.toString('utf-8');
  } catch (error) {
    console.error('❌ Failed to decode CID:', input, '| error:', error.message);
    return null;
  }
}

// --- ✅ Open Tracking Endpoint ---
app.get('/open', async (req, res) => {
  const { cid } = req.query;

  if (!cid) {
    console.error('❌ Missing cid');
    return res.status(400).send('Missing cid');
  }

  console.log('🧪 Raw CID before decode:', cid);

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

  console.log('📬 Open Tracking:', {
    company,
    email,
    subject,
    type,
    sentTime,
  });

  try {
    await insertTrackingRow(company, email, subject, type, sentTime, cid); // ✅ CORRECT FUNCTION
    console.log(`✅ Open tracked and logged in sheet.`);
  } catch (err) {
    console.error('❌ Failed to log open:', err.message);
  }

  res.set('Content-Type', 'image/gif');
  res.end(transparentPixel);
});

// --- ✅ Default Route ---
app.get('/', (req, res) => {
  res.send('✅ Mailtracker backend is live!');
});

// --- ✅ Start server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
