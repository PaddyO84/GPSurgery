const replySection = document.getElementById('reply-section');
if (replySection) {
    const replyForm = document.getElementById('replyForm');
    const submitButton = document.getElementById('submitButton');
    const statusDiv = document.getElementById('submission-status');

    document.addEventListener('DOMContentLoaded', () => {
        const urlParams = new URLSearchParams(window.location.search);
        const messageId = urlParams.get('id');
        if (messageId) {
            const messageIdInput = document.getElementsByName('messageId')[0];
            if(messageIdInput) messageIdInput.value = messageId;
            const subHeading = document.querySelector('.sub-heading strong');
            if(subHeading) subHeading.textContent = messageId;

            fetch(`${WEB_APP_URL}?action=getConversationData&id=${messageId}`)
                .then(response => response.json())
                .then(data => displayConversation(data))
                .catch(error => showError({ message: error.message }));
        } else {
            showError({ message: "No message ID found in the URL." });
        }
    });

    function displayConversation(data) {
        if (data.error) {
            showError(data);
        } else {
            const historyDiv = document.getElementById('conversation-history');
            if(historyDiv) historyDiv.textContent = data.conversationHistory;
        }
    }

    function showError(error) {
        if(replySection) replySection.style.display = 'none';
        if(statusDiv) {
            statusDiv.style.display = 'block';
            statusDiv.className = 'error';
            statusDiv.innerHTML = `<strong>Error:</strong> ${error.message}`;
        }
    }

    if (replyForm) {
        replyForm.addEventListener('submit', function(e) {
          e.preventDefault();

          if(submitButton) {
              submitButton.disabled = true;
              submitButton.textContent = 'Sending...';
          }

          const formData = new FormData(this);
          const data = {};
          formData.forEach((value, key) => data[key] = value);
          data.formType = 'replyMessage';

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
              onReplySuccess(response);
            } else {
              onReplyFailure(response);
            }
          })
          .catch(error => onReplyFailure({ message: error.message }));
        });
    }

    function onReplySuccess(response) {
      if(replySection) replySection.style.display = 'none';
      if(statusDiv) {
          statusDiv.style.display = 'block';
          statusDiv.className = 'success';
          statusDiv.innerHTML = '<h2>Thank You!</h2><p>Your reply has been sent successfully.</p>';
      }
    }

    function onReplyFailure(error) {
      if(statusDiv) {
          statusDiv.style.display = 'block';
          statusDiv.className = 'error';
          statusDiv.innerHTML = `<strong>Error:</strong> ${error.message}. Please try again.`;
      }
      if(submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = 'Send Reply';
      }
    }
}
