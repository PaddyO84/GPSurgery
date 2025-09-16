# Future Feature Suggestions for the Prescription System

This document outlines potential new features to enhance the prescription request system, categorized by their technical complexity and the likely impact on patients and staff.

---

## Tier 1: Foundational Features
*(These features can be built on the existing Google Sheets foundation and would provide high value for relatively low complexity.)*

### 1. Enhanced Prescription History
*   **Concept:** Allow patients to see a list of their previously submitted prescriptions and their final status (e.g., "Sent to Pharmacy on 15/09/2025", "Query Issued on 14/09/2025"). The existing "Save/Load My Prescriptions" feature only handles a single, in-progress request.
*   **Benefits:** Patients can easily track their past requests without needing to contact the surgery. This also provides a clear record for them.
*   **Implementation:** This would involve creating a unique, persistent identifier for each patient and storing their submission history in a structured way within the Google Sheet.

### 2. Simple Secure Messaging
*   **Concept:** A dedicated form on the website where a logged-in or identified patient can send a non-urgent message directly to the clinic staff.
*   **Benefits:** Provides a more formal and trackable communication channel than standard email. It keeps patient queries organized in one place.
*   **Implementation:** The message could be sent as a formatted email to the admin or stored in a new "Messages" sheet in the Google Spreadsheet for staff to review.

### 3. Online Patient Registration
*   **Concept:** A form for new patients to submit their demographic and medical card information online.
*   **Benefits:** Reduces paperwork and manual data entry for staff during a new patient's first visit.
*   **Implementation:** This would create a new "Patients" sheet in the spreadsheet, effectively creating a simple patient database that can be referenced by other functions.

---

## Tier 2: Intermediate Features
*(These features would likely require moving beyond a simple HTML front-end and might involve a more robust back-end, such as a dedicated Apps Script Web App.)*

### 1. Appointment Request System
*   **Concept:** A form that allows patients to request an appointment by selecting a preferred date, time slot (e.g., "Morning," "Afternoon"), and reason for visit.
*   **Benefits:** Streamlines the appointment booking process and reduces phone calls.
*   **Implementation:** The request would be logged in the spreadsheet, and a notification would be sent to staff to confirm, decline, or propose a new time. It would be an asynchronous request system, not a live calendar booking.

### 2. Manage Personal Information
*   **Concept:** Allow patients to view and request changes to their contact details (e.g., address, phone number, email) that are stored in the "Patients" sheet.
*   **Benefits:** Empowers patients to keep their own records up to date, improving data accuracy for the clinic.
*   **Implementation:** This would require a secure way to identify the patient and show them only their own data.

### 3. Health Knowledge Base / FAQ
*   **Concept:** A simple, static page on the website with answers to frequently asked questions about the practice, prescriptions, appointments, etc.
*   **Benefits:** Reduces routine administrative queries and provides a helpful resource for patients.
*   **Implementation:** This is a content-focused task and would involve creating a new HTML page or section on the existing site.

---

## Tier 3: Advanced, Long-Term Vision
*(These features represent a significant evolution of the system and would require moving away from Google Sheets to a proper database and a full web application framework. This aligns with the "self-hosting" research task.)*

### 1. Full Patient Portal
*   **Concept:** A secure, login-protected area where patients can access their full medical information.
*   **Features:**
    *   Viewing lab results and clinical summaries.
    *   Direct, real-time messaging with their assigned GP or nurse.
    *   Viewing upcoming appointments.
*   **Complexity:** Very High. This requires a secure database, robust user authentication, and likely integration with the main Electronic Health Record (EHR) system used by the clinic. This path has significant data protection (GDPR) and security implications.

### 2. Online Bill Pay
*   **Concept:** Integration with a payment provider (e.g., Stripe) to allow patients to view and pay their bills online.
*   **Complexity:** High. Requires a secure back-end, payment processor integration, and careful handling of financial data.

### 3. IoT Device Integration
*   **Concept:** Allow patients to connect data from their personal health devices (e.g., smartwatches, blood pressure monitors, glucose meters).
*   **Complexity:** Very High. Requires building or integrating with third-party APIs and managing a large volume of sensitive health data.
