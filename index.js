const express = require('express');
const { logOpenByCid } = require('./google');
const app = express();

// 1x1 Transparent Pixel Buffer (GIF)
const transparentPixel = Buffer.from(
  'R0lGODlhAQABAPAAAAAAAAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==',
  'base64'
);

app.get('/open', async (req, res) => {
  const { cid } = req.query;

  if (!cid) {
    console.log('❌ Missing cid');
    return res.status(400).send('Missing cid');
  }

  try {
    await logOpenByCid(cid);
    console.log('✅ Open tracked for cid:', cid);
  } catch (err) {
    console.error('❌ Failed to log open:', err.message);
  }

  res.set('Content-Type', 'image/gif');
  res.send(transparentPixel);
});

// Default route for safety
app.get('/', (req, res) => {
  res.send('📬 Mailtracker backend is live!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
