const CONFIG = {
  SHEETS: { PRESCRIPTIONS: "Form responses 1", MESSAGES: "Messages", ARCHIVE: "Archive", APPOINTMENTS: "Appointments" },
  COLUMN_MAP: {},
  SENDER_NAME: "Carndonagh Health Centre",
  ADMIN_EMAIL: "patricknoone+surgery@gmail.com",
  STATUSES: { QUERY: "Query - Please Contact Us", READY: "Sent to Pharmacy", NEW: "New", REPLIED: "Replied", PATIENT_REPLIED: "Patient Replied", CLOSED: "Closed", COMM_WHATSAPP: "whatsapp", COMM_EMAIL: "Email", PROCESSED_PREFIX: "Processed on " },
  DATE_FORMAT: "yyyy-MM-dd",
  FOOTER: `<p style=\"font-size:0.9em; color:#666;\"><i>Please note: This is an automated message and this email address is not monitored. For any queries, please contact the surgery by phone.</i></p>`
};
function doGet(e) {
  const page = e.parameter.page || 'index';
  const template = HtmlService.createTemplateFromFile('page');
  const validPages = ['index', 'services', 'book-appointment', 'contact', 'prices', 'new-message', 'reply', 'prescription_form'];
  let contentFile = 'content_index.html';
  if (validPages.indexOf(page) !== -1) {
    contentFile = `content_${page}.html`;
  }
  template.pageContent = HtmlService.createTemplateFromFile(contentFile).getRawContent();
  template.urlParams = e.parameter;
  return template.evaluate().setTitle("Carndonagh Health Centre").setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}
function include(filename) { return HtmlService.createTemplateFromFile(filename).getRawContent(); }
function onOpen() {
  initializeColumnMap();
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  setupSheet(ss, CONFIG.SHEETS.MESSAGES, ["Message ID", "Timestamp", "Patient Name", "Patient DOB", "Patient Email", "Recipient", "Initial Message", "Conversation History", "Status", "Last Updated"]);
  setupSheet(ss, CONFIG.SHEETS.APPOINTMENTS, ["Booking ID", "Timestamp", "Patient Name", "DOB", "Phone", "Email", "Appointment Type", "Preferred Date", "Preferred Time", "Notes", "Status"]);
  const menu = ui.createMenu('Surgery Tools');
  const prescriptionMenu = ui.createMenu('Prescriptions');
  prescriptionMenu.addItem('Send Patient Notification', 'sendPrescriptionNotification');
  prescriptionMenu.addSeparator();
  prescriptionMenu.addItem(`Mark as '${CONFIG.STATUSES.READY}'`, 'setPrescriptionStatusReady');
  prescriptionMenu.addItem(`Mark as '${CONFIG.STATUSES.QUERY}'`, 'setPrescriptionStatusQuery');
  menu.addSubMenu(prescriptionMenu);
  const messagingMenu = ui.createMenu('Messaging');
  messagingMenu.addItem('Reply to Message', 'showMessageReplyDialog');
  messagingMenu.addItem('Mark Message as Closed', 'markMessageClosed');
  menu.addSubMenu(messagingMenu);
  menu.addToUi();
}
function handleAppointmentBooking(data) {
  try {
    Logger.log(`Handling appointment booking for: ${data.name}`);
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEETS.APPOINTMENTS);
    const newRow = sheet.getLastRow() + 1;
    const bookingId = `BK-${newRow}`;
    const timestamp = new Date();
    const newRowData = [bookingId, timestamp, data.name, data.dob, data.phone, data.email, data.appointmentType, data.preferredDate, data.timePreference, data.notes, "Pending Confirmation"];
    sheet.appendRow(newRowData);
    const subject = `New Appointment Request [${bookingId}] from ${data.name}`;
    const body = `<p>A new appointment request has been submitted.</p><p><strong>Name:</strong> ${escapeHtml(data.name)}</p><p><strong>Phone:</strong> ${escapeHtml(data.phone)}</p><p><strong>Appointment Type:</strong> ${escapeHtml(data.appointmentType)}</p><p><strong>Preferred Date:</strong> ${escapeHtml(data.preferredDate)} (${escapeHtml(data.timePreference)})</p><hr><p><strong>Notes:</strong></p><p style=\"white-space: pre-wrap;\">${escapeHtml(data.notes)}</p><hr><p>Logged in \"Appointments\" sheet, row ${newRow}.</p>`;
    sendEmail(CONFIG.ADMIN_EMAIL, subject, body);
    return { status: 'success', message: 'Appointment booked successfully.' };
  } catch (err) {
    Logger.log(`Error in handleAppointmentBooking: ${err.message}\nStack: ${err.stack}`);
    reportError('handleAppointmentBooking', err, { data: data });
    throw new Error(`Failed to book appointment: ${err.message}`);
  }
}
function handlePrescriptionSubmission(data) {
  try {
    if (!data.name || !data.email) { throw new Error("Patient name and email are required."); }
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEETS.PRESCRIPTIONS);
    if (!sheet) { throw new Error(`Sheet \"${CONFIG.SHEETS.PRESCRIPTIONS}\" not found.`); }
    if (!CONFIG.COLUMN_MAP.PRESCRIPTIONS || Object.keys(CONFIG.COLUMN_MAP.PRESCRIPTIONS).length === 0) { initializeColumnMap(); }
    const columnMap = CONFIG.COLUMN_MAP.PRESCRIPTIONS;
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const newRow = new Array(headers.length).fill('');
    const medList = parseMedicationString(data.meds || '');
    const processedStatus = `${CONFIG.STATUSES.PROCESSED_PREFIX}${Utilities.formatDate(new Date(), "Europe/Dublin", CONFIG.DATE_FORMAT)}`;
    if (columnMap.TIMESTAMP) newRow[columnMap.TIMESTAMP - 1] = new Date();
    if (columnMap.EMAIL_ADDRESS) newRow[columnMap.EMAIL_ADDRESS - 1] = data.email;
    if (columnMap.YOUR_USUAL_PHARMACY) newRow[columnMap.YOUR_USUAL_PHARMACY - 1] = data.pharmacy;
    if (columnMap.PATIENT_NAME) newRow[columnMap.PATIENT_NAME - 1] = data.name;
    if (columnMap.PHONE_NUMBER) newRow[columnMap.PHONE_NUMBER - 1] = data.phone;
    if (columnMap.DATE_OF_BIRTH) newRow[columnMap.DATE_OF_BIRTH - 1] = data.dob;
    if (columnMap.I_AM_ORDERING_FOR) newRow[columnMap.I_AM_ORDERING_FOR - 1] = data.orderingFor;
    if (columnMap.MEDICATION_REQUEST) newRow[columnMap.MEDICATION_REQUEST - 1] = medList;
    if (columnMap.COMMUNICATION_PREFERENCE) newRow[columnMap.COMMUNICATION_PREFERENCE - 1] = data.commPref;
    if (columnMap.NOTIFICATION_SENT) newRow[columnMap.NOTIFICATION_SENT - 1] = processedStatus;
    sheet.appendRow(newRow);
    sendConfirmationNotification(data.name, data.email, data.commPref);
    return { status: 'success', message: 'Prescription submitted successfully.' };
  } catch (err) {
    Logger.log(`Error in handlePrescriptionSubmission: ${err.message}\nStack: ${err.stack}`);
    reportError('handlePrescriptionSubmission', err, { data: data });
    throw new Error(`Failed to submit prescription: ${err.message}`);
  }
}
function parseMedicationString(medicationsRaw) {
  if (typeof medicationsRaw !== 'string' || !medicationsRaw.includes("~")) { return null; }
  return medicationsRaw.split("|").map(med => {
    const details = med.split("~");
    const medName = details[0] || '';
    const dosage = details[1] || '';
    const frequency = details[2] || '';
    return `${medName} - ${dosage} (${frequency})`;
  }).join("\n");
}
function handleNewMessage(data) {
  try {
    const messagesSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEETS.MESSAGES);
    const newRow = messagesSheet.getLastRow() + 1;
    const messageId = `MSG-${newRow}`;
    const timestamp = Utilities.formatDate(new Date(), "Europe/Dublin", "dd/MM/yyyy HH:mm:ss");
    const newRowData = [messageId, timestamp, data.patientName, data.dob, data.email, data.recipient, data.message, "", CONFIG.STATUSES.NEW, timestamp];
    messagesSheet.appendRow(newRowData);
    const subject = `New Patient Message [${messageId}] from ${data.patientName} for ${data.recipient}`;
    const body = `<p>A new message has been submitted.</p><p><strong>To:</strong> ${escapeHtml(data.recipient)}</p><p><strong>From:</strong> ${escapeHtml(data.patientName)} (${escapeHtml(data.email)})</p><p><strong>DOB:</strong> ${escapeHtml(data.dob)}</p><hr><p><strong>Message:</strong></p><p style=\"white-space: pre-wrap;\">${escapeHtml(data.message)}</p><hr><p>Logged in \"Messages\" sheet, row ${newRow}.</p>`;
    sendEmail(CONFIG.ADMIN_EMAIL, subject, body);
    return { status: 'success', message: 'Message sent successfully.' };
  } catch (err) {
    Logger.log(`Error in handleNewMessage: ${err.message}\nStack: ${err.stack}`);
    reportError('handleNewMessage', err, { data: data });
    throw new Error(`Failed to send message: ${err.message}`);
  }
}
function handlePatientReply(data) {
  try {
    const messagesSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEETS.MESSAGES);
    const rowNumber = findRowByMessageId(messagesSheet, data.messageId);
    if (rowNumber === -1) throw new Error(`Could not log reply. Message ID \"${data.messageId}\" not found.`);
    const timestamp = Utilities.formatDate(new Date(), "Europe/Dublin", "dd/MM/yyyy HH:mm:ss");
    const newHistoryEntry = `\n\n--- PATIENT REPLY on ${timestamp} ---\n${data.replyMessage}`;
    messagesSheet.getRange(rowNumber, CONFIG.COLUMN_MAP.MESSAGES.CONVERSATION_HISTORY).setValue(messagesSheet.getRange(rowNumber, CONFIG.COLUMN_MAP.MESSAGES.CONVERSATION_HISTORY).getValue() + newHistoryEntry);
    messagesSheet.getRange(rowNumber, CONFIG.COLUMN_MAP.MESSAGES.STATUS).setValue(CONFIG.STATUSES.PATIENT_REPLIED);
    messagesSheet.getRange(rowNumber, CONFIG.COLUMN_MAP.MESSAGES.LAST_UPDATED).setValue(timestamp);
    const patientName = messagesSheet.getRange(rowNumber, CONFIG.COLUMN_MAP.MESSAGES.PATIENT_NAME).getValue();
    const subject = `New Patient Reply [${data.messageId}] from ${patientName}`;
    const body = `<p>Patient <strong>${escapeHtml(patientName)}</strong> has replied to message <strong>${data.messageId}</strong>.</p><hr><p><strong>Reply:</strong></p><p style=\"white-space: pre-wrap;\">${escapeHtml(data.replyMessage)}</p><hr><p>Logged in \"Messages\" sheet, row ${rowNumber}.</p>`;
    sendEmail(CONFIG.ADMIN_EMAIL, subject, body);
    return { status: 'success', message: 'Reply sent successfully.' };
  } catch (err) {
    Logger.log(`Error in handlePatientReply: ${err.message}\nStack: ${err.stack}`);
    reportError('handlePatientReply', err, { data: data });
    throw new Error(`Failed to send reply: ${err.message}`);
  }
}
function getConversationData(messageId) {
  try {
    const messagesSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEETS.MESSAGES);
    const rowNumber = findRowByMessageId(messagesSheet, messageId);
    if (rowNumber === -1) { throw new Error('Invalid or expired message link.'); }
    const initialMessage = `--- ORIGINAL MESSAGE on ${Utilities.formatDate(new Date(messagesSheet.getRange(rowNumber, CONFIG.COLUMN_MAP.MESSAGES.TIMESTAMP).getValue()), "Europe/Dublin", "dd/MM/yyyy HH:mm")} ---\n${messagesSheet.getRange(rowNumber, CONFIG.COLUMN_MAP.MESSAGES.INITIAL_MESSAGE).getValue()}`;
    const history = messagesSheet.getRange(rowNumber, CONFIG.COLUMN_MAP.MESSAGES.CONVERSATION_HISTORY).getValue();
    const conversationHistory = history ? `${initialMessage}\n\n${history}` : initialMessage;
    return { conversationHistory: conversationHistory };
  } catch (err) {
    reportError('getConversationData', err, { messageId: messageId });
    throw new Error(`An error occurred while fetching conversation data: ${err.message}`);
  }
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
  template.messageId = messageId; 
  const htmlOutput = template.evaluate().setWidth(600).setHeight(450);
  ui.showModalDialog(htmlOutput, `Replying to ${patientName}`);
}
function sendReplyFromSheet(messageId, replyText) {
  try {
    const messagesSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEETS.MESSAGES);
    const rowNumber = findRowByMessageId(messagesSheet, messageId);
    if (rowNumber === -1) throw new Error(`Message ID \"${messageId}\" not found.`);
    const patientName = messagesSheet.getRange(rowNumber, CONFIG.COLUMN_MAP.MESSAGES.PATIENT_NAME).getValue();
    const patientEmail = sheet.getRange(rowNumber, CONFIG.COLUMN_MAP.MESSAGES.PATIENT_EMAIL).getValue();
    const timestamp = Utilities.formatDate(new Date(), "Europe/Dublin", "dd/MM/yyyy HH:mm:ss");
    const newHistoryEntry = `\n\n--- STAFF REPLY on ${timestamp} ---\n${replyText}`;
    messagesSheet.getRange(rowNumber, CONFIG.COLUMN_MAP.MESSAGES.CONVERSATION_HISTORY).setValue(messagesSheet.getRange(rowNumber, CONFIG.COLUMN_MAP.MESSAGES.CONVERSATION_HISTORY).getValue() + newHistoryEntry);
    messagesSheet.getRange(rowNumber, CONFIG.COLUMN_MAP.MESSAGES.STATUS).setValue(CONFIG.STATUSES.REPLIED);
    messagesSheet.getRange(rowNumber, CONFIG.COLUMN_MAP.MESSAGES.LAST_UPDATED).setValue(timestamp);
    const webAppUrl = ScriptApp.getService().getUrl();
    const replyLink = `${webAppUrl}?page=reply&id=${messageId}`;
    const subject = `Update on your message [${messageId}]`;
    const body = `<p>Dear ${escapeHtml(patientName)},</p><p>A member of our staff has replied:</p><div style=\"background-color:#f4f4f4;padding:15px;border-left:4px solid #009cde;\">${escapeHtml(replyText)}</div><p>If you need to reply, please use the secure link below. **Do not reply to this email.**</p><p><a href=\"${replyLink}\">Click Here to Send a Secure Reply</a></p><br><p>Thank you,<br><strong>${CONFIG.SENDER_NAME}</strong></p><hr>${CONFIG.FOOTER}`;
    sendEmail(patientEmail, subject, body, { name: CONFIG.SENDER_NAME });
  } catch (err) {
    reportError('sendReplyFromSheet', err, { messageId: messageId });
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
  sheet.getRange(range.getRow(), CONFIG.COLUMN_MAP.MESSAGES.STATUS, range.getNumRows(), 1).setValue(CONFIG.STATUSES.CLOSED);
  sheet.getRange(range.getRow(), CONFIG.COLUMN_MAP.MESSAGES.LAST_UPDATED, range.getNumRows(), 1).setValue(timestamp);
  SpreadsheetApp.getActiveSpreadsheet().toast(`${range.getNumRows()} message(s) marked as Closed.`);
}
function sendPrescriptionNotification() {
  const ui = SpreadsheetApp.getUi();
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  if (sheet.getName() !== CONFIG.SHEETS.PRESCRIPTIONS) { ui.alert("This function can only be used from the prescriptions sheet."); return; }
  const range = sheet.getActiveRange();
  if (range.getNumRows() > 1 || range.getRow() < 2) { ui.alert("Please select a single patient row first."); return; }
  const row = range.getRow();
  const patientName = sheet.getRange(row, CONFIG.COLUMN_MAP.PRESCRIPTIONS.PATIENT_NAME).getValue();
  const patientEmail = sheet.getRange(row, CONFIG.COLUMN_MAP.PRESCRIPTIONS.EMAIL_ADDRESS).getValue();
  if (!patientEmail) { ui.alert(`Cannot send notification for ${patientName}: No email address found.`); return; }
  const response = ui.prompt(`Send Custom Notification to ${patientName}`, 'Enter the message you want to send:', ui.ButtonSet.OK_CANCEL);
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
function setPrescriptionStatusReady() { setStatus(CONFIG.STATUSES.READY); }
function setPrescriptionStatusQuery() { setStatus(CONFIG.STATUSES.QUERY); }
function setStatus(status) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  if (sheet.getName() !== CONFIG.SHEETS.PRESCRIPTIONS) return void SpreadsheetApp.getUi().alert("This function is for the prescriptions sheet.");
  const range = sheet.getActiveRange();
  if (range.getRow() < 2) return void SpreadsheetApp.getUi().alert("Please select one or more patient rows first.");
  sheet.getRange(range.getRow(), CONFIG.COLUMN_MAP.PRESCRIPTIONS.STATUS, range.getNumRows(), 1).setValue(status);
}
function sendConfirmationNotification(patientName, patientEmail, commPref) {
    if (!patientEmail) { Logger.log(`Confirmation not sent for ${patientName}: No email.`); return; }
    const subject = "Confirmation: We've Received Your Prescription Request";
    const commMethod = commPref && commPref.toLowerCase() === CONFIG.STATUSES.COMM_WHATSAPP ? "WhatsApp" : CONFIG.STATUSES.COMM_EMAIL;
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
    const body = `<p>Hi,</p><p>Please send the prescription notification to <strong>${escapeHtml(patientName)}</strong> by clicking the link below.</p><p><a href=\"${waLink}\">Click Here to Send WhatsApp Message</a></p>`;
    sendEmail(staffEmail, subject, body);
}
function archiveOldRequests() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sourceSheet = ss.getSheetByName(CONFIG.SHEETS.PRESCRIPTIONS);
    let archiveSheet = ss.getSheetByName(CONFIG.SHEETS.ARCHIVE);
    if (!archiveSheet) {
        archiveSheet = setupSheet(ss, CONFIG.SHEETS.ARCHIVE, sourceSheet.getRange(1, 1, 1, sourceSheet.getLastColumn()).getValues()[0]);
    }
    if (!sourceSheet || !CONFIG.COLUMN_MAP.PRESCRIPTIONS) return;
    const data = sourceSheet.getRange(2, 1, sourceSheet.getLastRow() - 1, sourceSheet.getLastColumn()).getValues();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 180);
    for (let i = data.length - 1; i >= 0; i--) {
        const rowData = data[i];
        const status = rowData[CONFIG.COLUMN_MAP.PRESCRIPTIONS.STATUS - 1];
        const notificationDateStr = rowData[CONFIG.COLUMN_MAP.PRESCRIPTIONS.NOTIFICATION_SENT - 1];
        if (status === CONFIG.STATUSES.READY && notificationDateStr && notificationDateStr.startsWith(CONFIG.STATUSES.PROCESSED_PREFIX)) {
            const dateStr = notificationDateStr.replace(CONFIG.STATUSES.PROCESSED_PREFIX, "").trim();
            const notificationDate = new Date(dateStr);
            if (!isNaN(notificationDate.getTime()) && notificationDate < cutoffDate) {
                archiveSheet.appendRow(rowData);
                sourceSheet.deleteRow(i + 2);
            }
        }
    }
}
function initializeColumnMap() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const getHeaderMap = (sheetName) => {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return null;
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const map = {};
    headers.forEach((header, i) => {
      const key = header.toString().trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_');
      map[key] = i + 1;
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
    if (!CONFIG.COLUMN_MAP.MESSAGES || !messageId) return -1;
    const messageIdColumn = CONFIG.COLUMN_MAP.MESSAGES.MESSAGE_ID;
    const searchRange = sheet.getRange(2, messageIdColumn, sheet.getLastRow() - 1, 1);
    const textFinder = searchRange.createTextFinder(messageId).matchEntireCell(true);
    const foundCell = textFinder.findNext();
    return foundCell ? foundCell.getRow() : -1;
}
function sendErrorReport(subject, body) {
    try { MailApp.sendEmail(CONFIG.ADMIN_EMAIL, subject, "", { htmlBody: body }); }
    catch (e) { Logger.log(`CRITICAL: Failed to send error report email. Subject: ${subject}. Error: ${e.message}`); }
}
function reportError(functionName, error, context = {}) {
    const subject = `Script Error: ${functionName}`;
    const timestamp = Utilities.formatDate(new Date(), "Europe/Dublin", "dd/MM/yyyy HH:mm:ss");
    let body = `An error occurred in <strong>${functionName}</strong> at ${timestamp}.`;
    if (context.row) body += `<br><br>Related to row <strong>${context.row}</strong>.`;
    if (context.data) body += `<br><br>Received Data: <pre>${JSON.stringify(context.data, null, 2)}</pre>`;
    if (context.messageId) body += `<br><br>Related to Message ID: <strong>${context.messageId}</strong>.`;
    if (context.recipient) body += `<br><br>Related to Recipient: <strong>${context.recipient}</strong>.`;
    body += `<br><br><strong>Error Details:</strong><br>Name: ${error.name}<br>Message: ${error.message}<br>Stack Trace:<br>${(error.stack || '').replace(/\n/g, "<br>")}`;
    sendErrorReport(subject, body);
}
function escapeHtml(unsafe) {
  if (unsafe === null || unsafe === undefined) return "";
  return unsafe.toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function sendEmail(recipient, subject, htmlBody, options) {
  try {
    const defaultOptions = { htmlBody: htmlBody };
    const finalOptions = { ...defaultOptions, ...options };
    MailApp.sendEmail(recipient, subject, "", finalOptions);
  } catch (e) {
    if (recipient !== CONFIG.ADMIN_EMAIL) {
      reportError('sendEmail', e, { recipient: recipient });
    } else {
      Logger.log(`Failed to send email to admin. Error: ${e.message}`);
    }
  }
}
