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
  const trimmedCid = decodedCid.trim();

  let matched = false;

  for (const row of rows) {
    const rowCid = (row['CID'] || '').trim();

    if (rowCid === trimmedCid) {
      console.log('✅ Matching row found for CID:', trimmedCid);

      let total = parseInt(row['Total Opens']) || 0;
      total++;

      row['Total Opens'] = total;
      row['Last Seen Time'] = now;

      // Fill Seen 1-10
      for (let i = 1; i <= 10; i++) {
        const col = `Seen ${i}`;
        if (!row[col]) {
          row[col] = now;
          break;
        }
      }

      await row.save();
      matched = true;

      console.log(`📊 Row updated: Total Opens = ${total}, Last Seen = ${now}`);
      break;
    }
  }

  if (!matched) {
    console.error('❌ CID not found in sheet:', trimmedCid);

    // Log it in Logs sheet
    const logSheet = doc.sheetsByTitle['Logs'];
    await logSheet.addRow({
      Timestamp: now,
      Company: 'CID_NOT_FOUND',
      Email: '',
      'Email Type': '',
      'Message/Status': `⚠️ CID not found: ${trimmedCid}`,
    });
  }
}

module.exports = { logOpenByCid };
