// --- GLOBAL EVENT LISTENERS ---
document.addEventListener('DOMContentLoaded', function() {
    // --- NAVIGATION LOGIC ---
    const menuToggle = document.getElementById('menu-toggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            document.body.classList.toggle('sidebar-active');
        });
    }

    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (link && link.parentElement.classList.contains('nav-item-submenu')) {
                e.preventDefault();
                link.parentElement.classList.toggle('open');
            }
        });
    }

    // --- REPLY PAGE LOGIC ---
    if (document.getElementById('reply-section')) {
        const urlParams = new URLSearchParams(window.location.search);
        const messageId = urlParams.get('id');
        const historyDiv = document.getElementById('conversation-history');
        const statusDiv = document.getElementById('submission-status');
        const messageIdStrongEl = document.querySelector('.sub-heading strong');

        if (messageId && historyDiv) {
            if(messageIdStrongEl) messageIdStrongEl.textContent = messageId;
            document.querySelector('input[name="messageId"]').value = messageId;

            const url = new URL(WEB_APP_URL);
            url.searchParams.append('action', 'getConversationData');
            url.searchParams.append('id', messageId);

            historyDiv.textContent = 'Loading history...';
            fetch(url)
                .then(response => response.json())
                .then(data => {
                    if (data.error) {
                        throw new Error(data.error);
                    }
                    historyDiv.innerHTML = `<pre>${data.conversationHistory}</pre>`;
                })
                .catch(error => {
                    statusDiv.style.display = 'block';
                    statusDiv.className = 'error';
                    statusDiv.innerHTML = `<strong>Error:</strong> Could not load conversation. ${error.message}`;
                    document.getElementById('reply-section').style.display = 'none';
                });
        } else {
             statusDiv.style.display = 'block';
             statusDiv.className = 'error';
             statusDiv.innerHTML = '<strong>Error:</strong> No message ID provided. Please use the link from your email.';
             document.getElementById('reply-section').style.display = 'none';
        }
    }

    // --- FORM HANDLERS ---

    // --- New Message Form (from new-message.html) ---
    const messageForm = document.getElementById('messageForm');
    if (messageForm) {
        const submitButton = document.getElementById('submitButton');
        const statusDiv = document.getElementById('submission-status');

        messageForm.addEventListener('submit', function(e) {
          e.preventDefault();
          submitButton.disabled = true;
          submitButton.textContent = 'Sending...';

          const formData = new FormData(this);
          const data = {};
          formData.forEach((value, key) => data[key] = value);
          data.formType = 'newMessage';

          fetch(WEB_APP_URL, {
            method: 'POST',
            mode: 'cors',
            cache: 'no-cache',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
            redirect: 'follow'
          })
          .then(res => res.json())
          .then(response => {
              if (response.status === 'success') {
                  onNewMessageSuccess(response);
              } else {
                  throw new Error(response.message || 'An unknown error occurred.');
              }
          })
          .catch(error => {
              onNewMessageFailure(error);
          });
        });

        function onNewMessageSuccess(response) {
          messageForm.style.display = 'none';
          statusDiv.style.display = 'block';
          statusDiv.className = 'success';
          statusDiv.innerHTML = '<h2>Thank You!</h2><p>Your message has been sent successfully.</p>';
        }

        function onNewMessageFailure(error) {
          statusDiv.style.display = 'block';
          statusDiv.className = 'error';
          statusDiv.innerHTML = `<strong>Error:</strong> ${error.message}. Please try again.`;
          submitButton.disabled = false;
          submitButton.textContent = 'Send Message';
        }
    }

    // --- Reply Form (from reply.html) ---
    const replyForm = document.getElementById('replyForm');
    if (replyForm) {
        const submitButton = document.getElementById('submitButton');
        const statusDiv = document.getElementById('submission-status');
        const replySection = document.getElementById('reply-section');

        replyForm.addEventListener('submit', function(e) {
          e.preventDefault();
          submitButton.disabled = true;
          submitButton.textContent = 'Sending...';

          const formData = new FormData(this);
          const data = {};
          formData.forEach((value, key) => data[key] = value);
          data.formType = 'replyMessage';

          fetch(WEB_APP_URL, {
            method: 'POST',
            mode: 'cors',
            cache: 'no-cache',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
            redirect: 'follow'
          })
          .then(res => res.json())
          .then(response => {
            if (response.status === 'success') {
              onReplySuccess(response);
            } else {
              throw new Error(response.message || 'An unknown error occurred.');
            }
          })
          .catch(error => {
            onReplyFailure(error);
          });
        });

        function onReplySuccess(response) {
          replySection.style.display = 'none';
          statusDiv.style.display = 'block';
          statusDiv.className = 'success';
          statusDiv.innerHTML = '<h2>Thank You!</h2><p>Your reply has been sent successfully.</p>';
        }

        function onReplyFailure(error) {
          statusDiv.style.display = 'block';
          statusDiv.className = 'error';
          statusDiv.innerHTML = `<strong>Error:</strong> ${error.message}. Please try again.`;
          submitButton.disabled = false;
          submitButton.textContent = 'Send Reply';
        }
    }

    // --- Prescription Form Logic (from prescription_form.html) ---
    const prescriptionForm = document.getElementById('prescriptionForm');
    if (prescriptionForm) {
      const addMedicationBtn = document.getElementById('addMedicationBtn');
      const medicationList = document.getElementById('medicationList');
      const summaryModal = document.getElementById('summaryModal');
      const confirmSubmitBtn = document.getElementById('confirmSubmitBtn');
      const cancelBtn = summaryModal.querySelector('.cancel-button');
      const closeBtn = summaryModal.querySelector('.close-button');
      const statusDiv = document.getElementById('submission-status');

      // --- Dropdown Population ---
      const pharmacySelect = document.getElementById('chosenPharmacy');
      const freqSelect = document.getElementById('medFreq');
      
      if (pharmacySelect && freqSelect) {
          const pharmacyOptions = [
            "Mullans Pharmacy",
            "Carn Pharmacy",
            "McNeill's Pharmacy",
            "Inish Pharmacy, Carndonagh",
            "Tierney's Healthwise Pharmacy, Buncrana",
            "Inish Pharmacy, Buncrana",
            "Duffy's Pharmacy, Buncrana",
            "Brennan's Pharmacy, Buncrana",
            "Hannon's Pharmacy, Moville",
            "Foyle Pharmacy, Moville",
            "Brennan's Pharmacy, Clonmany",
            "Inish Pharmacy, Muff",
            "OTHER"
          ];
          const frequencyOptions = ["Once a day", "Twice a day", "Three times a day", "Four times a day", "As needed", "Every other day", "Once a week"];
          
          pharmacyOptions.forEach(opt => pharmacySelect.add(new Option(opt, opt)));
          frequencyOptions.forEach(opt => freqSelect.add(new Option(opt, opt)));
      }

      // --- Sidebar Button Logic ---
      const loadRequestBtn = document.getElementById('loadRequestBtn');
      const fileInput = document.getElementById('file-input');
      const saveRequestBtn = document.getElementById('saveRequestBtn');
      const clearFormBtn = document.getElementById('clearFormBtn');
      const printSummaryBtn = document.getElementById('printSummaryBtn');

      loadRequestBtn.addEventListener('click', () => fileInput.click());

      fileInput.addEventListener('change', (event) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = JSON.parse(e.target.result);
            prescriptionForm.name.value = data.name || '';
            prescriptionForm.dob.value = data.dob || '';
            prescriptionForm.address.value = data.address || '';
            prescriptionForm.email.value = data.email || '';
            prescriptionForm.phone.value = data.phone || '';
            prescriptionForm.pharmacy.value = data.pharmacy || '';
            medicationList.innerHTML = '';
            if (data.medications && Array.isArray(data.medications)) {
              data.medications.forEach(m => {
                const row = document.createElement('tr');
                row.innerHTML = `<td>${m.name}</td><td>${m.dosage}</td><td>${m.frequency}</td><td><button type="button" class="remove-med-btn">Remove</button></td>`;
                medicationList.appendChild(row);
              });
            }
          } catch (err) {
            alert('Failed to load or parse file. Make sure it is a valid JSON file from this site.');
          }
        };
        reader.readAsText(event.target.files[0]);
      });

      saveRequestBtn.addEventListener('click', () => {
        const data = {};
        new FormData(prescriptionForm).forEach((value, key) => data[key] = value);
        const medications = [];
        medicationList.querySelectorAll('tr').forEach(row => {
          const cells = row.querySelectorAll('td');
          medications.push({ name: cells[0].textContent, dosage: cells[1].textContent, frequency: cells[2].textContent });
        });
        data.medications = medications;

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'prescription-request.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });

      clearFormBtn.addEventListener('click', () => {
        prescriptionForm.reset();
        medicationList.innerHTML = '';
      });

      printSummaryBtn.addEventListener('click', () => {
        const data = {};
        new FormData(prescriptionForm).forEach((value, key) => data[key] = value);
        const medications = [];
        medicationList.querySelectorAll('tr').forEach(row => {
          const cells = row.querySelectorAll('td');
          medications.push({ name: cells[0].textContent, dosage: cells[1].textContent, frequency: cells[2].textContent });
        });

        const summaryHTML = `
          <html><head><title>Prescription Summary</title><style>body{font-family:sans-serif;} table{border-collapse:collapse;width:100%;} th,td{border:1px solid #ddd;padding:8px;}</style></head><body>
          <h1>Prescription Request Summary</h1>
          <p><strong>Name:</strong> ${data.name || 'N/A'}</p>
          <p><strong>Date of Birth:</strong> ${data.dob || 'N/A'}</p>
          <p><strong>Email:</strong> ${data.email || 'N/A'}</p>
          <p><strong>Pharmacy:</strong> ${data.pharmacy || 'N/A'}</p>
          <h3>Medications:</h3>
          <table><thead><tr><th>Name</th><th>Dosage</th><th>Frequency</th></tr></thead><tbody>
          ${medications.map(m => `<tr><td>${m.name}</td><td>${m.dosage}</td><td>${m.frequency}</td></tr>`).join('')}
          </tbody></table></body></html>`;
        const printWindow = window.open('', '_blank');
        printWindow.document.write(summaryHTML);
        printWindow.document.close();
        printWindow.print();
      });

      // --- Medication Add/Remove Logic ---
      addMedicationBtn.addEventListener('click', () => {
        const medName = document.getElementById('medName').value.trim();
        const medDosage = document.getElementById('medDosage').value.trim();
        const medFreq = document.getElementById('medFreq').value.trim();

        if (medName && medDosage && medFreq) {
          const row = document.createElement('tr');
          row.innerHTML = `<td>${medName}</td><td>${medDosage}</td><td>${medFreq}</td><td><button type="button" class="remove-med-btn">Remove</button></td>`;
          medicationList.appendChild(row);
          document.getElementById('medName').value = '';
          document.getElementById('medDosage').value = '';
          document.getElementById('medFreq').value = '';
        } else {
          alert('Please fill in all medication details.');
        }
      });

      medicationList.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-med-btn')) {
          e.target.closest('tr').remove();
        }
      });

      // --- Form Submission and Summary Modal Logic ---
      let formDataForSubmission = {};
      prescriptionForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const data = {};
        new FormData(prescriptionForm).forEach((value, key) => data[key] = value);
        const medications = [];
        medicationList.querySelectorAll('tr').forEach(row => {
          const cells = row.querySelectorAll('td');
          medications.push({ name: cells[0].textContent, dosage: cells[1].textContent, frequency: cells[2].textContent });
        });
        if (medications.length === 0) {
          alert('Please add at least one medication to the list.');
          return;
        }
        data.meds = medications.map(m => `${m.name}~${m.dosage}~${m.frequency}`).join('|');
        formDataForSubmission = data;
        const summaryDetails = document.getElementById('summaryDetails');
        summaryDetails.innerHTML = `<p><strong>Name:</strong> ${data.name}</p><p><strong>Date of Birth:</strong> ${data.dob}</p><p><strong>Email:</strong> ${data.email}</p><p><strong>Pharmacy:</strong> ${data.pharmacy}</p><h4>Medications:</h4><ul>${medications.map(m => `<li>${m.name} (${m.dosage}, ${m.frequency})</li>`).join('')}</ul>`;
        summaryModal.style.display = 'block';
      });

      // --- Final Submission Logic ---
      confirmSubmitBtn.addEventListener('click', () => {
        summaryModal.style.display = 'none';
        statusDiv.innerHTML = '<p>Submitting...</p>';
        const payload = { ...formDataForSubmission, formType: 'prescriptionSubmission' };
        fetch(WEB_APP_URL, {
          method: 'POST',
          mode: 'cors',
          cache: 'no-cache',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          redirect: 'follow'
        })
        .then(res => res.json())
        .then(response => {
          if (response.status === 'success') {
            prescriptionForm.style.display = 'none';
            statusDiv.className = 'success';
            statusDiv.innerHTML = '<h2>Thank You!</h2><p>Your prescription request has been sent successfully.</p>';
          } else {
            throw new Error(response.message || 'An unknown error occurred.');
          }
        })
        .catch(error => {
          statusDiv.className = 'error';
          statusDiv.innerHTML = `<strong>Error:</strong> ${error.message}. Please try again.`;
        });
      });

      // --- Modal Close/Cancel Logic ---
      const closeModal = () => summaryModal.style.display = 'none';
      closeBtn.addEventListener('click', closeModal);
      cancelBtn.addEventListener('click', closeModal);
    }

    // --- Appointment Booking Form Logic ---
    const bookingForm = document.getElementById('bookingForm');
    if (bookingForm) {
      const statusDiv = document.getElementById('submission-status');

      bookingForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const submitButton = document.getElementById('submitBooking');
        submitButton.disabled = true;
        submitButton.textContent = 'Requesting...';

        const formData = new FormData(bookingForm);
        const data = {};
        formData.forEach((value, key) => data[key] = value);
        data.formType = 'appointmentBooking';

        fetch(WEB_APP_URL, {
          method: 'POST',
          mode: 'cors',
          cache: 'no-cache',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
          redirect: 'follow'
        })
        .then(res => res.json())
        .then(response => {
          if (response.status === 'success') {
            bookingForm.style.display = 'none';
            statusDiv.className = 'success';
            statusDiv.innerHTML = '<h2>Thank You!</h2><p>Your appointment request has been sent. We will call you to confirm the final time and date.</p>';
          } else {
            throw new Error(response.message || 'An unknown error occurred.');
          }
        })
        .catch(error => {
          statusDiv.className = 'error';
          statusDiv.innerHTML = `<strong>Error:</strong> ${error.message}. Please try again.`;
          submitButton.disabled = false;
          submitButton.textContent = 'Request Appointment';
        });
      });
    }

});

