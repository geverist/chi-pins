// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Mobile menu toggle
const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
const navLinks = document.querySelector('.nav-links');

if (mobileMenuToggle) {
    mobileMenuToggle.addEventListener('click', () => {
        navLinks.classList.toggle('active');
    });
}

// Get UTM parameters from URL
function getUTMParams() {
    const urlParams = new URLSearchParams(window.location.search);
    return {
        utm_source: urlParams.get('utm_source') || null,
        utm_medium: urlParams.get('utm_medium') || null,
        utm_campaign: urlParams.get('utm_campaign') || null,
    };
}

// Demo form submission
const demoForm = document.getElementById('demoForm');

if (demoForm) {
    demoForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(demoForm);
        const data = Object.fromEntries(formData);

        // Add UTM parameters
        const utmParams = getUTMParams();
        Object.assign(data, utmParams);

        // Show loading state
        const submitButton = demoForm.querySelector('button[type="submit"]');
        const originalText = submitButton.textContent;
        submitButton.textContent = 'Submitting...';
        submitButton.disabled = true;

        try {
            // Submit to Supabase via API
            const response = await fetch('/api/submit-lead', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (response.ok) {
                // Show success message with personalization
                const successMessage = `Thank you, ${data.name}! 🎉\n\n` +
                    `We've received your request for ${data.company}.\n\n` +
                    `Our sales team will contact you within 24 hours to:\n` +
                    `• Schedule a personalized demo\n` +
                    `• Calculate your specific ROI\n` +
                    `• Discuss pricing for ${data.locations} location(s)\n\n` +
                    `Check your email for confirmation!`;

                alert(successMessage);

                // Reset form
                demoForm.reset();

                // Track conversion event (if analytics is set up)
                if (typeof gtag !== 'undefined') {
                    gtag('event', 'generate_lead', {
                        event_category: 'engagement',
                        event_label: data.industry,
                        value: parseInt(data.locations)
                    });
                }

                // Optional: Redirect to thank you page
                // window.location.href = '/thank-you.html?industry=' + data.industry;
            } else {
                throw new Error(result.error || 'Failed to submit form');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('There was an error submitting your request. Please try again or contact us directly:\n\n' +
                  'Email: hello@agentiosk.com\n' +
                  'Phone: (720) 702-2122');
        } finally {
            // Restore button state
            submitButton.textContent = originalText;
            submitButton.disabled = false;
        }
    });
}

// Vertical card click handlers
document.querySelectorAll('.vertical-card').forEach(card => {
    card.addEventListener('click', () => {
        const vertical = card.dataset.vertical;
        // In production, navigate to vertical-specific page
        console.log('Navigate to:', vertical);
    });
});

// Video placeholder click handlers
document.querySelectorAll('.video-placeholder').forEach(placeholder => {
    placeholder.addEventListener('click', () => {
        // In production, open video modal or redirect to YouTube
        alert('Demo video coming soon!');
    });
});

// Scroll-based navbar background
const nav = document.querySelector('.nav');
let lastScroll = 0;

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;

    if (currentScroll > 100) {
        nav.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
    } else {
        nav.style.boxShadow = 'none';
    }

    lastScroll = currentScroll;
});

// Intersection Observer for fade-in animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe all sections for animation
document.querySelectorAll('.vertical-card, .problem-card, .feature-item, .case-study-card').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
});

// Stats counter animation
const animateCounter = (element, target, duration = 2000) => {
    const start = 0;
    const increment = target / (duration / 16);
    let current = start;

    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            element.textContent = target.toLocaleString();
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(current).toLocaleString();
        }
    }, 16);
};

// Trigger counter animation when stats are visible
const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const statNumber = entry.target.querySelector('.stat-number');
            const targetValue = parseInt(statNumber.textContent.replace(/[^0-9]/g, ''));
            if (!statNumber.dataset.animated) {
                animateCounter(statNumber, targetValue);
                statNumber.dataset.animated = 'true';
            }
        }
    });
}, { threshold: 0.5 });

document.querySelectorAll('.stat').forEach(stat => {
    statsObserver.observe(stat);
});
