// --- 1. CONFIGURATION & CONSTANTS ---
const CONFIG = {
  SHEETS: {
    PRESCRIPTIONS: "Form responses 1",
    MESSAGES: "Messages",
    ARCHIVE: "Archive"
  },
  COLUMN_MAP: {}, // Populated by initializeColumnMap()
  // These indices are for the e.values array from onFormSubmit, based on Google Form question order.
  FORM_SUBMIT_INDICES: {
    EMAIL: 1,       // "Email Address"
    PHARMACY: 2,    // "Your Usual Pharmacy"
    NAME: 3,        // "Patient Name"
    PHONE: 5,       // "Phone number"
    MEDS: 7,        // "Medication Request"
    COMM_PREF: 8,   // "Communication Preference"
  },
  SENDER_NAME: "Carndonagh Health Centre",
  ADMIN_EMAIL: "patricknoone+surgery@gmail.com",
  STATUS_QUERY: "Query - Please Contact Us",
  STATUS_READY: "Sent to Pharmacy",
  FOOTER: `<p style="font-size:0.9em; color:#666;"><i>Please note: This is an automated message and this email address is not monitored. For any queries, please contact the surgery by phone.</i></p>`
};

// --- 2. CORE TRIGGER FUNCTIONS ---
function onOpen() {
  initializeColumnMap(); // Initialize dynamic column mapping
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  setupSheet(ss, CONFIG.SHEETS.MESSAGES, ["Message ID", "Timestamp", "Patient Name", "Patient DOB", "Patient Email", "Initial Message", "Conversation History", "Status", "Last Updated"]);

  const menu = ui.createMenu('Surgery Tools');
  const prescriptionMenu = ui.createMenu('Prescriptions');
  prescriptionMenu.addItem('Send Patient Notification', 'sendPrescriptionNotification');
  prescriptionMenu.addSeparator();
  prescriptionMenu.addItem(`Mark as '${CONFIG.STATUS_READY}'`, 'setPrescriptionStatusReady');
  prescriptionMenu.addItem(`Mark as '${CONFIG.STATUS_QUERY}'`, 'setPrescriptionStatusQuery');
  menu.addSubMenu(prescriptionMenu);
  const messagingMenu = ui.createMenu('Messaging');
  messagingMenu.addItem('Reply to Message', 'showMessageReplyDialog');
  messagingMenu.addItem('Mark Message as Closed', 'markMessageClosed');
  menu.addSubMenu(messagingMenu);
  menu.addToUi();
}

function doGet(e) {
  try {
    const page = e.parameter.page;
    if (page === 'reply') {
      const messageId = e.parameter.id;
      if (!messageId) return ContentService.createTextOutput("Error: Missing message ID.");
      return serveReplyPage(messageId);
    }
    return HtmlService.createHtmlOutputFromFile('index')
        .setTitle("New Message | Carndonagh Health Centre")
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
  } catch (err) {
    reportError('doGet', err, null);
    return ContentService.createTextOutput("An error occurred. The administrator has been notified.");
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    switch (data.formType) {
      case 'newMessage': handleNewMessage(data); break;
      case 'replyMessage': handlePatientReply(data); break;
      default: throw new Error("Invalid form type submitted.");
    }
    return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    reportError('doPost', err, null);
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.message })).setMimeType(ContentService.MimeType.JSON);
  }
}

function onEdit(e) {
  try {
    const range = e.range;
    const sheet = range.getSheet();
    if (sheet.getName() !== CONFIG.SHEETS.PRESCRIPTIONS || !CONFIG.COLUMN_MAP.PRESCRIPTIONS || range.getColumn() !== CONFIG.COLUMN_MAP.PRESCRIPTIONS.STATUS || range.getRow() < 2) return;
    const status = range.getValue().toString().trim();
    if (status === CONFIG.STATUS_READY) {
      const commPref = sheet.getRange(range.getRow(), CONFIG.COLUMN_MAP.PRESCRIPTIONS.COMMUNICATION_PREFERENCE).getValue().toLowerCase();
      if (commPref === 'whatsapp') {
        sendWhatsAppLinkToStaff(range.getRow());
      } else {
        sendReadyEmail(range.getRow());
      }
    } else if (status === CONFIG.STATUS_QUERY) {
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
    const patientName = e.values[CONFIG.FORM_SUBMIT_INDICES.NAME];
    const patientEmail = e.values[CONFIG.FORM_SUBMIT_INDICES.EMAIL];
    sendConfirmationNotification(patientName, patientEmail, e.values[CONFIG.FORM_SUBMIT_INDICES.COMM_PREF]);
    if (!patientName || !patientEmail) {
      reportError('onFormSubmit Validation', new Error(`Missing Name or Email in row ${row}.`), row);
      return;
    }
    const medicationsRaw = e.values[CONFIG.FORM_SUBMIT_INDICES.MEDS];
    if (typeof medicationsRaw === 'string' && medicationsRaw.includes("~")) {
      const medList = medicationsRaw.split("|").map(med => {
        const details = med.split("~");
        return `${details[0] || ''} - ${details[1] || ''} (${details[2] || ''})`;
      }).join("\n");
      sheet.getRange(row, CONFIG.COLUMN_MAP.PRESCRIPTIONS.MEDICATION_REQUEST).setValue(medList);
    }
    sheet.getRange(row, CONFIG.COLUMN_MAP.PRESCRIPTIONS.NOTIFICATION_SENT).setValue(`Processed on ${Utilities.formatDate(new Date(), "Europe/Dublin", "dd/MM/yyyy")}`);
  } catch (err) {
    reportError('onFormSubmit', err, e.range ? e.range.getRow() : null);
  }
}

// --- 3. MESSAGING SYSTEM LOGIC & UI ---
function handleNewMessage(data) {
  const messagesSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEETS.MESSAGES);
  const newRow = messagesSheet.getLastRow() + 1;
  const messageId = `MSG-${newRow}`;
  const timestamp = Utilities.formatDate(new Date(), "Europe/Dublin", "dd/MM/yyyy HH:mm:ss");
  messagesSheet.appendRow([messageId, timestamp, data.patientName, data.dob, data.email, data.message, "", "New", timestamp]);
  const subject = `New Patient Message [${messageId}] from ${data.patientName}`;
  const body = `<p>A new message has been submitted.</p><p><strong>From:</strong> ${escapeHtml(data.patientName)} (${escapeHtml(data.email)})</p><p><strong>DOB:</strong> ${escapeHtml(data.dob)}</p><hr><p><strong>Message:</strong></p><p style="white-space: pre-wrap;">${escapeHtml(data.message)}</p><hr><p>Logged in "Messages" sheet, row ${newRow}.</p>`;
  sendEmail(CONFIG.ADMIN_EMAIL, subject, body);
}

function handlePatientReply(data) {
  const messagesSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEETS.MESSAGES);
  const rowNumber = findRowByMessageId(messagesSheet, data.messageId);
  if (rowNumber === -1) throw new Error(`Could not log reply. Message ID "${data.messageId}" not found.`);
  const timestamp = Utilities.formatDate(new Date(), "Europe/Dublin", "dd/MM/yyyy HH:mm:ss");
  const newHistoryEntry = `\n\n--- PATIENT REPLY on ${timestamp} ---\n${data.replyMessage}`;
  messagesSheet.getRange(rowNumber, CONFIG.COLUMN_MAP.MESSAGES.CONVERSATION_HISTORY).setValue(messagesSheet.getRange(rowNumber, CONFIG.COLUMN_MAP.MESSAGES.CONVERSATION_HISTORY).getValue() + newHistoryEntry);
  messagesSheet.getRange(rowNumber, CONFIG.COLUMN_MAP.MESSAGES.STATUS).setValue("Patient Replied");
  messagesSheet.getRange(rowNumber, CONFIG.COLUMN_MAP.MESSAGES.LAST_UPDATED).setValue(timestamp);
  const patientName = messagesSheet.getRange(rowNumber, CONFIG.COLUMN_MAP.MESSAGES.PATIENT_NAME).getValue();
  const subject = `New Patient Reply [${data.messageId}] from ${patientName}`;
  const body = `<p>Patient <strong>${escapeHtml(patientName)}</strong> has replied to message <strong>${data.messageId}</strong>.</p><hr><p><strong>Reply:</strong></p><p style="white-space: pre-wrap;">${escapeHtml(data.replyMessage)}</p><hr><p>Logged in "Messages" sheet, row ${rowNumber}.</p>`;
  sendEmail(CONFIG.ADMIN_EMAIL, subject, body);
}

function showMessageReplyDialog() {
  const ui = SpreadsheetApp.getUi();
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  if (sheet.getName() !== CONFIG.SHEETS.MESSAGES) { ui.alert("This function can only be used from the 'Messages' sheet."); return; }
  const range = sheet.getActiveRange();
  const row = range.getRow();
  if (row < 2) { ui.alert("Please select a message row first."); return; }

  const messageId = sheet.getRange(row, CONFIG.COLUMN_MAP.MESSAGES.MESSAGE_ID).getValue();
  const patientName = sheet.getRange(row, CONFIG.COLUMN_MAP.MESSAGES.PATIENT_NAME).getValue();
  const history = sheet.getRange(row, CONFIG.COLUMN_MAP.MESSAGES.CONVERSATION_HISTORY).getValue();
  const initialMessage = sheet.getRange(row, CONFIG.COLUMN_MAP.MESSAGES.INITIAL_MESSAGE).getValue();
  const fullHistory = `--- ORIGINAL MESSAGE ---\n${initialMessage}\n\n${history}`;

  const template = HtmlService.createTemplateFromFile('dialog_reply_form');
  template.safePatientName = escapeHtml(patientName);
  template.safeMessageId = escapeHtml(messageId);
  template.safeHistory = escapeHtml(fullHistory);
  template.messageId = messageId; // raw id for the function call

  const htmlOutput = template.evaluate().setWidth(600).setHeight(450);
  ui.showModalDialog(htmlOutput, `Replying to ${patientName}`);
}

function sendReplyFromSheet(messageId, replyText) {
  try {
    const messagesSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEETS.MESSAGES);
    const rowNumber = findRowByMessageId(messagesSheet, messageId);
    if (rowNumber === -1) throw new Error(`Message ID "${messageId}" not found.`);
    const patientName = messagesSheet.getRange(rowNumber, CONFIG.COLUMN_MAP.MESSAGES.PATIENT_NAME).getValue();
    const patientEmail = messagesSheet.getRange(rowNumber, CONFIG.COLUMN_MAP.MESSAGES.PATIENT_EMAIL).getValue();
    const timestamp = Utilities.formatDate(new Date(), "Europe/Dublin", "dd/MM/yyyy HH:mm:ss");
    const newHistoryEntry = `\n\n--- STAFF REPLY on ${timestamp} ---\n${replyText}`;
    messagesSheet.getRange(rowNumber, CONFIG.COLUMN_MAP.MESSAGES.CONVERSATION_HISTORY).setValue(messagesSheet.getRange(rowNumber, CONFIG.COLUMN_MAP.MESSAGES.CONVERSATION_HISTORY).getValue() + newHistoryEntry);
    messagesSheet.getRange(rowNumber, CONFIG.COLUMN_MAP.MESSAGES.STATUS).setValue("Replied");
    messagesSheet.getRange(rowNumber, CONFIG.COLUMN_MAP.MESSAGES.LAST_UPDATED).setValue(timestamp);
    const webAppUrl = ScriptApp.getService().getUrl();
    const replyLink = `${webAppUrl}?page=reply&id=${messageId}`;
    const subject = `Update on your message [${messageId}]`;
    const body = `<p>Dear ${escapeHtml(patientName)},</p><p>A member of our staff has replied:</p><div style="background-color:#f4f4f4;padding:15px;border-left:4px solid #009cde;">${escapeHtml(replyText)}</div><p>If you need to reply, please use the secure link below. **Do not reply to this email.**</p><p><a href="${replyLink}">Click Here to Send a Secure Reply</a></p><br><p>Thank you,<br><strong>${CONFIG.SENDER_NAME}</strong></p><hr>${CONFIG.FOOTER}`;
    sendEmail(patientEmail, subject, body, { name: CONFIG.SENDER_NAME });
  } catch (err) {
    reportError('sendReplyFromSheet', err, null);
    throw err;
  }
}

function markMessageClosed() {
  const ui = SpreadsheetApp.getUi();
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  if (sheet.getName() !== CONFIG.SHEETS.MESSAGES) { ui.alert("This function can only be used from the 'Messages' sheet."); return; }
  const range = sheet.getActiveRange();
  if (range.getRow() < 2) { ui.alert("Please select one or more message rows first."); return; }
  const timestamp = Utilities.formatDate(new Date(), "Europe/Dublin", "dd/MM/yyyy HH:mm:ss");
  sheet.getRange(range.getRow(), CONFIG.COLUMN_MAP.MESSAGES.STATUS, range.getNumRows(), 1).setValue("Closed");
  sheet.getRange(range.getRow(), CONFIG.COLUMN_MAP.MESSAGES.LAST_UPDATED, range.getNumRows(), 1).setValue(timestamp);
  ui.toast(`${range.getNumRows()} message(s) marked as Closed.`);
}

function serveReplyPage(messageId) {
  const messagesSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEETS.MESSAGES);
  const rowNumber = findRowByMessageId(messagesSheet, messageId);
  if (rowNumber === -1) return ContentService.createTextOutput("Error: Invalid or expired message link.");
  const initialMessage = `--- ORIGINAL MESSAGE on ${Utilities.formatDate(new Date(messagesSheet.getRange(rowNumber, CONFIG.COLUMN_MAP.MESSAGES.TIMESTAMP).getValue()), "Europe/Dublin", "dd/MM/yyyy HH:mm")} ---\n${messagesSheet.getRange(rowNumber, CONFIG.COLUMN_MAP.MESSAGES.INITIAL_MESSAGE).getValue()}`;
  const history = messagesSheet.getRange(rowNumber, CONFIG.COLUMN_MAP.MESSAGES.CONVERSATION_HISTORY).getValue();
  const conversationHistory = history ? `${initialMessage}\n\n${history}` : initialMessage;
  const template = HtmlService.createTemplateFromFile('reply');
  template.messageId = messageId;
  template.conversationHistory = escapeHtml(conversationHistory);
  return template.evaluate().setTitle(`Reply to ${messageId}`).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}

// --- 4. PRESCRIPTION WORKFLOW LOGIC ---
function sendPrescriptionNotification() {
  const ui = SpreadsheetApp.getUi();
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  if (sheet.getName() !== CONFIG.SHEETS.PRESCRIPTIONS) {
    ui.alert("This function can only be used from the prescriptions sheet.");
    return;
  }
  const range = sheet.getActiveRange();
  if (range.getNumRows() > 1 || range.getRow() < 2) {
    ui.alert("Please select a single patient row first.");
    return;
  }

  const row = range.getRow();
  const patientName = sheet.getRange(row, CONFIG.COLUMN_MAP.PRESCRIPTIONS.PATIENT_NAME).getValue();
  const patientEmail = sheet.getRange(row, CONFIG.COLUMN_MAP.PRESCRIPTIONS.EMAIL_ADDRESS).getValue();

  if (!patientEmail) {
    ui.alert(`Cannot send notification for ${patientName}: No email address found.`);
    return;
  }

  const response = ui.prompt(
    `Send Custom Notification to ${patientName}`,
    'Enter the message you want to send:',
    ui.ButtonSet.OK_CANCEL
  );

  if (response.getSelectedButton() == ui.Button.OK) {
    const messageText = response.getResponseText();
    if (messageText) {
      const subject = `A message from ${CONFIG.SENDER_NAME}`;
      const body = `<p>Dear ${escapeHtml(patientName)},</p><p>${escapeHtml(messageText)}</p><p>Thank you,<br><strong>${CONFIG.SENDER_NAME}</strong></p><hr>${CONFIG.FOOTER}`;
      sendEmail(patientEmail, subject, body, { name: CONFIG.SENDER_NAME });
      ui.alert("Notification sent successfully.");
    }
  }
}
function setPrescriptionStatusReady() { setStatus(CONFIG.STATUS_READY); }
function setPrescriptionStatusQuery() { setStatus(CONFIG.STATUS_QUERY); }
function setStatus(status) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  if (sheet.getName() !== CONFIG.SHEETS.PRESCRIPTIONS) return void SpreadsheetApp.getUi().alert("This function is for the prescriptions sheet.");
  const range = sheet.getActiveRange();
  if (range.getRow() < 2) return void SpreadsheetApp.getUi().alert("Please select one or more patient rows first.");
  sheet.getRange(range.getRow(), CONFIG.COLUMN_MAP.PRESCRIPTIONS.STATUS, range.getNumRows(), 1).setValue(status);
}
function sendConfirmationNotification(patientName, patientEmail, commPref) {
    if (!patientEmail) {
        Logger.log(`Confirmation not sent for ${patientName}: No email.`);
        return;
    }
    const subject = "Confirmation: We've Received Your Prescription Request";
    const commMethod = commPref && commPref.toLowerCase() === 'whatsapp' ? "WhatsApp" : "Email";
    const body = `<p>Dear ${escapeHtml(patientName)},</p><p>Thank you for your repeat prescription request. This is to confirm we have received it.</p><p>You will receive a final notification by <strong>${commMethod}</strong> once your prescription has been sent to your chosen pharmacy.</p><p>Thank you,<br><strong>${CONFIG.SENDER_NAME}</strong></p><hr>${CONFIG.FOOTER}`;
    sendEmail(patientEmail, subject, body, { name: CONFIG.SENDER_NAME });
}
function sendReadyEmail(row) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const patientName = sheet.getRange(row, CONFIG.COLUMN_MAP.PRESCRIPTIONS.PATIENT_NAME).getValue();
    const patientEmail = sheet.getRange(row, CONFIG.COLUMN_MAP.PRESCRIPTIONS.EMAIL_ADDRESS).getValue();
    const pharmacy = sheet.getRange(row, CONFIG.COLUMN_MAP.PRESCRIPTIONS.YOUR_USUAL_PHARMACY).getValue();
    if (!patientEmail) return;
    const subject = `Your Prescription has been sent to ${escapeHtml(pharmacy)}`;
    const body = `<p>Dear ${escapeHtml(patientName)},</p><p>Your recent prescription request has been processed and sent to <strong>${escapeHtml(pharmacy)}</strong>.</p><p>Please contact your pharmacy directly to confirm collection time.</p><p>Thank you,<br><strong>${CONFIG.SENDER_NAME}</strong></p><hr>${CONFIG.FOOTER}`;
    sendEmail(patientEmail, subject, body, { name: CONFIG.SENDER_NAME });
}
function sendQueryEmail(row) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const patientName = sheet.getRange(row, CONFIG.COLUMN_MAP.PRESCRIPTIONS.PATIENT_NAME).getValue();
    const patientEmail = sheet.getRange(row, CONFIG.COLUMN_MAP.PRESCRIPTIONS.EMAIL_ADDRESS).getValue();
    if (!patientEmail) return;
    const subject = "Action Required: Query Regarding Your Prescription Request";
    const body = `<p>Dear ${escapeHtml(patientName)},</p><p>Regarding your prescription request, we have a query that needs to be resolved.</p><p>Please contact the surgery by phone.</p><p>Thank you,</p><p><strong>${CONFIG.SENDER_NAME}</strong></p><hr>${CONFIG.FOOTER}`;
    sendEmail(patientEmail, subject, body, { name: CONFIG.SENDER_NAME });
}
function sendWhatsAppLinkToStaff(row) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const patientName = sheet.getRange(row, CONFIG.COLUMN_MAP.PRESCRIPTIONS.PATIENT_NAME).getValue();
    const phone = sheet.getRange(row, CONFIG.COLUMN_MAP.PRESCRIPTIONS.PHONE_NUMBER).getValue();
    const pharmacy = sheet.getRange(row, CONFIG.COLUMN_MAP.PRESCRIPTIONS.YOUR_USUAL_PHARMACY).getValue();
    if (!phone) return;
    const staffEmail = Session.getActiveUser().getEmail();
    const message = `Hi ${patientName}, this is a message from ${CONFIG.SENDER_NAME}. Your prescription has been sent to ${pharmacy}. Please contact them directly to arrange collection.`;
    const phoneE164 = "353" + phone.toString().replace(/\s/g, "").substring(1);
    const encodedMessage = encodeURIComponent(message);
    const waLink = `https://wa.me/${phoneE164}?text=${encodedMessage}`;
    const subject = `Action Required: Send WhatsApp to ${escapeHtml(patientName)}`;
    const body = `<p>Hi,</p><p>Please send the prescription notification to <strong>${escapeHtml(patientName)}</strong> by clicking the link below.</p><p><a href="${waLink}">Click Here to Send WhatsApp Message</a></p>`;
    sendEmail(staffEmail, subject, body);
}
function archiveOldRequests() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sourceSheet = ss.getSheetByName(CONFIG.SHEETS.PRESCRIPTIONS);
    let archiveSheet = ss.getSheetByName(CONFIG.SHEETS.ARCHIVE);
    if (!archiveSheet) {
        archiveSheet = setupSheet(ss, CONFIG.SHEETS.ARCHIVE, sourceSheet.getRange(1, 1, 1, sourceSheet.getLastColumn()).getValues()[0]);
    }
    if (!sourceSheet || !CONFIG.COLUMN_MAP.PRESCRIPTIONS) return; // Stop if sheet or columns aren't ready
    const data = sourceSheet.getRange(2, 1, sourceSheet.getLastRow() - 1, sourceSheet.getLastColumn()).getValues();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 180);
    for (let i = data.length - 1; i >= 0; i--) {
        const rowData = data[i];
        const status = rowData[CONFIG.COLUMN_MAP.PRESCRIPTIONS.STATUS - 1];
        const notificationDateStr = rowData[CONFIG.COLUMN_MAP.PRESCRIPTIONS.NOTIFICATION_SENT - 1];
        if (status === CONFIG.STATUS_READY && notificationDateStr && notificationDateStr.startsWith("Processed on ")) {
            const dateParts = notificationDateStr.replace("Processed on ", "").split("/");
            if (dateParts.length === 3) {
                const notificationDate = new Date(parseInt(dateParts[2], 10), parseInt(dateParts[1], 10) - 1, parseInt(dateParts[0], 10));
                if (notificationDate < cutoffDate) {
                    archiveSheet.appendRow(rowData);
                    sourceSheet.deleteRow(i + 2);
                }
            }
        }
    }
}

// --- 5. UTILITY FUNCTIONS ---
function initializeColumnMap() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const getHeaderMap = (sheetName) => {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return null;
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const map = {};
    headers.forEach((header, i) => {
      const key = header.toString().trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_');
      map[key] = i + 1; // 1-based index for getRange
    });
    return map;
  };
  CONFIG.COLUMN_MAP.PRESCRIPTIONS = getHeaderMap(CONFIG.SHEETS.PRESCRIPTIONS);
  CONFIG.COLUMN_MAP.MESSAGES = getHeaderMap(CONFIG.SHEETS.MESSAGES);
}

function setupSheet(ss, sheetName, headers) {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
        sheet = ss.insertSheet(sheetName);
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight("bold");
        sheet.setFrozenRows(1);
    }
}
function findRowByMessageId(sheet, messageId) {
    if (!CONFIG.COLUMN_MAP.MESSAGES) return -1; // Ensure map is initialized
    const data = sheet.getRange(2, CONFIG.COLUMN_MAP.MESSAGES.MESSAGE_ID, sheet.getLastRow() > 1 ? sheet.getLastRow() - 1 : 1, 1).getValues();
    for (let i = 0; i < data.length; i++) {
        if (data[i][0] === messageId) {
            return i + 2;
        }
    }
    return -1;
}

function sendErrorReport(subject, body) {
    try {
        MailApp.sendEmail(CONFIG.ADMIN_EMAIL, subject, "", { htmlBody: body });
    } catch (e) {
        Logger.log(`CRITICAL: Failed to send error report email. Subject: ${subject}. Error: ${e.message}`);
    }
}

function reportError(functionName, error, row) {
    const subject = `Script Error: ${functionName}`;
    const timestamp = Utilities.formatDate(new Date(), "Europe/Dublin", "dd/MM/yyyy HH:mm:ss");
    let body = `An error occurred in <strong>${functionName}</strong> at ${timestamp}.`;
    if (row) {
        body += `<br><br>Related to row <strong>${row}</strong>.`;
    }
    body += `<br><br><strong>Error Details:</strong><br>Name: ${error.name}<br>Message: ${error.message}<br>Stack Trace:<br>${(error.stack || '').replace(/\n/g, "<br>")}`;
    sendErrorReport(subject, body);
}

function escapeHtml(unsafe) {
  if (unsafe === null || unsafe === undefined) {
    return "";
  }
  return unsafe
      .toString()
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
}

function sendEmail(recipient, subject, htmlBody, options) {
  try {
    const defaultOptions = { htmlBody: htmlBody };
    const finalOptions = { ...defaultOptions, ...options };
    MailApp.sendEmail(recipient, subject, "", finalOptions);
  } catch (e) {
    if (recipient !== CONFIG.ADMIN_EMAIL) {
      reportError(`sendEmail to ${recipient}`, e, null);
    } else {
      Logger.log(`Failed to send email to admin. Error: ${e.message}`);
    }
  }
}
