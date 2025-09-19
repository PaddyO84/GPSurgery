const GOOGLE_FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLSepUNc9-xIpDf_UaM3-OwFFRdZozUoZC3jHRCas0b-gc1NStg/formResponse";
const PATIENT_NAME_ENTRY = "entry.1775196617";
const PATIENT_EMAIL_ENTRY = "entry.2008110253";
const PATIENT_DOB_ENTRY = "entry.1011602497";
const PATIENT_ADDRESS_ENTRY = "entry.1572836613";
const PATIENT_PHONE_NO = "entry.1516294764";
const CHOSEN_PHARMACY_ENTRY = "entry.1118271783";
const COMMUNICATION_PREF_ENTRY = "entry.274147264";
const MEDICATION_LIST_ENTRY = "entry.607030324";

const commonMedications = ["Atorvastatin", "Ramipril", "Amlodipine", "Lansoprazole", "Salbutamol", "Metformin", "Sertraline", "Colecalciferol", "Levothyroxine", "Aspirin", "Bisoprolol", "Paracetamol", "Ibuprofen"];
const pharmacyOptions = { "Tierney's Healthwise Pharmacy, Buncrana": "Tierney's Healthwise Pharmacy, Buncrana", "Inish Pharmacy, Buncrana": "Inish Pharmacy, Buncrana", "Duffy's Pharmacy, Buncrana": "Duffy's Pharmacy, Buncrana", "Brennan's Pharmacy, Buncrana": "Brennan's Pharmacy, Buncrana", "Hannon's Pharmacy, Moville": "Hannon's Pharmacy, Moville", "Foyle Pharmacy, Moville": "Foyle Pharmacy, Moville", "Brennan's Pharmacy, Clonmany": "Brennan's Pharmacy, Clonmany", "Inish Pharmacy, Muff": "Inish Pharmacy, Muff", "Mullans Pharmacy, Carndonagh": "Mullans Pharmacy, Carndonagh", "Carn Pharmacy, Carndonagh": "Carn Pharmacy, Carndonagh", "McNeill's Pharmacy, Carndonagh": "McNeill's Pharmacy, Carndonagh", "Inish Pharmacy, Carndonagh": "Inish Pharmacy, Carndonagh" };
const frequencyOptions = {"Once a day": "Once a day", "Twice a day": "Twice a day", "Three times a day": "Three times a day", "Four times a day": "Four times a day"};

document.addEventListener('DOMContentLoaded', () => {
    populateDatalist('medication-list', commonMedications);
    populateSelect('chosenPharmacy', pharmacyOptions);
    populateSelect('medFreq', frequencyOptions);
    loadFromLocalStorage();
    const inputs = document.querySelectorAll('#patientDetailsSection input, #patientDetailsSection textarea, #patientDetailsSection select');
    inputs.forEach(input => input.addEventListener('input', saveToLocalStorage));
});

function populateDatalist(id, options) {
    const datalist = document.getElementById(id);
    options.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option;
        datalist.appendChild(optionElement);
    });
}

function populateSelect(id, options) {
    const select = document.getElementById(id);
    if (id === 'chosenPharmacy') {
        select.innerHTML = '<option value="" disabled selected>Please select a pharmacy...</option>';
    }
    for (const [value, text] of Object.entries(options)) {
        const optionElement = document.createElement('option');
        optionElement.value = value;
        optionElement.textContent = text;
        select.appendChild(optionElement);
    }
}

function getFormDataAsObject() {
    return {
        patientDetails: {
            name: document.getElementById('patientName').value, email: document.getElementById('patientEmail').value, phone: document.getElementById('patientPhone').value,
            dob: document.getElementById('patientDOB').value, address: document.getElementById('patientAddress').value, pharmacy: document.getElementById('chosenPharmacy').value,
            commPref: document.querySelector('input[name="communicationPref"]:checked').value
        },
        medicationList: Array.from(document.getElementById('medicationList').rows).map(row => ({ name: row.cells[0].textContent, dosage: row.cells[1].textContent, freq: row.cells[2].textContent }))
    };
}

function populateFormFromData(data) {
    if (!data) return;
    const details = data.patientDetails || {};
    document.getElementById('patientName').value = details.name || '';
    document.getElementById('patientEmail').value = details.email || '';
    document.getElementById('patientPhone').value = details.phone || '';
    document.getElementById('patientDOB').value = details.dob || '';
    document.getElementById('patientAddress').value = details.address || '';
    document.getElementById('chosenPharmacy').value = details.pharmacy || '';
    const commPref = details.commPref || 'Email';
    document.getElementById(commPref.toLowerCase() === 'whatsapp' ? 'prefWhatsapp' : 'prefEmail').checked = true;
    const tableBody = document.getElementById('medicationList');
    tableBody.innerHTML = "";
    if (data.medicationList && Array.isArray(data.medicationList)) {
        data.medicationList.forEach(med => createMedicationRow(med.name, med.dosage, med.freq));
    }
}

function addMedication() {
    const name = document.getElementById('medName').value.trim();
    const dosage = document.getElementById('medDosage').value.trim();
    const freq = document.getElementById('medFreq').value;
    if (name === "" || dosage === "") { alert("Please fill in the medication name and dosage."); return; }
    createMedicationRow(name, dosage, freq);
    document.getElementById('medName').value = "";
    document.getElementById('medDosage').value = "";
    saveToLocalStorage();
}

function createMedicationRow(name, dosage, freq) {
    const row = document.getElementById('medicationList').insertRow();
    row.insertCell(0).textContent = name;
    row.insertCell(1).textContent = dosage;
    row.insertCell(2).textContent = freq;
    const actionCell = row.insertCell(3);
    const removeButton = document.createElement('button');
    removeButton.textContent = "Remove";
    removeButton.className = "remove-btn";
    removeButton.onclick = () => { removeMedication(row); };
    actionCell.appendChild(removeButton);
}

function removeMedication(row) {
    row.remove();
    saveToLocalStorage();
}

function clearAllFields() {
    if (confirm("Are you sure you want to clear the entire form?")) {
        populateFormFromData({ patientDetails: {}, medicationList: [] });
        localStorage.removeItem('prescriptionFormData');
    }
}

function showSummary() {
    if (!validatePatientDetails()) return;
    const { patientDetails, medicationList } = getFormDataAsObject();
    if (medicationList.length === 0) { alert("Please add at least one medication."); return; }
    let summaryHTML = `<p><strong>Name:</strong> ${patientDetails.name}</p><p><strong>Email:</strong> ${patientDetails.email}</p><p><strong>Phone:</strong> ${patientDetails.phone}</p><p><strong>Date of Birth:</strong> ${patientDetails.dob}</p><p><strong>Pharmacy:</strong> ${patientDetails.pharmacy}</p><p><strong>Contact Preference:</strong> ${patientDetails.commPref}</p><hr><h3>Medications:</h3><ul>${medicationList.map(med => `<li>${med.name} - ${med.dosage} (${med.freq})</li>`).join('')}</ul>`;
    document.getElementById('summaryDetails').innerHTML = summaryHTML;
    document.getElementById('summaryModal').style.display = 'flex';
}

function validatePatientDetails() {
  const fields = ['patientName', 'patientDOB', 'patientAddress', 'patientEmail', 'patientPhone', 'chosenPharmacy'];
  for (const id of fields) {
    if (!document.getElementById(id).value) {
      alert("Please fill in all Patient Details before proceeding.");
      return false;
    }
  }
  return true;
}

function printSummary() {
    if (!validatePatientDetails()) return;
    const { patientDetails, medicationList } = getFormDataAsObject();
    if (medicationList.length === 0) { alert("Please add at least one medication."); return; }
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`<html><head><title>Prescription Request Summary</title><style>body{font-family:sans-serif;} table{width:100%; border-collapse:collapse;} th,td{border:1px solid #ccc; padding:8px; text-align:left;}</style></head><body><h1>Prescription Request</h1><p><strong>Name:</strong> ${patientDetails.name}</p><p><strong>Date of Birth:</strong> ${patientDetails.dob}</p><p><strong>Pharmacy:</strong> ${patientDetails.pharmacy}</p><h3>Medications</h3><table><thead><tr><th>Name</th><th>Dosage</th><th>Frequency</th></tr></thead><tbody>${medicationList.map(med => `<tr><td>${med.name}</td><td>${med.dosage}</td><td>${med.freq}</td></tr>`).join('')}</tbody></table></body></html>`);
    printWindow.document.close();
    printWindow.print();
}

function generateReferenceNumber() {
    return `CHC-${new Date().toISOString().replace(/[-:.]/g, "")}`;
}

function saveToLocalStorage() { localStorage.setItem('prescriptionFormData', JSON.stringify(getFormDataAsObject())); }

function loadFromLocalStorage() {
    const savedData = localStorage.getItem('prescriptionFormData');
    if (savedData) {
        try {
            populateFormFromData(JSON.parse(savedData));
        } catch (e) {
            localStorage.removeItem('prescriptionFormData');
        }
    }
}

function saveRequestToFile() {
    const formData = getFormDataAsObject();
    if (!formData.patientDetails.name) { alert("Please enter a patient name before saving."); return; }
    const dataStr = JSON.stringify(formData, null, 2);
    const dataBlob = new Blob([dataStr], {type: "application/json"});
    const link = document.createElement("a");
    link.href = URL.createObjectURL(dataBlob);
    link.download = `prescription_request_${formData.patientDetails.name.replace(/ /g, "_")}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
}

function loadRequestFromFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            populateFormFromData(data);
            saveToLocalStorage();
        } catch (error) {
            alert("Error: Could not load file. It may be invalid JSON.");
        }
    };
    reader.readAsText(file);
    event.target.value = null;
}

function submitToGoogleForm() {
    if (!validatePatientDetails()) return;
    const { patientDetails, medicationList } = getFormDataAsObject();
    if (medicationList.length === 0) { alert("Please add at least one medication."); return; }

    const medicationText = medicationList.map(med => `${med.name}~${med.dosage}~${med.freq}`).join("|");

    const formData = new FormData();
    formData.append(PATIENT_NAME_ENTRY, patientDetails.name);
    formData.append(PATIENT_EMAIL_ENTRY, patientDetails.email);
    formData.append(PATIENT_PHONE_NO, patientDetails.phone);
    formData.append(PATIENT_DOB_ENTRY, patientDetails.dob);
    formData.append(PATIENT_ADDRESS_ENTRY, patientDetails.address);
    formData.append(CHOSEN_PHARMACY_ENTRY, patientDetails.pharmacy);
    formData.append(COMMUNICATION_PREF_ENTRY, patientDetails.commPref);
    formData.append(MEDICATION_LIST_ENTRY, medicationText);

    fetch(GOOGLE_FORM_URL, { method: 'POST', body: formData, mode: 'no-cors' });

    document.getElementById('summaryModal').style.display = 'none';
    const ref = generateReferenceNumber();
    document.getElementById('formContainer').innerHTML = `<div class="success-message"><h2>Thank You!</h2><p>Your prescription request has been submitted.</p><p>Your reference number is: <strong>${ref}</strong></p><p>Please keep this for your records.</p></div>`;
}
