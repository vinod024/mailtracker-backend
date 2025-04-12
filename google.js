const { GoogleSpreadsheet } = require('google-spreadsheet');

// Parse credentials from environment variable
let creds;
try {
  creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
} catch (error) {
  console.error('❌ Failed to parse Google credentials:', error.message);
  throw new Error('Invalid Google service account credentials');
}

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
if (!SHEET_ID) {
  throw new Error('GOOGLE_SHEET_ID environment variable is required');
}

// Helper to initialize the sheet connection
async function getSheet() {
  try {
    const doc = new GoogleSpreadsheet(SHEET_ID);
    await doc.useServiceAccountAuth(creds);
    await doc.loadInfo();
    
    const sheet = doc.sheetsByTitle['Email Tracking Log'];
    if (!sheet) {
      throw new Error('Sheet "Email Tracking Log" not found');
    }
    
    await sheet.loadHeaderRow();
    return sheet;
  } catch (error) {
    console.error('❌ Failed to connect to Google Sheet:', error.message);
    throw new Error(`Google Sheets connection error: ${error.message}`);
  }
}

// 📊 Log open using CID
async function logOpenByCid(decodedCid) {
  try {
    const sheet = await getSheet();
    const rows = await sheet.getRows();

    const now = new Date().toLocaleString('en-GB', { timeZone: 'Asia/Kolkata' });
    const trimmedCid = decodedCid.trim();
    let matched = false;

    for (const row of rows) {
      const rowCid = (row['CID'] || '').trim();
      if (rowCid === trimmedCid) {
        // Update total opens count
        let total = parseInt(row['Total Opens']) || 0;
        total++;
        row['Total Opens'] = total;
        row['Last Seen Time'] = now;

        // Update individual seen timestamps
        let seenUpdated = false;
        for (let i = 1; i <= 10; i++) {
          const col = `Seen ${i}`;
          if (!row[col]) {
            row[col] = now;
            seenUpdated = true;
            break;
          }
        }
        
        // If all slots are filled, update the last slot
        if (!seenUpdated) {
          row['Seen 10'] = now;
        }

        await row.save();
        matched = true;
        console.log(`✅ Row updated: Total Opens = ${total}, Last Seen = ${now}`);
        break;
      }
    }

    if (!matched) {
      console.error(`❌ CID not found in sheet:`, trimmedCid);
    }
    
    return matched;
  } catch (error) {
    console.error('❌ Failed to log open event:', error.message);
    throw new Error(`Failed to log open: ${error.message}`);
  }
}

// 📌 Log initial row at time of sending
async function insertTrackingRow(company, email, subject, type, sentTime, cid) {
  try {
    const sheet = await getSheet();
    
    // Create a new row with all required fields
    const newRow = {
      'Company Name': company,
      'Email ID': email,
      'Subject': subject,
      'Email Type': type,
      'Sent Time': sentTime,
      'Total Opens': '0',
      'Last Seen Time': '',
      'Seen 1': '', 'Seen 2': '', 'Seen 3': '', 'Seen 4': '', 'Seen 5': '',
      'Seen 6': '', 'Seen 7': '', 'Seen 8': '', 'Seen 9': '', 'Seen 10': '',
      'Total PDF Views': '0', 'Last PDF View Time': '',
      'Total Cal Clicks': '0', 'Last Cal Click Time': '',
      'Total Web Clicks': '0', 'Last Web Click Time': '',
      'Total Portfolio Link Clicks': '0', 'Last Portfolio Link Click Time': '',
      'CID': cid
    };

    await sheet.addRow(newRow);
    console.log(`✅ Row inserted in Tracking Sheet for CID: ${cid}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to insert tracking row:', error.message);
    throw new Error(`Failed to insert tracking row: ${error.message}`);
  }
}

// 🌐 Export both functions
module.exports = {
  logOpenByCid,
  insertTrackingRow
};