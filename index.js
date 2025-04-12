const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

const { logOpenByCid, insertTrackingRow } = require('./google');

// Webhook for open tracking
app.get('/open', async (req, res) => {
  try {
    const encodedCid = req.query.cid;
    if (!encodedCid) return res.status(400).send('Missing CID');

    const decoded = Buffer.from(encodedCid, 'base64url').toString('utf-8');
    const parts = decoded.split('||');
    const [company, email, subject, type, sentTime] = parts;

    console.log('📩 Open Tracking:', { company, email, subject, type, sentTime });

    await logOpenByCid(decoded);

    const pixel = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',
      'base64'
    );
    res.set('Content-Type', 'image/gif');
    res.send(pixel);
  } catch (error) {
    console.error('❌ Failed to log open:', error.message);
    res.status(500).send('Internal Error');
  }
});

// Start the server
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
