const express = require('express');
const app = express();
const port = 3000;
const { logOpenByCid, insertTrackingRow } = require('./google');

// ✅ Helper function to decode base64 URL-safe format
function decodeBase64UrlSafe(encoded) {
  const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const pad = '='.repeat((4 - (base64.length % 4)) % 4);
  return Buffer.from(base64 + pad, 'base64').toString('utf-8');
}

// ✅ Webhook for open tracking
app.get('/open', async (req, res) => {
  try {
    const { cid } = req.query;
    if (!cid) {
      return res.status(400).send('Missing CID');
    }

    const decoded = decodeBase64UrlSafe(cid);
    const parts = decoded.split('||');
    const [company, email, subject, type, sentTime] = parts;

    console.log('📬 Open Tracking:', { company, email, subject, type, sentTime });

    if (!company || !email || !subject || !type || !sentTime) {
      return res.status(400).send('Invalid tracking data');
    }

    await logOpenByCid(cid); // CID is used to match existing row

    const trackingPixel = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',
      'base64'
    );

    res.set('Content-Type', 'image/gif');
    res.send(trackingPixel);
  } catch (error) {
    console.error('❌ Failed to log open:', error.message);
    res.status(500).send('Internal Error');
  }
});

// ✅ Webhook for row insertion (used at email send time)
app.get('/insert', async (req, res) => {
  try {
    const { company, email, subject, type, sentTime, cid } = req.query;

    if (!company || !email || !subject || !type || !sentTime || !cid) {
      return res.status(400).send('Missing required parameters');
    }

    await insertTrackingRow(
      decodeURIComponent(company),
      decodeURIComponent(email),
      decodeURIComponent(subject),
      decodeURIComponent(type),
      decodeURIComponent(sentTime),
      decodeURIComponent(cid)
    );

    res.status(200).send('Inserted');
  } catch (error) {
    console.error('❌ Failed to insert row:', error.message);
    res.status(500).send('Insert Error');
  }
});

// ✅ Start the server
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
