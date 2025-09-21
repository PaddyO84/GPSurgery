// --- GLOBAL EVENT LISTENERS ---
document.addEventListener('DOMContentLoaded', function() {
    // --- NAVIGATION LOGIC ---
// ... existing code ...
      const data = {};
      formData.forEach((value, key) => data[key] = value);
      data.formType = 'newMessage';

      fetch(WEB_APP_URL, {
        method: 'POST',
        mode: 'cors',
        cache: 'no-cache',
        // Change content type to text/plain to avoid preflight OPTIONS request, a common GAS workaround.
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(data),
        redirect: 'follow'
      })
      .then(res => res.json())
      .then(response => {
// ... existing code ...
      const data = {};
      formData.forEach((value, key) => data[key] = value);
      data.formType = 'replyMessage';

      fetch(WEB_APP_URL, {
        method: 'POST',
        mode: 'cors',
        cache: 'no-cache',
        // Change content type to text/plain to avoid preflight OPTIONS request, a common GAS workaround.
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(data),
        redirect: 'follow'
      })
      .then(res => res.json())
      .then(response => {
// ... existing code ...
  confirmSubmitBtn.addEventListener('click', () => {
    summaryModal.style.display = 'none';
    statusDiv.innerHTML = '<p>Submitting...</p>';
    const payload = { ...formDataForSubmission, formType: 'prescriptionSubmission' };
    fetch(WEB_APP_URL, {
      method: 'POST',
      mode: 'cors',
      cache: 'no-cache',
      // Change content type to text/plain to avoid preflight OPTIONS request, a common GAS workaround.
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload),
      redirect: 'follow'
    })
    .then(res => res.json())
    .then(response => {
// ... existing code ...
    data.formType = 'appointmentBooking';

    fetch(WEB_APP_URL, {
      method: 'POST',
      mode: 'cors',
      cache: 'no-cache',
      // Change content type to text/plain to avoid preflight OPTIONS request, a common GAS workaround.
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(data),
      redirect: 'follow'
    })
    .then(res => res.json())
    .then(response => {
// ... existing code ...
