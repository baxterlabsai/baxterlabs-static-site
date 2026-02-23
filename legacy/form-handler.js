document.addEventListener('DOMContentLoaded', function() {
    const contactForm = document.getElementById('contact-form');
    const formStatus = document.getElementById('form-status');

    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const form = e.target;
            const data = new FormData(form);
            const jsonData = {};
            data.forEach((value, key) => {
                jsonData[key] = value;
            });

            const submitButton = form.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.innerHTML;
            submitButton.disabled = true;
            submitButton.innerHTML = '<span class="loader"></span> Sending...';
            formStatus.innerHTML = '';

            fetch(form.action, {
                method: 'POST',
                body: JSON.stringify(jsonData),
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            }).then(response => {
                if (response.ok) {
                    formStatus.innerHTML = `
                        <div class="success-message">
                            <h4>✅ Message Sent Successfully!</h4>
                            <p>Thanks! I'll personally respond within 4 hours.</p>
                            <a href="https://calendly.com/george-baxterlabs/30min" target="_blank" rel="noopener noreferrer">Or schedule a call now &rarr;</a>
                        </div>
                    `;
                    form.reset();
                } else {
                    throw new Error('Server responded with an error.');
                }
            }).catch(error => {
                formStatus.innerHTML = `
                    <div class="error-message">
                        <h4>❌ Submission Failed</h4>
                        <p>There was a problem sending your message. Please try again later.</p>
                    </div>
                `;
            }).finally(() => {
                submitButton.disabled = false;
                submitButton.innerHTML = originalButtonText;
            });
        });
    }
});
