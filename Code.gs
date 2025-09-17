// --- 1. CONFIGURATION & CONSTANTS ---
const PRESCRIPTIONS_SHEET_NAME = "Form responses 1";
const MESSAGES_SHEET_NAME = "Messages";
const ARCHIVE_SHEET_NAME = "Archive";
const PR_EMAIL_COL = 2; const PR_PHARMACY_COL = 3; const PR_NAME_COL = 4; const PR_PHONE_COL = 6; const PR_MEDS_COL = 8; const PR_COMM_PREF_COL = 9; const PR_STATUS_COL = 10; const PR_NOTIFICATION_COL = 11;
const MSG_ID_COL = 1; const MSG_TIMESTAMP_COL = 2; const MSG_PATIENT_NAME_COL = 3; const MSG_PATIENT_DOB_COL = 4; const MSG_PATIENT_EMAIL_COL = 5; const MSG_INITIAL_MESSAGE_COL = 6; const MSG_CONVERSATION_COL = 7; const MSG_STATUS_COL = 8; const MSG_LAST_UPDATED_COL = 9;
const SENDER_NAME = "Carndonagh Health Centre";
const ADMIN_EMAIL = "patricknoone+surgery@gmail.com";
const STATUS_QUERY = "Query - Please Contact Us";
const STATUS_READY = "Sent to Pharmacy";
const FOOTER = `<p style="font-size:0.9em; color:#666;"><i>Please note: This is an automated message and this email address is not monitored. For any queries, please contact the surgery by phone.</i></p>`;

// --- 2. CORE TRIGGER FUNCTIONS ---
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  setupSheet(ss, MESSAGES_SHEET_NAME, ["Message ID", "Timestamp", "Patient Name", "Patient DOB", "Patient Email", "Initial Message", "Conversation History", "Status", "Last Updated"]);

  const menu = ui.createMenu('Surgery Tools');
  const prescriptionMenu = ui.createMenu('Prescriptions');
  prescriptionMenu.addItem('Send Patient Notification', 'sendPrescriptionNotification');
  prescriptionMenu.addSeparator();
  prescriptionMenu.addItem(`Mark as '${STATUS_READY}'`, 'setPrescriptionStatusReady');
  prescriptionMenu.addItem(`Mark as '${STATUS_QUERY}'`, 'setPrescriptionStatusQuery');
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
    return HtmlService.createHtmlOutputFromFile('message_form')
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

// --- 3. MESSAGING SYSTEM LOGIC & UI ---
function handleNewMessage(data) {
  const messagesSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(MESSAGES_SHEET_NAME);
  const newRow = messagesSheet.getLastRow() + 1;
  const messageId = `MSG-${newRow}`;
  const timestamp = Utilities.formatDate(new Date(), "Europe/Dublin", "dd/MM/yyyy HH:mm:ss");
  messagesSheet.appendRow([messageId, timestamp, data.patientName, data.dob, data.email, data.message, "", "New", timestamp]);
  const subject = `New Patient Message [${messageId}] from ${data.patientName}`;
  const body = `<p>A new message has been submitted.</p><p><strong>From:</strong> ${data.patientName} (${data.email})</p><p><strong>DOB:</strong> ${data.dob}</p><hr><p><strong>Message:</strong></p><p style="white-space: pre-wrap;">${data.message}</p><hr><p>Logged in "Messages" sheet, row ${newRow}.</p>`;
  MailApp.sendEmail(ADMIN_EMAIL, subject, "", { htmlBody: body });
}

function handlePatientReply(data) {
  const messagesSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(MESSAGES_SHEET_NAME);
  const rowNumber = findRowByMessageId(messagesSheet, data.messageId);
  if (rowNumber === -1) throw new Error(`Could not log reply. Message ID "${data.messageId}" not found.`);
  const timestamp = Utilities.formatDate(new Date(), "Europe/Dublin", "dd/MM/yyyy HH:mm:ss");
  const newHistoryEntry = `\n\n--- PATIENT REPLY on ${timestamp} ---\n${data.replyMessage}`;
  messagesSheet.getRange(rowNumber, MSG_CONVERSATION_COL).setValue(messagesSheet.getRange(rowNumber, MSG_CONVERSATION_COL).getValue() + newHistoryEntry);
  messagesSheet.getRange(rowNumber, MSG_STATUS_COL).setValue("Patient Replied");
  messagesSheet.getRange(rowNumber, MSG_LAST_UPDATED_COL).setValue(timestamp);
  const patientName = messagesSheet.getRange(rowNumber, MSG_PATIENT_NAME_COL).getValue();
  const subject = `New Patient Reply [${data.messageId}] from ${patientName}`;
  const body = `<p>Patient <strong>${patientName}</strong> has replied to message <strong>${data.messageId}</strong>.</p><hr><p><strong>Reply:</strong></p><p style="white-space: pre-wrap;">${data.replyMessage}</p><hr><p>Logged in "Messages" sheet, row ${rowNumber}.</p>`;
  MailApp.sendEmail(ADMIN_EMAIL, subject, "", { htmlBody: body });
}

function showMessageReplyDialog() {
  const ui = SpreadsheetApp.getUi();
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  if (sheet.getName() !== MESSAGES_SHEET_NAME) { ui.alert("This function can only be used from the 'Messages' sheet."); return; }
  const range = sheet.getActiveRange();
  const row = range.getRow();
  if (row < 2) { ui.alert("Please select a message row first."); return; }
  const messageId = sheet.getRange(row, MSG_ID_COL).getValue();
  const patientName = sheet.getRange(row, MSG_PATIENT_NAME_COL).getValue();
  const history = sheet.getRange(row, MSG_CONVERSATION_COL).getValue();
  const initialMessage = sheet.getRange(row, MSG_INITIAL_MESSAGE_COL).getValue();
  const fullHistory = `--- ORIGINAL MESSAGE ---\n${initialMessage}\n\n${history}`;
  const html = `<div style="font-family:sans-serif;"><h3>Reply to ${patientName} (${messageId})</h3><h4>History:</h4><div style="background-color:#f5f5f5;padding:8px;border-radius:4px;max-height:150px;overflow-y:auto;white-space:pre-wrap;">${fullHistory.trim()||"No history."}</div><label for="replyText"><b>Your Reply:</b></label><textarea id="replyText" style="width:95%;height:100px;"></textarea><br/><br/><button onclick="sendReply()">Send</button><button onclick="google.script.host.close()">Cancel</button></div><script>function sendReply(){const text=document.getElementById("replyText").value;if(!text.trim())return void alert("Reply cannot be empty.");document.querySelector("button").disabled=!0,google.script.run.withSuccessHandler(google.script.host.close).withFailureHandler((e=>{alert("Failed: "+e.message),google.script.host.close()})).sendReplyFromSheet("${messageId}",text)}</script>`;
  ui.showModalDialog(HtmlService.createHtmlOutput(html).setWidth(600).setHeight(450), `Replying to ${patientName}`);
}

function sendReplyFromSheet(messageId, replyText) {
  try {
    const messagesSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(MESSAGES_SHEET_NAME);
    const rowNumber = findRowByMessageId(messagesSheet, messageId);
    if (rowNumber === -1) throw new Error(`Message ID "${messageId}" not found.`);
    const patientName = messagesSheet.getRange(rowNumber, MSG_PATIENT_NAME_COL).getValue();
    const patientEmail = messagesSheet.getRange(rowNumber, MSG_PATIENT_EMAIL_COL).getValue();
    const timestamp = Utilities.formatDate(new Date(), "Europe/Dublin", "dd/MM/yyyy HH:mm:ss");
    const newHistoryEntry = `\n\n--- STAFF REPLY on ${timestamp} ---\n${replyText}`;
    messagesSheet.getRange(rowNumber, MSG_CONVERSATION_COL).setValue(messagesSheet.getRange(rowNumber, MSG_CONVERSATION_COL).getValue() + newHistoryEntry);
    messagesSheet.getRange(rowNumber, MSG_STATUS_COL).setValue("Replied");
    messagesSheet.getRange(rowNumber, MSG_LAST_UPDATED_COL).setValue(timestamp);
    const webAppUrl = ScriptApp.getService().getUrl();
    const replyLink = `${webAppUrl}?page=reply&id=${messageId}`;
    const subject = `Update on your message [${messageId}]`;
    const body = `<p>Dear ${patientName},</p><p>A member of our staff has replied:</p><div style="background-color:#f4f4f4;padding:15px;border-left:4px solid #009cde;">${replyText}</div><p>If you need to reply, please use the secure link below. **Do not reply to this email.**</p><p><a href="${replyLink}">Click Here to Send a Secure Reply</a></p><br><p>Thank you,<br><strong>${SENDER_NAME}</strong></p><hr>${FOOTER}`;
    MailApp.sendEmail(patientEmail, subject, "", { htmlBody: body, name: SENDER_NAME });
  } catch (err) {
    reportError('sendReplyFromSheet', err, null);
    throw err;
  }
}

function markMessageClosed() {
  const ui = SpreadsheetApp.getUi();
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  if (sheet.getName() !== MESSAGES_SHEET_NAME) { ui.alert("This function can only be used from the 'Messages' sheet."); return; }
  const range = sheet.getActiveRange();
  if (range.getRow() < 2) { ui.alert("Please select one or more message rows first."); return; }
  const timestamp = Utilities.formatDate(new Date(), "Europe/Dublin", "dd/MM/yyyy HH:mm:ss");
  sheet.getRange(range.getRow(), MSG_STATUS_COL, range.getNumRows(), 1).setValue("Closed");
  sheet.getRange(range.getRow(), MSG_LAST_UPDATED_COL, range.getNumRows(), 1).setValue(timestamp);
  ui.toast(`${range.getNumRows()} message(s) marked as Closed.`);
}

function serveReplyPage(messageId) {
  const messagesSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(MESSAGES_SHEET_NAME);
  const rowNumber = findRowByMessageId(messagesSheet, messageId);
  if (rowNumber === -1) return ContentService.createTextOutput("Error: Invalid or expired message link.");
  const initialMessage = `--- ORIGINAL MESSAGE on ${Utilities.formatDate(new Date(messagesSheet.getRange(rowNumber, MSG_TIMESTAMP_COL).getValue()), "Europe/Dublin", "dd/MM/yyyy HH:mm")} ---\n${messagesSheet.getRange(rowNumber, MSG_INITIAL_MESSAGE_COL).getValue()}`;
  const history = messagesSheet.getRange(rowNumber, MSG_CONVERSATION_COL).getValue();
  const conversationHistory = history ? `${initialMessage}\n\n${history}` : initialMessage;
  const template = HtmlService.createTemplateFromFile('reply_form');
  template.messageId = messageId;
  template.conversationHistory = conversationHistory;
  return template.evaluate().setTitle(`Reply to ${messageId}`).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}

// --- 4. PRESCRIPTION WORKFLOW LOGIC ---
function sendPrescriptionNotification() { SpreadsheetApp.getUi().alert("Manual notification feature needs to be fully implemented."); }
function setPrescriptionStatusReady() { setStatus(STATUS_READY); }
function setPrescriptionStatusQuery() { setStatus(STATUS_QUERY); }
function setStatus(e) {
  const t = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  if (t.getName() !== PRESCRIPTIONS_SHEET_NAME) return void SpreadsheetApp.getUi().alert("This function is for the prescriptions sheet.");
  const o = t.getActiveRange();
  if (o.getRow() < 2) return void SpreadsheetApp.getUi().alert("Please select one or more patient rows first.");
  t.getRange(o.getRow(), PR_STATUS_COL, o.getNumRows(), 1).setValue(e);
}
function sendConfirmationNotification(e, t, o) { if (!t) return void Logger.log(`Confirmation not sent for ${e}: No email.`); const a = "Confirmation: We've Received Your Prescription Request", n = o && "whatsapp" === o.toLowerCase() ? "WhatsApp" : "Email", r = `<p>Dear ${e},</p><p>Thank you for your repeat prescription request. This is to confirm we have received it.</p><p>You will receive a final notification by <strong>${n}</strong> once your prescription has been sent to your chosen pharmacy.</p><p>Thank you,<br><strong>${SENDER_NAME}</strong></p><hr>${FOOTER}`; try { MailApp.sendEmail(t, a, "", { htmlBody: r, name: SENDER_NAME }) } catch (e) { Logger.log(`Failed to send confirmation email to ${t}. Error: ${e}`) } }
function sendReadyEmail(e) { const t = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet(), o = t.getRange(e, PR_NAME_COL).getValue(), a = t.getRange(e, PR_EMAIL_COL).getValue(), n = t.getRange(e, PR_PHARMACY_COL).getValue(); if (!a) return; const r = `Your Prescription has been sent to ${n}`, s = `<p>Dear ${o},</p><p>Your recent prescription request has been processed and sent to <strong>${n}</strong>.</p><p>Please contact your pharmacy directly to confirm collection time.</p><p>Thank you,<br><strong>${SENDER_NAME}</strong></p><hr>${FOOTER}`; MailApp.sendEmail(a, r, "", { htmlBody: s, name: SENDER_NAME }) }
function sendQueryEmail(e) { const t = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet(), o = t.getRange(e, PR_NAME_COL).getValue(), a = t.getRange(e, PR_EMAIL_COL).getValue(); if (!a) return; const n = "Action Required: Query Regarding Your Prescription Request", r = `<p>Dear ${o},</p><p>Regarding your prescription request, we have a query that needs to be resolved.</p><p>Please contact the surgery by phone.</p><p>Thank you,</p><p><strong>${SENDER_NAME}</strong></p><hr>${FOOTER}`; MailApp.sendEmail(a, n, "", { htmlBody: r, name: SENDER_NAME }) }
function sendWhatsAppLinkToStaff(e) { const t = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet(), o = t.getRange(e, PR_NAME_COL).getValue(), a = t.getRange(e, PR_PHONE_COL).getValue(), n = t.getRange(e, PR_PHARMACY_COL).getValue(); if (!a) return; const r = Session.getActiveUser().getEmail(), s = `Hi ${o}, this is a message from ${SENDER_NAME}. Your prescription has been sent to ${n}. Please contact them directly to arrange collection.`, i = "353" + a.toString().replace(/\s/g, "").substring(1), d = encodeURIComponent(s), c = `https://wa.me/${i}?text=${d}`, l = `Action Required: Send WhatsApp to ${o}`, u = `<p>Hi,</p><p>Please send the prescription notification to <strong>${o}</strong> by clicking the link below.</p><p><a href="${c}">Click Here to Send WhatsApp Message</a></p>`; MailApp.sendEmail(r, l, "", { htmlBody: u }) }
function archiveOldRequests() { const e = SpreadsheetApp.getActiveSpreadsheet(), t = e.getSheetByName(PRESCRIPTIONS_SHEET_NAME); let o = e.getSheetByName(ARCHIVE_SHEET_NAME); o || (o = setupSheet(e, ARCHIVE_SHEET_NAME, t.getRange(1, 1, 1, t.getLastColumn()).getValues()[0])); const a = t.getRange(2, 1, t.getLastRow() - 1, t.getLastColumn()).getValues(), n = new Date; n.setDate(n.getDate() - 180); for (let e = a.length - 1; e >= 0; e--) { const t = a[e], r = t[PR_STATUS_COL - 1], s = t[PR_NOTIFICATION_COL - 1]; if (r === STATUS_READY && s && s.startsWith("Processed on ")) { const t = s.replace("Processed on ", "").split("/"); if (3 === t.length) { const r = new Date(parseInt(t[2], 10), parseInt(t[1], 10) - 1, parseInt(t[0], 10)); if (r < n) { o.appendRow(a[e]), sourceSheet.deleteRow(e + 2) } } } } }

// --- 5. UTILITY FUNCTIONS ---
function setupSheet(e, t, o) { let a = e.getSheetByName(t); a || (a = e.insertSheet(t), a.getRange(1, 1, 1, o.length).setValues([o]).setFontWeight("bold"), a.setFrozenRows(1)) }
function findRowByMessageId(e, t) { const o = e.getRange(2, 1, e.getLastRow() > 1 ? e.getLastRow() - 1 : 1, 1).getValues(); for (let e = 0; e < o.length; e++)if (o[e][0] === t) return e + 2; return -1 }
function reportError(e, t, o) { try { const a = `Script Error: ${e}`, n = Utilities.formatDate(new Date, "Europe/Dublin", "dd/MM/yyyy HH:mm:ss"); let r = `An error occurred in <strong>${e}</strong> at ${n}.`; o && (r += `<br><br>Related to row <strong>${o}</strong>.`), r += `<br><br><strong>Error Details:</strong><br>Name: ${t.name}<br>Message: ${t.message}<br>Stack Trace:<br>${t.stack.replace(/\n/g, "<br>")}`, MailApp.sendEmail(ADMIN_EMAIL, a, "", { htmlBody: r }) } catch (e) { Logger.log(`Could not send error report. Original error in ${e}: ${t.message}. Report error: ${e.message}`) } }
