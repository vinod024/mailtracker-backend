const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

const { logOpenByCid, insertTrackingRow } = require('./google');

// Middleware for parsing JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('Service is healthy');
});

// 🧠 Webhook for open tracking
app.get('/open', async (req, res) => {
  try {
    const encodedCid = req.query.cid;
    if (!encodedCid) {
      console.log('❌ Missing CID parameter');
      return res.status(400).send('Missing CID');
    }

    // Decode the base64url-encoded CID
    const decoded = Buffer.from(encodedCid, 'base64url').toString('utf-8');
    console.log('📬 Open Tracking Decoded:', decoded);

    // Parse the decoded CID
    const parts = decoded.split('||');
    if (parts.length < 5) {
      console.log('❌ Invalid CID format:', decoded);
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

    // Log the open event to Google Sheets
    await logOpenByCid(decoded);

    // Return a transparent 1x1 tracking pixel
    const pixel = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',
      'base64'
    );
    res.set('Content-Type', 'image/gif');
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.send(pixel);
  } catch (error) {
    console.error('❌ Failed to log open:', error.message);
    res.status(500).send('Internal Error');
  }
});

// Endpoint to create a new tracking entry
app.post('/track', async (req, res) => {
  try {
    const { company, email, subject, type } = req.body;
    
    // Validate required fields
    if (!company || !email || !subject || !type) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: company, email, subject, type'
      });
    }
    
    const sentTime = new Date().toLocaleString('en-GB', { timeZone: 'Asia/Kolkata' });
    
    // Create a CID by combining parameters and encoding
    const cid = `${company}||${email}||${subject}||${type}||${sentTime}`;
    const encodedCid = Buffer.from(cid).toString('base64url');
    
    // Insert row in Google Sheet
    await insertTrackingRow(company, email, subject, type, sentTime, cid);
    
    res.status(201).json({
      success: true,
      data: {
        encodedCid,
        trackingUrl: `${req.protocol}://${req.get('host')}/open?cid=${encodedCid}`,
        trackingPixel: `<img src="${req.protocol}://${req.get('host')}/open?cid=${encodedCid}" width="1" height="1" alt="" style="display:none">`,
      }
    });
  } catch (error) {
    console.error('❌ Failed to create tracking:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to create tracking entry',
      error: error.message
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err);
  res.status(500).send('Internal Server Error');
});

// Handle 404 errors
app.use((req, res) => {
  res.status(404).send('Resource not found');
});

// ✅ Start the server
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});