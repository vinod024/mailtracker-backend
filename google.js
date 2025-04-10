const { GoogleSpreadsheet } = require('google-spreadsheet');

const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
const SHEET_ID = process.env.GOOGLE_SHEET_ID;

// ✅ Gmail-safe base64 decoder
function decodeBase64UrlSafe(cid) {
  const base64 = cid.replace(/-/g, '+').replace(/_/g, '/');
  const paddingNeeded = 4 - (base64.length % 4);
  const padded = base64 + '='.repeat(paddingNeeded % 4);
  return Buffer.from(padded, 'base64').toString('utf-8');
}

// ✅ Main function triggered from /open endpoint
async function logOpenByCid(cid) {
  const decoded = decodeBase64UrlSafe(cid);
  const [company, email, type, sentTime] = decoded.split('|');

  if (!company || !email || !type) {
    console.error('❌ Invalid decoded CID:', decoded);
    return;
  }

  const doc = new GoogleSpreadsheet(SHEET_ID);
  await doc.useServiceAccountAuth(creds);
  await doc.loadInfo();

  const sheet = doc.sheetsByTitle['Email Tracking Log'];
  await sheet.loadHeaderRow();
  const rows = await sheet.getRows();

  const now = new Date().toLocaleString('en-GB', { timeZone: 'Asia/Kolkata' });

  // Find the row by CID (Column Z)
  const targetRow = rows.find(row => row['CID'] === cid);

  if (!targetRow) {
    console.log('⚠️ No matching row found for CID:', cid);
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
      targetRow[col] = now; // overwrite Seen 10
    }
  }

  await targetRow.save();
}

module.exports = { logOpenByCid };
