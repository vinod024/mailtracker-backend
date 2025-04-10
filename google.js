const { GoogleSpreadsheet } = require('google-spreadsheet');
const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
const SHEET_ID = process.env.GOOGLE_SHEET_ID;

async function logOpenByCid(decodedCid) {
  const doc = new GoogleSpreadsheet(SHEET_ID);
  await doc.useServiceAccountAuth(creds);
  await doc.loadInfo();

  const sheet = doc.sheetsByTitle['Email Tracking Log'];
  await sheet.loadHeaderRow();

  const rows = await sheet.getRows();

  const now = new Date().toLocaleString('en-GB', { timeZone: 'Asia/Kolkata' });

  const matchRow = rows.find(row => (row['CID'] || '').trim() === decodedCid.trim());

  if (!matchRow) {
    console.error('❌ CID not found in sheet:', decodedCid);
    return;
  }

  // Parse total opens
  let totalOpens = parseInt(matchRow['Total Opens']) || 0;
  totalOpens++;

  // Update "Seen 1–10"
  let updatedSeen = false;
  for (let i = 1; i <= 10; i++) {
    const seenCol = `Seen ${i}`;
    if (!matchRow[seenCol]) {
      matchRow[seenCol] = now;
      updatedSeen = true;
      break;
    }
  }

  // Always update total + last seen
  matchRow['Total Opens'] = totalOpens;
  matchRow['Last Seen Time'] = now;

  await matchRow.save();

  console.log(`📊 Logged open to sheet. CID matched row updated. Seen added? ${updatedSeen}`);
}

module.exports = { logOpenByCid };
