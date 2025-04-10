const { GoogleSpreadsheet } = require('google-spreadsheet');

const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
const SHEET_ID = process.env.GOOGLE_SHEET_ID;

// Detects if CID is already readable (not base64)
function safeDecodeCID(cid) {
  if (cid.includes('|') && cid.split('|').length >= 4) {
    console.log('🧠 CID is already decoded — skipping base64 decode');
    return cid;
  }

  try {
    const base64 = cid.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
    return Buffer.from(padded, 'base64').toString('utf-8');
  } catch (err) {
    console.error('❌ Base64 decode failed:', err.message);
    return null;
  }
}

async function logOpenByCid(cidRaw) {
  console.log('📩 Incoming CID:', cidRaw);

  const decoded = safeDecodeCID(cidRaw);
  if (!decoded) {
    console.error('❌ Could not decode CID.');
    return;
  }

  console.log('🔓 Decoded CID:', decoded);
  const parts = decoded.split('|');

  if (parts.length < 4) {
    console.error('❌ Invalid decoded CID format.');
    return;
  }

  const [company, email, type, sentTime] = parts;
  console.log('🔍 Matching — Company:', company, '| Email:', email, '| Type:', type, '| Sent:', sentTime);

  const doc = new GoogleSpreadsheet(SHEET_ID);
  await doc.useServiceAccountAuth(creds);
  await doc.loadInfo();

  const sheet = doc.sheetsByTitle['Email Tracking Log'];
  await sheet.loadHeaderRow();
  const rows = await sheet.getRows();

  const now = new Date().toLocaleString('en-GB', { timeZone: 'Asia/Kolkata' });

  let targetRow = null;

  for (const row of rows) {
    const rowCid = row['CID'];
    if (!rowCid) continue;

    const rowDecoded = safeDecodeCID(rowCid);
    if (!rowDecoded) continue;

    const [rCompany, rEmail, rSubject, rType, rTime] = rowDecoded.split('|');

    if (
      rCompany === company &&
      rEmail === email &&
      rType === type &&
      rTime === sentTime
    ) {
      targetRow = row;
      break;
    }
  }

  if (!targetRow) {
    console.log('⚠️ No matching row found for decoded CID:', decoded);
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
      targetRow[col] = now; // overwrite last
    }
  }

  console.log(`📊 Updating Row — Company: ${company}, Email: ${email}, Type: ${type}`);
  console.log('📈 Total Opens:', total, '| ⏱️ Last Seen Time:', now);

  try {
    await targetRow.save();
    console.log('✅ Row successfully updated in Google Sheet.');
  } catch (err) {
    console.error('❌ Failed to save to Google Sheet:', err.message);
  }
}

module.exports = { logOpenByCid };
