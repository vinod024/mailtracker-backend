const { GoogleSpreadsheet } = require('google-spreadsheet');

const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
const SHEET_ID = process.env.GOOGLE_SHEET_ID;

function decodeBase64UrlSafe(cid) {
  const base64 = cid.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
  return Buffer.from(padded, 'base64').toString('utf-8');
}

async function logOpenByCid(cidRaw) {
  console.log('📩 Incoming CID:', cidRaw);

  let decoded;
  try {
    decoded = decodeBase64UrlSafe(cidRaw);
  } catch (err) {
    console.error('❌ Failed to decode CID:', err.message);
    return;
  }

  console.log('🔓 Decoded CID:', decoded);

  const [company, email, type, sentTime] = decoded.split('|');
  console.log('🔍 Matching — Company:', company, '| Email:', email, '| Type:', type, '| Sent:', sentTime);

  if (!company || !email || !type || !sentTime) {
    console.error('❌ Invalid decoded CID format.');
    return;
  }

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

    try {
      const decodedRow = decodeBase64UrlSafe(rowCid);
      const [rCompany, rEmail, rSubject, rType, rTime] = decodedRow.split('|');

      if (
        rCompany === company &&
        rEmail === email &&
        rType === type &&
        rTime === sentTime
      ) {
        targetRow = row;
        break;
      }
    } catch (err) {
      console.warn('⚠️ Failed to decode row CID:', row['CID'], '| Error:', err.message);
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
      targetRow[col] = now; // overwrite
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
