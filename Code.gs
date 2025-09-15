// --- 1. FINAL CORRECT CONFIGURATION ---
const SHEET_NAME = "Form responses 1";
const EMAIL_COL = 2;       // Patient Email is in Column B
const PHARMACY_COL = 3;    // Chosen Pharmacy is in Column C
const NAME_COL = 4;        // Patient's Full Name is in Column D
const PHONE_COL = 6;       // Contact Number is in Column F
const COMM_PREF_COL = 9;   // Communication Preference is in Column I
const STATUS_COL = 10;     // Status is in Column J
const MEDS_COL = 8;        // Medication List is in Column H
const NOTIFICATION_COL = 11; // Notification Sent is in Column K

// --- SCRIPT SETTINGS ---
const SENDER_NAME = "Carndonagh Health Centre";
const YOUR_PHONE_NUMBER = "074-93-74242";
const ADMIN_EMAIL = "patricknoone+surgery@gmail.com";
const STATUS_QUERY = "Query - Please Contact Us";
const STATUS_READY = "Sent to Pharmacy";
const FOOTER = `<p style="font-size:0.9em; color:#666;"><i>Please note: This is an automated message and this email address is not monitored. For any queries, please contact the surgery by phone at ${YOUR_PHONE_NUMBER}.</i></p>`;

// --- CORE, AUTOMATED FUNCTIONS ---

/**
 * Creates a custom menu in the Google Sheet UI when the spreadsheet is opened.
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  const menu = ui.createMenu('Surgery Tools');

  menu.addItem('Send Patient Notification', 'sendDynamicNotification');
  menu.addSeparator();

  const statusMenu = ui.createMenu('Set Status');
  statusMenu.addItem("Mark as 'Sent to Pharmacy'", 'setStatusReady');
  statusMenu.addItem("Mark as 'Query'", 'setStatusQuery');

  menu.addSubMenu(statusMenu);
  menu.addToUi();
}

/**
 * Sets the status of the selected row(s) to 'Sent to Pharmacy'.
 */
function setStatusReady() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const range = sheet.getActiveRange();
  if (range.getRow() < 2) {
    SpreadsheetApp.getUi().alert("Please select one or more patient rows first (row 2 or below).");
    return;
  }
  range.getSheet().getRange(range.getRow(), STATUS_COL, range.getNumRows(), 1).setValue(STATUS_READY);
}

/**
 * Sets the status of the selected row(s) to 'Query - Please Contact Us'.
 */
function setStatusQuery() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const range = sheet.getActiveRange();
  if (range.getRow() < 2) {
    SpreadsheetApp.getUi().alert("Please select one or more patient rows first (row 2 or below).");
    return;
  }
  range.getSheet().getRange(range.getRow(), STATUS_COL, range.getNumRows(), 1).setValue(STATUS_QUERY);
}

/**
 * Runs when a cell is edited. Handles automated status-change notifications.
 */
function onEdit(e) {
  try {
    const range = e.range;
    const sheet = range.getSheet();
    const row = range.getRow();

    // Exit if the sheet is not the target sheet, or the edited column isn't STATUS_COL, or it's the header row
    if (sheet.getName() !== SHEET_NAME || range.getColumn() !== STATUS_COL || row < 2) {
      return;
    }

    const status = range.getValue().toString().trim();
    const patientEmail = sheet.getRange(row, EMAIL_COL).getValue();
    const patientName = sheet.getRange(row, NAME_COL).getValue();

    if (status === STATUS_QUERY) {
      if (!patientEmail) return; // Exit if no email for a query status
      const subject = "Action Required: Query Regarding Your Prescription Request";
      const body = `<p>Dear ${patientName},</p><p>Regarding your prescription request, we have a query that needs to be resolved.</p><p>Please contact the surgery by phone at <strong>${YOUR_PHONE_NUMBER}</strong>.</p><p>Thank you,</p><p><strong>${SENDER_NAME}</strong></p><hr>${FOOTER}`;
      MailApp.sendEmail({ to: patientEmail, subject: subject, htmlBody: body, name: SENDER_NAME });

    } else if (status === STATUS_READY) {
      const commPref = sheet.getRange(row, COMM_PREF_COL).getValue().toLowerCase();

      if (commPref === 'whatsapp') {
        const staffEmail = e.user.getEmail();
        sendWhatsAppLinkToStaff(row, staffEmail);
      } else { // Default to Email
        sendReadyEmail(row);
      }
    }
  } catch (err) {
    reportError('onEdit', err, e.range ? e.range.getRow() : null);
  }
}

/**
 * Triggered on form submission. This function reformats the medication list
 * from a single-line string with delimiters into a clean, multi-line list in the sheet.
 *
 * TO SET UP: In the Apps Script editor, go to Triggers > Add Trigger.
 * Choose 'onFormSubmit' as the function to run, 'From spreadsheet' as the event source,
 * and 'On form submit' as the event type.
 */
function onFormSubmit(e) {
  try {
    const range = e.range;
    const sheet = range.getSheet();
    const row = range.getRow();

    // --- Back-End Validation ---
    const patientName = e.values[NAME_COL - 1];
    const patientEmail = e.values[EMAIL_COL - 1];
    if (!patientName || !patientEmail) {
      let message = `A new prescription request was submitted in row ${row} but was missing essential information.`;
      if (!patientName) message += "\n- Patient Name is missing.";
      if (!patientEmail) message += "\n- Patient Email is missing.";
      MailApp.sendEmail(ADMIN_EMAIL, "Prescription Request Validation Error", message);
      return; // Stop processing
    }

    // --- Send initial confirmation email ---
    const commPref = e.values[COMM_PREF_COL - 1];
    sendConfirmationNotification(patientName, patientEmail, commPref);

    // --- Format medication list ---
    const medicationsRaw = e.values[MEDS_COL - 1];
    if (typeof medicationsRaw === 'string' && medicationsRaw.includes("~")) {
      let medListSheet = [];
      const meds = medicationsRaw.split("|");
      meds.forEach(med => {
        const details = med.split("~");
        medListSheet.push(`${details[0] || ''} - ${details[1] || ''} (${details[2] || ''})`);
      });
      sheet.getRange(row, MEDS_COL).setValue(medListSheet.join("\n"));
    }

    // It's recommended to rename the 'Notification Sent' column to 'Row Processed At'.
    const timestamp = new Date().toLocaleString('en-IE', { timeZone: 'Europe/Dublin' });
    sheet.getRange(row, NOTIFICATION_COL).setValue("Processed at " + timestamp);
  } catch (err) {
    reportError('onFormSubmit', err, e.range ? e.range.getRow() : null);
  }
}

// --- MANUAL NOTIFICATION FUNCTIONS (from 'Surgery Tools' menu) ---

/**
 * Checks the selected row's preference and calls the appropriate notification function.
 */
function sendDynamicNotification() {
  const ui = SpreadsheetApp.getUi();
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const range = sheet.getActiveRange();
  const row = range.getRow();

  if (row < 2) {
    ui.alert("Please select a patient row first (row 2 or below).");
    return;
  }

  const commPref = sheet.getRange(row, COMM_PREF_COL).getValue().toLowerCase();

  if (commPref === 'whatsapp') {
    generateWhatsAppLink();
  } else {
    showEmailDialog();
  }
}

/**
 * Displays a dialog with the email preview and a "Send" button.
 */
function showEmailDialog() {
  const ui = SpreadsheetApp.getUi();
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const range = sheet.getActiveRange();
  const row = range.getRow();

  const patientName = sheet.getRange(row, NAME_COL).getValue();
  const patientEmail = sheet.getRange(row, EMAIL_COL).getValue();
  const pharmacy = sheet.getRange(row, PHARMACY_COL).getValue();

  if (!patientEmail) {
    ui.alert(`No email address found in row ${row} for ${patientName}.`);
    return;
  }

  const subject = `Your Prescription has been sent to ${pharmacy}`;
  const body = `Dear ${patientName},<br><br>This is a message to let you know that your recent prescription request has been processed and sent to your chosen pharmacy: <strong>${pharmacy}</strong>.<br><br>Please contact your pharmacy directly to confirm when your medication will be ready for collection.<br><br>Thank you,<br><strong>${SENDER_NAME}</strong>`;

  const html = `
    <div style="font-family: sans-serif;">
      <h3>Preview Email to ${patientName}</h3>
      <p><b>To:</b> ${patientEmail}</p>
      <p><b>Subject:</b> ${subject}</p>
      <hr>
      <div style="border: 1px solid #ccc; padding: 10px; border-radius: 5px; background-color:#f9f9f9;">${body}</div>
      <br><br>
      <button onclick="google.script.run.withSuccessHandler(google.script.host.close).sendEmailFromDialog(${row});" style="background-color:#28a745;color:white;padding:8px 15px;border:none;border-radius:4px;font-size:14px;cursor:pointer;">Send Email</button>
      <button onclick="google.script.host.close()" style="padding:8px 15px;border:1px solid #ccc;border-radius:4px;font-size:14px;cursor:pointer;">Cancel</button>
    </div>
  `;

  const htmlOutput = HtmlService.createHtmlOutput(html).setWidth(500).setHeight(400);
  ui.showModalDialog(htmlOutput, `Confirm Email to ${patientName}`);
}

/**
 * Sends the email when the "Send Email" button in the dialog is clicked.
 */
function sendEmailFromDialog(row) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  try {
    const patientName = sheet.getRange(row, NAME_COL).getValue();
    const patientEmail = sheet.getRange(row, EMAIL_COL).getValue();
    const pharmacy = sheet.getRange(row, PHARMACY_COL).getValue();

    const subject = `Your Prescription has been sent to ${pharmacy}`;
    const body = `<p>Dear ${patientName},</p><p>This is a message to let you know that your recent prescription request has been processed and sent to your chosen pharmacy: <strong>${pharmacy}</strong>.</p><p>Please contact your pharmacy directly to confirm when your medication will be ready for collection.</p><p>Thank you,</p><p><strong>${SENDER_NAME}</strong></p><hr>${FOOTER}`;

    MailApp.sendEmail({ to: patientEmail, subject: subject, htmlBody: body, name: SENDER_NAME });
  } catch (e) {
    Logger.log(`Error sending email from dialog for row ${row}: ${e.toString()}`);
    SpreadsheetApp.getUi().alert("Failed to send email. Please check the logs for details.");
  }
}

/**
 * Generates and displays a WhatsApp "click to send" link for the currently selected row.
 */
function generateWhatsAppLink() {
  const ui = SpreadsheetApp.getUi();
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const range = sheet.getActiveRange();
  const row = range.getRow();

  const patientName = sheet.getRange(row, NAME_COL).getValue();
  const patientPhone = sheet.getRange(row, PHONE_COL).getValue();
  const pharmacy = sheet.getRange(row, PHARMACY_COL).getValue();

  if (!patientPhone) {
    ui.alert(`No phone number found in row ${row} for ${patientName}.`);
    return;
  }

  const whatsappNumber = "353" + patientPhone.toString().replace(/\s/g, '').substring(1);
  const prefilledMessage = encodeURIComponent(`Hi ${patientName}, this is a message from ${SENDER_NAME}. Your prescription has been sent to ${pharmacy}. Please contact them directly to arrange collection.`);
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${prefilledMessage}`;

  const htmlOutput = HtmlService.createHtmlOutput(
      `<h3>Send Notification to ${patientName}</h3><p>Click the link below to open WhatsApp on your device.</p><p><a href="${whatsappUrl}" target="_blank" style="font-size:1.2em;">Open WhatsApp</a></p>`
    ).setWidth(350).setHeight(150);
  ui.showModalDialog(htmlOutput, 'WhatsApp Notification Link');
}

// --- HELPER FUNCTIONS (called by automated triggers) ---

/**
 * Sends an initial confirmation email to the patient when their form is submitted.
 */
function sendConfirmationNotification(patientName, patientEmail, commPref) {
  if (!patientEmail) {
    Logger.log(`Request received for ${patientName}, but no email address was provided. Cannot send confirmation.`);
    return;
  }

  const subject = "Confirmation: We've Received Your Prescription Request";
  const preferredMethod = (commPref && commPref.toLowerCase() === 'whatsapp') ? 'WhatsApp' : 'Email';

  const body = `
    <p>Dear ${patientName},</p>
    <p>Thank you for your repeat prescription request. This email is to confirm that we have successfully received it and it is now in our queue for processing by our staff.</p>
    <p>You do not need to take any further action at this time.</p>
    <p>You will receive a final notification by <strong>${preferredMethod}</strong> once your prescription has been reviewed and sent to your chosen pharmacy.</p>
    <p>Thank you,</p>
    <p><strong>${SENDER_NAME}</strong></p>
    <hr>
    ${FOOTER}
  `;

  try {
    MailApp.sendEmail({
      to: patientEmail,
      subject: subject,
      htmlBody: body,
      name: SENDER_NAME
    });
  } catch (e) {
    Logger.log(`Failed to send confirmation email to ${patientEmail} for ${patientName}. Error: ${e.toString()}`);
  }
}

/**
 * Sends the "prescription ready" email directly to the patient.
 */
function sendReadyEmail(row) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const patientName = sheet.getRange(row, NAME_COL).getValue();
  const patientEmail = sheet.getRange(row, EMAIL_COL).getValue();
  const pharmacy = sheet.getRange(row, PHARMACY_COL).getValue();

  if (!patientEmail) {
    Logger.log(`Email not sent for row ${row}: No email address found for ${patientName}.`);
    return;
  }

  const subject = `Your Prescription has been sent to ${pharmacy}`;
  const body = `<p>Dear ${patientName},</p><p>This is a message to let you know that your recent prescription request has been processed and sent to your chosen pharmacy: <strong>${pharmacy}</strong>.</p><p>Please contact your pharmacy directly to confirm when your medication will be ready for collection.</p><p>Thank you,</p><p><strong>${SENDER_NAME}</strong></p><hr>${FOOTER}`;

  try {
    MailApp.sendEmail({ to: patientEmail, subject: subject, htmlBody: body, name: SENDER_NAME });
  } catch (e) {
    Logger.log(`Error sending READY email for row ${row}: ${e.toString()}`);
  }
}

/**
 * Generates a WhatsApp "click to send" link and emails it to the staff member who triggered the onEdit event.
 */
function sendWhatsAppLinkToStaff(row, staffEmail) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const patientName = sheet.getRange(row, NAME_COL).getValue();
  const patientPhone = sheet.getRange(row, PHONE_COL).getValue();
  const pharmacy = sheet.getRange(row, PHARMACY_COL).getValue();

  if (!patientPhone) {
    const message = `Could not generate WhatsApp link for ${patientName} (row ${row}) because their phone number is missing. Please update the sheet and send the notification manually via the 'Surgery Tools' menu.`;
    try {
      MailApp.sendEmail({ to: staffEmail, subject: "Action Required: Missing Phone Number", body: message });
    } catch (e) {
      Logger.log(`Error sending 'missing phone number' email to staff for row ${row}: ${e.toString()}`);
    }
    return;
  }

  try {
    const whatsappNumber = "353" + patientPhone.toString().replace(/\s/g, '').substring(1);
    const prefilledMessage = encodeURIComponent(`Hi ${patientName}, this is a message from ${SENDER_NAME}. Your prescription has been sent to ${pharmacy}. Please contact them directly to arrange collection.`);
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${prefilledMessage}`;

    const subject = `Action Required: Send WhatsApp to ${patientName}`;
    const body = `
      <p>Hi,</p>
      <p>Please send the prescription notification to <strong>${patientName}</strong> by clicking the link below. This will open WhatsApp on your device with a pre-filled message.</p>
      <p><a href="${whatsappUrl}" target="_blank" style="font-size:1.2em; font-weight:bold; color: #25D366;">Click Here to Send WhatsApp Message</a></p>
      <p>If the link does not work, please contact them manually.</p>
      <p>Thank you.</p>
    `;

    MailApp.sendEmail({ to: staffEmail, subject: subject, htmlBody: body });
  } catch (e) {
    Logger.log(`Error sending WhatsApp link to staff for row ${row}: ${e.toString()}`);
  }
}

/**
 * Emails a detailed error report to the admin.
 * @param {string} functionName - The name of the function where the error occurred.
 * @param {Error} error - The error object.
 * @param {number} [row] - The row number associated with the error, if applicable.
 */
function reportError(functionName, error, row) {
  try {
    const subject = `Prescription Script Error: ${functionName}`;
    let body = `An error occurred in the function <strong>${functionName}</strong> at ${new Date().toLocaleString('en-IE', { timeZone: 'Europe/Dublin' })}.`;
    if (row) {
      body += `<br><br>The error was related to row <strong>${row}</strong>.`;
    }
    body += `<br><br><strong>Error Details:</strong><br>Name: ${error.name}<br>Message: ${error.message}<br>Stack Trace:<br>${error.stack.replace(/\n/g, '<br>')}`;
    MailApp.sendEmail(ADMIN_EMAIL, subject, "", { htmlBody: body });
  } catch (e) {
    Logger.log(`Could not send error report email. Original error in ${functionName}: ${error.message}. Error sending report: ${e.message}`);
  }
}

/**
 * Moves rows with a 'Sent to Pharmacy' status older than 180 days to an 'Archive' sheet.
 * This function should be run on a time-based trigger (e.g., weekly).
 *
 * TO SET UP:
 * 1. Create a new sheet in your spreadsheet named "Archive".
 * 2. In the Apps Script editor, go to Triggers > Add Trigger.
 *    - Choose 'archiveOldRequests' as the function to run.
 *    - Choose 'Time-driven' as the event source.
 *    - Select 'Week timer' and a time that suits you (e.g., 'Every Monday', '1am to 2am').
 */
function archiveOldRequests() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sourceSheet = ss.getSheetByName(SHEET_NAME);
    let archiveSheet = ss.getSheetByName("Archive");

    // Create archive sheet if it doesn't exist
    if (!archiveSheet) {
      archiveSheet = ss.insertSheet("Archive");
      // Copy headers to the archive sheet
      sourceSheet.getRange(1, 1, 1, sourceSheet.getLastColumn()).copyTo(archiveSheet.getRange(1, 1));
      Logger.log("Created 'Archive' sheet.");
    }

    const dataRange = sourceSheet.getRange(2, 1, sourceSheet.getLastRow() - 1, sourceSheet.getLastColumn());
    const data = dataRange.getValues();
    const today = new Date();
    const cutOffDate = new Date(today.setDate(today.getDate() - 180));

    // Iterate backwards to safely delete rows
    for (let i = data.length - 1; i >= 0; i--) {
      const rowData = data[i];
      const status = rowData[STATUS_COL - 1];
      const processedDateStr = rowData[NOTIFICATION_COL - 1]; // "Processed at 14/09/2025, 16:16:04"

      if (status === STATUS_READY && processedDateStr) {
        // Attempt to parse the date from the string. This is brittle and depends on the locale format.
        // A more robust solution would store dates in a standard format or as a Date object directly.
        const dateParts = processedDateStr.replace("Processed at ", "").split(',')[0].split('/');
        if (dateParts.length === 3) {
          // Format is likely DD/MM/YYYY
          const processedDate = new Date(dateParts[2], dateParts[1] - 1, dateParts[0]);
          if (processedDate < cutOffDate) {
            const rowToDelete = i + 2; // +2 because data is 0-indexed and sheet is 1-indexed from row 2
            archiveSheet.appendRow(rowData);
            sourceSheet.deleteRow(rowToDelete);
            Logger.log(`Archived row ${rowToDelete}.`);
          }
        }
      }
    }
  } catch (err) {
    reportError('archiveOldRequests', err, null);
  }
}
