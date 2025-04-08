const { GoogleSpreadsheet } = require('google-spreadsheet');
const creds = JSON.parse(process.env.GOOGLE_CREDENTIALS);
const SHEET_ID = process.env.SHEET_ID;

async function logOpenToSheet(company, email, subject, type) {
  const doc = new GoogleSpreadsheet(SHEET_ID);
  await doc.useServiceAccountAuth(creds);
  await doc.loadInfo();

  const sheet = doc.sheetsByTitle['Email Tracking Log'];
  await sheet.loadHeaderRow();
  const rows = await sheet.getRows();

  let targetRow = rows.find(
    r =>
      r['Company Name'] === company &&
      r['Email ID'] === email &&
      r['Email Type'] === type &&
      r['Subject'] === subject
  );

  const now = new Date().toLocaleString('en-GB', { timeZone: 'Asia/Kolkata' });

  if (!targetRow) {
    targetRow = await sheet.addRow({
      'Company Name': company,
      'Email ID': email,
      'Subject': subject,
      'Email Type': type,
      'Sent Time': '',
      'Total Opens': 1,
      'Last Seen Time': now,
      'Seen 1': now
    });
    return;
  }

  let total = parseInt(targetRow['Total Opens'] || 0);
  total++;
  targetRow['Total Opens'] = total;
  targetRow['Last Seen Time'] = now;

  for (let i = 1; i <= 10; i++) {
    if (!targetRow[`Seen ${i}`]) {
      targetRow[`Seen ${i}`] = now;
      break;
    }
    if (i === 10) {
      targetRow[`Seen ${i}`] = now; // Overwrite last slot
    }
  }

  await targetRow.save();
}

module.exports = { logOpenToSheet };
