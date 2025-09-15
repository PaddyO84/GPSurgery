# New Feature Suggestions for the Prescription Request System

Here is a list of potential new features to enhance the system, categorized by their impact and complexity.

---

### High-Impact Features (Major Upgrades)

1.  **Staff Admin Dashboard**
    *   **Concept:** Instead of managing requests directly in the Google Sheet, we could build a simple, secure web page for your staff.
    *   **Benefits:** This would provide a much cleaner and more efficient workflow. Staff could see a list of new requests, update the status with a single click (e.g., "Mark as Sent"), add internal notes, and search for requests without having to navigate the spreadsheet.
    *   **Complexity:** High. This would involve deploying the Apps Script as a Web App and building a new HTML interface for the staff.

2.  **Patient Status Lookup Page**
    *   **Concept:** A simple web page where patients can enter the reference number they receive upon submission to check the real-time status of their request (e.g., "In Queue," "Sent to Pharmacy," "Query - Please Contact").
    *   **Benefits:** This would reduce the number of follow-up calls to the surgery, as patients could self-serve for status updates.
    *   **Complexity:** High. This also requires deploying the Apps Script as a Web App.

---

### Medium-Impact Features (Workflow Improvements)

1.  **Automated Archiving of Old Requests**
    *   **Concept:** A script that automatically moves completed prescription requests older than a set period (e.g., 6 months) from the main response sheet to a separate "Archive" sheet.
    *   **Benefits:** This keeps your main sheet clean and fast, improving performance as the number of requests grows.
    *   **Complexity:** Moderate. This would require a new Apps Script function that runs on a time-based trigger.

2.  **Back-End Data Validation**
    *   **Concept:** Add a layer of validation within the Apps Script itself. When a form is submitted, the script would double-check that all required fields are present before processing.
    *   **Benefits:** This adds a layer of security and robustness, ensuring that no incomplete data can enter the system, even if someone were to bypass your HTML form.
    *   **Complexity:** Moderate.

---

### Low-Effort Features (Quick Wins)

1.  **Enhanced Error Reporting**
    *   **Concept:** If the script fails for any reason (e.g., Google's email service is temporarily down), it could automatically send a notification email to the designated admin (`patricknoone+surgery@gmail.com`) with the details of the error.
    *   **Benefits:** This allows for proactive problem-solving, as you would be alerted to issues immediately without needing to check the script logs manually.
    *   **Complexity:** Low. This is a relatively simple addition to the existing script.

2.  **Status-Setting Menu Items**
    *   **Concept:** We could add items to the "Surgery Tools" menu to let staff set the status of a request with one click (e.g., "Set Status to 'Sent to Pharmacy'"), instead of manually typing it.
    *   **Benefits:** This would speed up the workflow and eliminate any potential typos in the status column, which would prevent the automated notifications from firing.
    *   **Complexity:** Low.
