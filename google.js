const { GoogleSpreadsheet } = require('google-spreadsheet');

// Validate environment variables
if (!process.env.GOOGLE_SERVICE_ACCOUNT) {
  throw new Error('GOOGLE_SERVICE_ACCOUNT environment variable is required');
}
if (!process.env.GOOGLE_SHEET_ID) {
  throw new Error('GOOGLE_SHEET_ID environment variable is required');
}

const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
const SHEET_ID = process.env.GOOGLE_SHEET_ID;

// Helper function to initialize and authenticate the document
async function getAuthenticatedDoc() {
  const doc = new GoogleSpreadsheet(SHEET_ID);
  await doc.useServiceAccountAuth(creds);
  await doc.loadInfo();
  return doc;
}

// Log open using CID
async function logOpenByCid(decodedCid) {
  try {
    if (!decodedCid || typeof decodedCid !== 'string') {
      throw new Error('Invalid CID provided');
    }

    const doc = await getAuthenticatedDoc();
    const sheet = doc.sheetsByTitle['Email Tracking Log'];
    if (!sheet) {
      throw new Error('Email Tracking Log sheet not found');
    }

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

        // Find first empty "Seen X" column
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
      console.warn(`⚠️ CID not found in sheet: ${trimmedCid}`);
    }
  } catch (error) {
    console.error('❌ Error in logOpenByCid:', error);
    throw error;
  }
}

// Log initial row at time of sending
async function insertTrackingRow(company, email, subject, type, sentTime, cid) {
  try {
    if (!cid) {
      throw new Error('CID is required');
    }

    const doc = await getAuthenticatedDoc();
    const sheet = doc.sheetsByTitle['Email Tracking Log'];
    if (!sheet) {
      throw new Error('Email Tracking Log sheet not found');
    }

    await sheet.addRow({
      'Company Name': company || '',
      'Email ID': email || '',
      'Subject': subject || '',
      'Email Type': type || '',
      'Sent Time': sentTime || '',
      'Total Opens': 0,
      'Last Seen Time': '',
      'Seen 1': '', 'Seen 2': '', 'Seen 3': '', 'Seen 4': '', 'Seen 5': '',
      'Seen 6': '', 'Seen 7': '', 'Seen 8': '', 'Seen 9': '', 'Seen 10': '',
      'Total PDF Views': 0, 'Last PDF View Time': '',
      'Total Cal Clicks': 0, 'Last Cal Click Time': '',
      'Total Web Clicks': 0, 'Last Web Click Time': '',
      'Total Portfolio Link Clicks': 0, 'Last Portfolio Link Click Time': '',
      'CID': cid,
    });

    console.log(`✅ Row inserted in Tracking Sheet for CID: ${cid}`);
  } catch (error) {
    console.error('❌ Error in insertTrackingRow:', error);
    throw error;
  }
}

module.exports = {
  logOpenByCid,
  insertTrackingRow,
};