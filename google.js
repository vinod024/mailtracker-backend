const { GoogleSpreadsheet } = require('google-spreadsheet');
const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
const SHEET_ID = process.env.GOOGLE_SHEET_ID;

// ✅ Open Tracking
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
      let total = parseInt(row['Total Opens']) || 0;
      total++;
      row['Total Opens'] = total;
      row['Last Seen Time'] = now;

      for (let i = 1; i <= 10; i++) {
        const col = `Seen ${i}`;
        if (!row[col]) {
          row[col] = now;
          break;
        }
      }

      await row.save();
      matched = true;
      console.log(`✅ Row updated: Total Opens = ${total}, Last Seen = ${now}`);
      break;
    }
  }

  if (!matched) {
    console.error('❌ CID not found in sheet:', trimmedCid);
  }
}

// ✅ Row Insertion on Email Send
async function insertTrackingRow(company, email, subject, type, sentTime, cid) {
  const doc = new GoogleSpreadsheet(SHEET_ID);
  await doc.useServiceAccountAuth(creds);
  await doc.loadInfo();

  const sheet = doc.sheetsByTitle['Email Tracking Log'];
  await sheet.addRow({
    'Company Name': company,
    'Email ID': email,
    'Subject': subject,
    'Email Type': type,
    'Sent Time': sentTime,
    'Seen 1': '',
    'Seen 2': '',
    'Seen 3': '',
    'Seen 4': '',
    'Seen 5': '',
    'Seen 6': '',
    'Seen 7': '',
    'Seen 8': '',
    'Seen 9': '',
    'Seen 10': '',
    'Total Opens': '',
    'Last Seen Time': '',
    'Total PDF Views': '',
    'Last PDF View Time': '',
    'Total Cal Clicks': '',
    'Last Cal Click Time': '',
    'Total Web Clicks': '',
    'Last Web Click Time': '',
    'Total Portfolio Link Clicks': '',
    'Last Portfolio Link Click Time': '',
    'CID': cid
  });

  console.log(`✅ Row inserted in Tracking Sheet for CID: ${cid}`);
}

module.exports = {
  logOpenByCid,
  insertTrackingRow
};
