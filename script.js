// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const targetElement = document.querySelector(this.getAttribute('href'));
        if (targetElement) {
            targetElement.scrollIntoView({
                behavior: 'smooth'
            });
        }
    });
});

// Mobile Navigation Toggle
const mobileNavToggle = document.querySelector('.mobile-nav-toggle');
const primaryNav = document.querySelector('.primary-navigation');

if (mobileNavToggle && primaryNav) {
    mobileNavToggle.addEventListener('click', () => {
        const isVisible = primaryNav.getAttribute('data-visible') === 'true';
        primaryNav.setAttribute('data-visible', !isVisible);
        mobileNavToggle.setAttribute('aria-expanded', !isVisible);
    });
}


// AJAX Contact Form Submission
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
        formStatus.innerHTML = ''; // Clear previous status messages

        fetch(form.action, {
            method: 'POST',
            body: JSON.stringify(jsonData),
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        }).then(response => {
            if (response.ok) {
                // Success
                formStatus.innerHTML = `
                    <div class="success-message">
                        <h4>✅ Message Sent Successfully!</h4>
                        <p>Thanks! I'll personally respond within 4 hours.</p>
                        <a href="https://calendly.com/george-baxterlabs/30min" target="_blank" rel="noopener noreferrer">Or schedule a call now &rarr;</a>
                    </div>
                `;
                form.reset();
            } else {
                // Server-side error (e.g., 4xx, 5xx)
                response.json().then(data => {
                    const message = data.message || 'An unexpected error occurred.';
                    throw new Error(`Server Error: ${message}`);
                }).catch(() => {
                    throw new Error('An unexpected error occurred. Could not parse error response.');
                });
            }
        }).catch(error => {
            // Network error or other fetch-related issue
            formStatus.innerHTML = `
                <div class="error-message">
                    <h4>❌ Submission Failed</h4>
                    <p>There was a problem sending your message. Please try again later or contact me directly.</p>
                </div>
            `;
        }).finally(() => {
            // Re-enable the button regardless of success or failure
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;
        });
    });
}
