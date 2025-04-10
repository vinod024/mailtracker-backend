const { GoogleSpreadsheet } = require('google-spreadsheet');

const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
const SHEET_ID = process.env.GOOGLE_SHEET_ID;

// ✅ Main tracking function
async function logOpenByCid(cid) {
  console.log('📩 Incoming CID:', cid);

  const parts = cid.split('|');
  if (parts.length !== 5) {
    console.error('❌ Invalid CID format:', cid);
    return;
  }

  const [company, email, subject, type, sentTime] = parts;
  console.log('🔍 CID Split → Company:', company, '| Email:', email, '| Type:', type, '| Subject:', subject);

  const doc = new GoogleSpreadsheet(SHEET_ID);
  await doc.useServiceAccountAuth(creds);
  await doc.loadInfo();

  const sheet = doc.sheetsByTitle['Email Tracking Log'];
  await sheet.loadHeaderRow();
  const rows = await sheet.getRows();

  const now = new Date().toLocaleString('en-GB', { timeZone: 'Asia/Kolkata' });

  const targetRow = rows.find(row => row['CID'] === cid);
  if (!targetRow) {
    console.log('⚠️ Row not found with exact CID match:', cid);
    return;
  }

  let total = parseInt(targetRow['Total Opens'] || 0);
  total++;
  targetRow['Total Opens'] = total;
  targetRow['Last Seen Time'] = now;

  for (let i = 1; i <= 10; i++) {
    const col = `Seen ${i}`;
    if (!targetRow[col]) {
      targetRow[col] = now;
      break;
    }
    if (i === 10) {
      targetRow[col] = now; // Overwrite last
    }
  }

  console.log(`📊 Updating row for ${company} | ${email} | ${type}`);
  console.log('📈 Total Opens:', total, '| ⏱️ Last Seen Time:', now);

  try {
    await targetRow.save();
    console.log('✅ Row successfully updated.');
  } catch (err) {
    console.error('❌ Failed to save row:', err.message);
  }
}

module.exports = { logOpenByCid };
