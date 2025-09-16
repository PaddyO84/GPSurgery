// --- 1. CONFIGURATION & CONSTANTS ---

// --- Sheet Names ---
const PRESCRIPTIONS_SHEET_NAME = "Form responses 1";
const ARCHIVE_SHEET_NAME = "Archive";

// --- Prescription Sheet Columns ---
const PR_EMAIL_COL = 2;
const PR_PHARMACY_COL = 3;
const PR_NAME_COL = 4;
const PR_PHONE_COL = 6;
const PR_MEDS_COL = 8;
const PR_COMM_PREF_COL = 9;
const PR_STATUS_COL = 10;
const PR_NOTIFICATION_COL = 11;

// --- Script Settings ---
const SENDER_NAME = "Carndonagh Health Centre";
const ADMIN_EMAIL = "patricknoone+surgery@gmail.com";
const STATUS_QUERY = "Query - Please Contact Us";
const STATUS_READY = "Sent to Pharmacy";
const FOOTER = `<p style="font-size:0.9em; color:#666;"><i>Please note: This is an automated message and this email address is not monitored. For any queries, please contact the surgery by phone.</i></p>`;


// --- 2. CORE TRIGGER FUNCTIONS ---

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  const menu = ui.createMenu('Surgery Tools');

  menu.addItem('Send Patient Notification', 'sendPrescriptionNotification');
  menu.addSeparator();

  const statusMenu = ui.createMenu('Set Status');
  statusMenu.addItem(`Mark as '${STATUS_READY}'`, 'setPrescriptionStatusReady');
  statusMenu.addItem(`Mark as '${STATUS_QUERY}'`, 'setPrescriptionStatusQuery');

  menu.addSubMenu(statusMenu);
  menu.addToUi();
}

function onEdit(e) {
  try {
    const range = e.range;
    const sheet = range.getSheet();
    if (sheet.getName() !== PRESCRIPTIONS_SHEET_NAME || range.getColumn() !== PR_STATUS_COL || range.getRow() < 2) return;

    const status = range.getValue().toString().trim();
    if (status === STATUS_READY) {
      const commPref = sheet.getRange(range.getRow(), PR_COMM_PREF_COL).getValue().toLowerCase();
      if (commPref === 'whatsapp') {
        sendWhatsAppLinkToStaff(range.getRow());
      } else {
        sendReadyEmail(range.getRow());
      }
    } else if (status === STATUS_QUERY) {
      sendQueryEmail(range.getRow());
    }
  } catch (err) {
    reportError('onEdit', err, e.range ? e.range.getRow() : null);
  }
}

function onFormSubmit(e) {
  try {
    const sheet = e.range.getSheet();
    const row = e.range.getRow();
    const patientName = e.values[PR_NAME_COL - 1];
    const patientEmail = e.values[PR_EMAIL_COL - 1];

    sendConfirmationNotification(patientName, patientEmail, e.values[PR_COMM_PREF_COL - 1]);

    if (!patientName || !patientEmail) {
      reportError('onFormSubmit Validation', new Error(`Missing Name or Email in row ${row}.`), row);
      return;
    }

    const medicationsRaw = e.values[PR_MEDS_COL - 1];
    if (typeof medicationsRaw === 'string' && medicationsRaw.includes("~")) {
      const medList = medicationsRaw.split("|").map(med => {
        const details = med.split("~");
        return `${details[0] || ''} - ${details[1] || ''} (${details[2] || ''})`;
      }).join("\n");
      sheet.getRange(row, PR_MEDS_COL).setValue(medList);
    }

    sheet.getRange(row, PR_NOTIFICATION_COL).setValue(`Processed on ${Utilities.formatDate(new Date(), "Europe/Dublin", "dd/MM/yyyy")}`);
  } catch (err) {
    reportError('onFormSubmit', err, e.range ? e.range.getRow() : null);
  }
}


// --- 3. PRESCRIPTION WORKFLOW HELPERS ---

function setPrescriptionStatusReady() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const range = sheet.getActiveRange();
  if (range.getRow() < 2) { SpreadsheetApp.getUi().alert("Please select one or more patient rows first."); return; }
  sheet.getRange(range.getRow(), PR_STATUS_COL, range.getNumRows(), 1).setValue(STATUS_READY);
}

function setPrescriptionStatusQuery() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const range = sheet.getActiveRange();
  if (range.getRow() < 2) { SpreadsheetApp.getUi().alert("Please select one or more patient rows first."); return; }
  sheet.getRange(range.getRow(), PR_STATUS_COL, range.getNumRows(), 1).setValue(STATUS_QUERY);
}

function sendConfirmationNotification(patientName, patientEmail, commPref) {
  if (!patientEmail) { Logger.log(`Confirmation not sent for ${patientName}: No email.`); return; }
  const subject = "Confirmation: We've Received Your Prescription Request";
  const method = commPref && commPref.toLowerCase() === 'whatsapp' ? 'WhatsApp' : 'Email';
  const body = `<p>Dear ${patientName},</p><p>Thank you for your repeat prescription request. This is to confirm we have received it.</p><p>You will receive a final notification by <strong>${method}</strong> once your prescription has been sent to your chosen pharmacy.</p><p>Thank you,<br><strong>${SENDER_NAME}</strong></p><hr>${FOOTER}`;
  try { MailApp.sendEmail(patientEmail, subject, "", { htmlBody: body, name: SENDER_NAME }); } catch (e) { Logger.log(`Failed to send confirmation email to ${patientEmail}. Error: ${e}`); }
}

function sendReadyEmail(row) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const patientName = sheet.getRange(row, PR_NAME_COL).getValue();
  const patientEmail = sheet.getRange(row, PR_EMAIL_COL).getValue();
  const pharmacy = sheet.getRange(row, PR_PHARMACY_COL).getValue();
  if (!patientEmail) return;
  const subject = `Your Prescription has been sent to ${pharmacy}`;
  const body = `<p>Dear ${patientName},</p><p>Your recent prescription request has been processed and sent to <strong>${pharmacy}</strong>.</p><p>Please contact your pharmacy directly to confirm collection time.</p><p>Thank you,<br><strong>${SENDER_NAME}</strong></p><hr>${FOOTER}`;
  MailApp.sendEmail(patientEmail, subject, "", { htmlBody: body, name: SENDER_NAME });
}

function sendQueryEmail(row) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const patientName = sheet.getRange(row, PR_NAME_COL).getValue();
  const patientEmail = sheet.getRange(row, PR_EMAIL_COL).getValue();
  if (!patientEmail) return;
  const subject = `Action Required: Query Regarding Your Prescription Request`;
  const body = `<p>Dear ${patientName},</p><p>Regarding your prescription request, we have a query that needs to be resolved.</p><p>Please contact the surgery by phone.</p><p>Thank you,</p><p><strong>${SENDER_NAME}</strong></p><hr>${FOOTER}`;
  MailApp.sendEmail(patientEmail, subject, "", { htmlBody: body, name: SENDER_NAME });
}

function sendWhatsAppLinkToStaff(row) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const patientName = sheet.getRange(row, PR_NAME_COL).getValue();
  const patientPhone = sheet.getRange(row, PR_PHONE_COL).getValue();
  const pharmacy = sheet.getRange(row, PR_PHARMACY_COL).getValue();
  if (!patientPhone) return;
  const staffEmail = Session.getActiveUser().getEmail();
  const messageText = `Hi ${patientName}, this is a message from ${SENDER_NAME}. Your prescription has been sent to ${pharmacy}. Please contact them directly to arrange collection.`;
  const whatsappNumber = "353" + patientPhone.toString().replace(/\s/g, '').substring(1);
  const prefilledMessage = encodeURIComponent(messageText);
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${prefilledMessage}`;
  const subject = `Action Required: Send WhatsApp to ${patientName}`;
  const body = `<p>Hi,</p><p>Please send the prescription notification to <strong>${patientName}</strong> by clicking the link below.</p><p><a href="${whatsappUrl}">Click Here to Send WhatsApp Message</a></p>`;
  MailApp.sendEmail(staffEmail, subject, "", { htmlBody: body });
}

function sendPrescriptionNotification() {
  // This function would need to be implemented to show a dialog for manual notifications
  SpreadsheetApp.getUi().alert("Manual notification feature needs to be fully implemented.");
}


// --- 4. UTILITY & ADMIN FUNCTIONS ---

function archiveOldRequests() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sourceSheet = ss.getSheetByName(PRESCRIPTIONS_SHEET_NAME);
  let archiveSheet = ss.getSheetByName(ARCHIVE_SHEET_NAME);
  if (!archiveSheet) {
    const headers = sourceSheet.getRange(1, 1, 1, sourceSheet.getLastColumn()).getValues()[0];
    archiveSheet = ss.insertSheet(ARCHIVE_SHEET_NAME);
    archiveSheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight("bold");
    archiveSheet.setFrozenRows(1);
  }
  const data = sourceSheet.getRange(2, 1, sourceSheet.getLastRow() - 1, sourceSheet.getLastColumn()).getValues();
  const cutOffDate = new Date();
  cutOffDate.setDate(cutOffDate.getDate() - 180);
  for (let i = data.length - 1; i >= 0; i--) {
    const rowData = data[i];
    const status = rowData[PR_STATUS_COL - 1];
    const processedDateStr = rowData[PR_NOTIFICATION_COL - 1];
    if (status === STATUS_READY && processedDateStr && processedDateStr.startsWith("Processed on ")) {
      const dateStr = processedDateStr.replace("Processed on ", "");
      const dateParts = dateStr.split('/');
      if (dateParts.length === 3) {
        const processedDate = new Date(parseInt(dateParts[2], 10), parseInt(dateParts[1], 10) - 1, parseInt(dateParts[0], 10));
        if (processedDate < cutOffDate) {
          archiveSheet.appendRow(rowData);
          sourceSheet.deleteRow(i + 2);
        }
      }
    }
  }
}

function reportError(functionName, error, row) {
  try {
    const subject = `Script Error: ${functionName}`;
    const timestamp = Utilities.formatDate(new Date(), "Europe/Dublin", "dd/MM/yyyy HH:mm:ss");
    let body = `An error occurred in <strong>${functionName}</strong> at ${timestamp}.`;
    if (row) body += `<br><br>Related to row <strong>${row}</strong>.`;
    body += `<br><br><strong>Error Details:</strong><br>Name: ${error.name}<br>Message: ${error.message}<br>Stack Trace:<br>${error.stack.replace(/\n/g, '<br>')}`;
    MailApp.sendEmail(ADMIN_EMAIL, subject, "", { htmlBody: body });
  } catch (e) {
    Logger.log(`Could not send error report. Original error in ${functionName}: ${error.message}. Report error: ${e.message}`);
  }
}
