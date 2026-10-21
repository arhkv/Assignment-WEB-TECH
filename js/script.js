document.addEventListener('DOMContentLoaded', () => {

    function updateDateTime() {
        const datetimeDisplay = document.getElementById('datetime-display');
        if (datetimeDisplay) {
            const now = new Date();
            const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
            datetimeDisplay.textContent = now.toLocaleDateString('en-US', options);
        }
    }
    updateDateTime();
    setInterval(updateDateTime, 60000);

    const bgColorBtn = document.getElementById('bg-color-btn');
    if (bgColorBtn) {
        bgColorBtn.addEventListener('click', function() {
            const randomColor = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
            document.body.style.backgroundColor = randomColor;
        });
    }
document.querySelectorAll('.accordion-content-custom').forEach(item => item.style.display = 'block');
const accordionHeaders = document.querySelectorAll('.accordion-header-custom');
accordionHeaders.forEach(header => {
    header.addEventListener('click', function() {
        const content = this.nextElementSibling;
        const isOpen = content.classList.contains('open');

        document.querySelectorAll('.accordion-content-custom').forEach(item => {
            item.classList.remove('open');
            item.style.maxHeight = null;
        });
        accordionHeaders.forEach(h => h.classList.remove('active'));

        if (!isOpen) {
            content.classList.add('open');
            content.style.maxHeight = content.scrollHeight + 'px';
            this.classList.add('active');
        }
    });
});

    const modal = document.getElementById('popup-modal');
    const openPopupBtn = document.getElementById('open-popup-btn');
    const closeBtn = document.querySelector('.close-btn');

    if (openPopupBtn && modal && closeBtn) {
        openPopupBtn.addEventListener('click', () => {
            modal.style.display = 'flex';
        });

        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });

       
    }

    const form = document.getElementById('subscribe-form');
    const errorMsgContainer = document.getElementById('form-errors');

    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            errorMsgContainer.innerHTML = ''; 

            const email = document.getElementById('sub-email').value.trim();
            const password = document.getElementById('sub-password').value;
            const confirmPassword = document.getElementById('sub-confirm').value;
            
            let errors = [];

            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            if (!emailPattern.test(email)) {
                errors.push('• Please enter a valid email (no spaces, e.g. name@mail.com).');
            }
            if (password.length < 6) {
                errors.push('• Password must be at least 6 characters long.');
            }
            if (password !== confirmPassword) {
                errors.push('• Passwords do not match.');
            }

            if (errors.length > 0) {
                errorMsgContainer.innerHTML = errors.join('<br>');
            } else {
                alert('Subscription successful!');
                modal.style.display = 'none';
                form.reset();
            }
        });
    }
});