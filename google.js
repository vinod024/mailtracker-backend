const { GoogleSpreadsheet } = require('google-spreadsheet');
const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
const SHEET_ID = process.env.GOOGLE_SHEET_ID;

// ✅ LOG OPENS
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

      // Fill Seen 1 to Seen 10
      for (let i = 1; i <= 10; i++) {
        const col = `Seen ${i}`;
        if (!row[col]) {
          row[col] = now;
          break;
        }
      }

      await row.save();
      matched = true;
      console.log(`📬 Row updated: Total Opens = ${total}, Last Seen = ${now}`);
      break;
    }
  }

  if (!matched) {
    console.error('❌ CID not found in sheet:', trimmedCid);

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

// ✅ INSERT ROW WHEN SENDING EMAIL
async function insertTrackingRow(company, email, subject, type, sentTime, cid) {
  const doc = new GoogleSpreadsheet(SHEET_ID);
  await doc.useServiceAccountAuth(creds);
  await doc.loadInfo();

  const sheet = doc.sheetsByTitle['Email Tracking Log'];
  await sheet.loadHeaderRow();
  const rows = await sheet.getRows();

  const exists = rows.some((row) =>
    row['Company Name'] === company &&
    row['Email ID'] === email &&
    row['Email Type'] === type
  );

  if (!exists) {
    await sheet.addRow({
      'Company Name': company,
      'Email ID': email,
      'Subject': subject,
      'Email Type': type,
      'Sent Time': sentTime,
      'Total Opens': 0,
      'Last Seen Time': '',
      'Seen 1': '', 'Seen 2': '', 'Seen 3': '', 'Seen 4': '', 'Seen 5': '',
      'Seen 6': '', 'Seen 7': '', 'Seen 8': '', 'Seen 9': '', 'Seen 10': '',
      'Total PDF Views': '',
      'Last PDF View Time': '',
      'Total Cal Clicks': '',
      'Last Cal Click Time': '',
      'Total Web Clicks': '',
      'Last Web Click Time': '',
      'Total Portfolio Link Clicks': '',
      'Last Portfolio Link Time': '',
      'CID': cid
    });
  }
}

module.exports = {
  logOpenByCid,
  insertTrackingRow
};
