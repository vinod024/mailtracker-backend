const express = require('express');
const { logOpenToSheet } = require('./google');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/open', async (req, res) => {
  const { company, email, subject, type, self } = req.query;

  if (!company || !email || !type) {
    return res.status(400).send('Missing parameters');
  }

  // Ignore sender-side tracking
  if (self === '1') return res.sendFile(__dirname + '/pixel.gif');

  try {
    await logOpenToSheet(company, email, subject || 'No Subject', type);
    res.sendFile(__dirname + '/pixel.gif');
  } catch (err) {
    console.error('Error logging open:', err);
    res.status(500).send('Error logging open');
  }
});

// Serve a 1x1 transparent pixel
const fs = require('fs');
const pixel = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',
  'base64'
);
fs.writeFileSync(__dirname + '/pixel.gif', pixel);

app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));

