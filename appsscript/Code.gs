// --- 1. CONFIGURATION & CONSTANTS ---
const CONFIG = {
  SHEETS: {
    PRESCRIPTIONS: "Form responses 1",
    MESSAGES: "Messages",
    ARCHIVE: "Archive",
    APPOINTMENTS: "Appointments"
  },
  COLUMN_MAP: {}, // Populated by initializeColumnMap()
  SENDER_NAME: "Carndonagh Health Centre",
  ADMIN_EMAIL: "patricknoone+surgery@gmail.com",
  STATUSES: {
    // Prescription Statuses
    QUERY: "Query - Please Contact Us",
    READY: "Sent to Pharmacy",
    // Message Statuses
    NEW: "New",
    REPLIED: "Replied",
    PATIENT_REPLIED: "Patient Replied",
    CLOSED: "Closed",
    // Communication Preferences
    COMM_WHATSAPP: "whatsapp",
    COMM_EMAIL: "Email",
    // Misc
    PROCESSED_PREFIX: "Processed on "
  },
  DATE_FORMAT: "yyyy-MM-dd",
  FOOTER: `<p style=\"font-size:0.9em; color:#666;\"><i>Please note: This is an automated message and this email address is not monitored. For any queries, please contact the surgery by phone.</i></p>`
};

// --- 2. CORE TRIGGER FUNCTIONS ---
function onOpen() {
  initializeColumnMap(); // Initialize dynamic column mapping
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

function doGet(e) {
  const action = e.parameter.action;
  if (action === 'getConversationData') {
    const messageId = e.parameter.id;
    return getConversationData(messageId);
  }

  // Return a default response for other GET requests
  return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'API is running' })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  let data;
  try {
    // Check if the necessary properties exist
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error("Invalid request - missing data.");
    }
    
    // Parse the JSON data from the request body
    data = JSON.parse(e.postData.contents);
    
    // Check if formType is specified
    if (!data.formType) {
      throw new Error("Invalid request - missing formType.");
    }
    
    // Log the received data for debugging
    Logger.log(`Received formType: ${data.formType} with data: ${JSON.stringify(data)}`);

    // Route to the appropriate handler based on the formType
    switch (data.formType) {
      case 'newMessage':
        handleNewMessage(data);
        break;
      case 'replyMessage':
        handlePatientReply(data);
        break;
      case 'appointmentBooking':
        handleAppointmentBooking(data);
        break;
      case 'prescriptionSubmission':
        handlePrescriptionSubmission(data);
        break;
      default:
        throw new Error(`Invalid form type submitted: ${data.formType}`);
    }
    
    // Return a success response
    return ContentService.createTextOutput(JSON.stringify({ status: 'success' }))
                         .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    // Log the error for debugging
    Logger.log(`Error in doPost: ${err.message}\nStack: ${err.stack}`);
    
    // Report the error
    reportError('doPost', err, null);
    
    // Return an error response
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.message }))
                         .setMimeType(ContentService.MimeType.JSON);
  }
}

function doOptions(e) {
  return ContentService.createTextOutput(JSON.stringify({}))
    .setMimeType(ContentService.MimeType.JSON)
    .addHttpHeader("Access-Control-Allow-Origin", "https://paddyo84.github.io")
    .addHttpHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
    .addHttpHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
}