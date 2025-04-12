const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

const { logOpenByCid, insertTrackingRow } = require('./google');

// Middleware to parse JSON bodies
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Webhook for open tracking
app.get('/open', async (req, res) => {
  try {
    const encodedCid = req.query.cid;
    if (!encodedCid) {
      return res.status(400).send('Missing CID parameter');
    }

    const decoded = Buffer.from(encodedCid, 'base64url').toString('utf-8');
    console.log('📬 Open Tracking Decoded:', decoded);

    const parts = decoded.split('||');
    if (parts.length !== 5) {
      return res.status(400).send('Invalid CID format');
    }

    const [company, email, subject, type, sentTime] = parts;
    console.log({
      company,
      email,
      subject,
      type,
      sentTime,
    });

    await logOpenByCid(decoded);

    // Return transparent 1x1 GIF pixel
    const pixel = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',
      'base64'
    );
    res.set({
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    res.send(pixel);
  } catch (error) {
    console.error('❌ Failed to log open:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).send('Internal Server Error');
});

// Start the server
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
});