// Custom JavaScript for the Carndonagh Health Centre website will go here.

// From new-message.js.html
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
      data.formType = 'newMessage'; // Add formType for doPost routing

      google.script.run
        .withSuccessHandler(onNewMessageSuccess)
        .withFailureHandler(onNewMessageFailure)
        .doPost({ postData: { contents: JSON.stringify(data), type: 'application/json' } });
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


// From reply.js.html
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
      data.formType = 'replyMessage'; // Add formType for doPost routing

      google.script.run
        .withSuccessHandler(onReplySuccess)
        .withFailureHandler(onReplyFailure)
        .doPost({ postData: { contents: JSON.stringify(data), type: 'application/json' } });
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

// dialog_reply_form.js.html
function sendReply() {
  const text = document.getElementById("replyText").value;
  if (!text.trim()) {
    return void alert("Reply cannot be empty.");
  }
  document.querySelector("button").disabled = true;
  google.script.run
    .withSuccessHandler(google.script.host.close)
    .withFailureHandler((e) => {
      alert("Failed: " + e.message);
      google.script.host.close();
    })
    .sendReplyFromSheet("<?= messageId ?>", text); // Note: messageId is raw here
}
