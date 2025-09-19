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
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(data)
      })
      .then(response => response.json())
      .then(response => {
        if (response.status === 'success') {
          onNewMessageSuccess(response);
        } else {
          onNewMessageFailure(response);
        }
      })
      .catch(error => onNewMessageFailure({ message: error.message }));
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
