const express = require('express');
const { logOpenByCid } = require('./google.js');
const app = express();

app.get('/open', async (req, res) => {
  const { cid } = req.query;

  if (!cid) {
    console.error('❌ Missing cid');
    return res.status(400).send('Missing cid');
  }

  try {
    const decoded = decodeBase64UrlSafe(cid);

    const parts = decoded.split('|');
    if (parts.length !== 5) {
      console.error('❌ Invalid CID format (5 parts required)', decoded);
      return res.status(400).send('Invalid CID');
    }

    const [company, email, subject, type, sentTime] = parts;

    console.log('📬 Open Tracking:', {
      company,
      email,
      subject,
      type,
      sentTime,
    });

    await logOpenByCid(decoded);

    res.set('Content-Type', 'image/gif');
    res.send(Buffer.from(
      'R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==',
      'base64'
    ));
  } catch (err) {
    console.error('❌ Failed to log open (decode or save):', err.message);
    res.status(500).send('Error');
  }
});

function decodeBase64UrlSafe(cid) {
  const padded = cid.replace(/-/g, '+').replace(/_/g, '/');
  const base64 = padded + '='.repeat((4 - (padded.length % 4)) % 4);
  const buffer = Buffer.from(base64, 'base64');
  return buffer.toString('utf8');
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
