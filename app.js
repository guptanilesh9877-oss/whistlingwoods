// ============================================
// CORE APPLICATION — Celebrate Cinema 2026
// ============================================

// ──────────── STATE ────────────
let currentPage = 'landing';
let currentRegistration = null; // in-progress registration
let appliedCoupon = null;       // { code, discount }
let particles = null;
let scrollRevealer = null;
let countdownInterval = null;

// ──────────── INITIALIZATION ────────────
document.addEventListener('DOMContentLoaded', () => {
    // Init particles
    particles = new ParticleSystem('particles-canvas');

    // Init scroll reveal
    scrollRevealer = new ScrollRevealManager();
    scrollRevealer.observe('.reveal-up');

    // Init spotlight on hero
    initSpotlight(document.getElementById('hero-section'));

    // Ripple effects on all buttons
    document.addEventListener('click', e => {
        const btn = e.target.closest('.btn, .btn-small, .btn-primary');
        if (btn) createRipple(e);
    });

    // Navbar scroll behaviour
    initNavbarScroll();

    // Nav link clicks
    document.querySelectorAll('.nav-link[data-page]').forEach(link => {
        link.addEventListener('click', () => {
            const page = link.dataset.page;
            navigateTo(page);
        });
    });

    // Countdown timer
    startCountdown();

    // QR Placeholder
    drawQRPlaceholder();

    // Form handlers
    initRegistrationForm();
    initPaymentPage();
    initAdminLogin();

    // Read referral from URL
    readReferralFromURL();

    // Handle hash routing
    handleHashRoute();
    window.addEventListener('hashchange', handleHashRoute);

    // Show landing with animation
    requestAnimationFrame(() => {
        const landing = document.getElementById('page-landing');
        if (landing && landing.classList.contains('active')) {
            landing.classList.add('visible');
        }
    });
});

// ──────────── ROUTING ────────────
function navigateTo(page) {
    if (page === currentPage) return;

    // Admin guard
    if (page === 'admin' && !dataStore.isAdminAuthenticated()) {
        page = 'admin-login';
    }

    const current = document.getElementById('page-' + currentPage);
    const next = document.getElementById('page-' + page);
    if (!current || !next) return;

    // Fade out current
    current.classList.remove('visible');
    setTimeout(() => {
        current.classList.remove('active');

        // Show next
        next.classList.add('active');
        window.scrollTo({ top: 0, behavior: 'instant' });
        requestAnimationFrame(() => {
            next.classList.add('visible');
        });

        currentPage = page;
        updateNavLinks();
        window.location.hash = page;

        // Page-specific init
        onPageEnter(page);
    }, 300);
}

function handleHashRoute() {
    const hash = window.location.hash.replace('#', '') || 'landing';
    const validPages = ['landing', 'register', 'payment', 'confirmation', 'admin-login', 'admin', 'names'];
    const page = validPages.includes(hash) ? hash : 'landing';

    if (page !== currentPage) {
        const current = document.getElementById('page-' + currentPage);
        const next = document.getElementById('page-' + page);
        if (current) { current.classList.remove('active', 'visible'); }
        if (next) {
            next.classList.add('active');
            requestAnimationFrame(() => next.classList.add('visible'));
        }
        currentPage = page;
        updateNavLinks();
        onPageEnter(page);
    }
}

function onPageEnter(page) {
    if (page === 'landing') {
        scrollRevealer.observe('.reveal-up');
    }
    if (page === 'names') {
        renderNamesWall();
    }
    if (page === 'admin') {
        if (!dataStore.isAdminAuthenticated()) {
            navigateTo('admin-login');
            return;
        }
        renderAdminDashboard();
    }
    if (page === 'register') {
        updatePricingDisplay();
        // Pre-fill referral from URL
        const urlRef = new URLSearchParams(window.location.search).get('ref');
        if (urlRef) {
            const refInput = document.getElementById('reg-referral');
            if (refInput && !refInput.value) refInput.value = urlRef;
        }
    }
}

function updateNavLinks() {
    document.querySelectorAll('.nav-link[data-page]').forEach(link => {
        link.classList.toggle('active', link.dataset.page === currentPage);
    });
}

// ──────────── MOBILE NAV ────────────
function toggleMobileNav() {
    const overlay = document.getElementById('mobile-nav');
    const hamburger = document.getElementById('nav-hamburger');
    overlay.classList.toggle('open');
    hamburger.classList.toggle('open');
}

function navigateAndClose(page) {
    toggleMobileNav();
    navigateTo(page);
}

// ──────────── NAVBAR SCROLL ────────────
function initNavbarScroll() {
    const navbar = document.getElementById('navbar');
    let ticking = false;

    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(() => {
                navbar.classList.toggle('scrolled', window.scrollY > 60);
                ticking = false;
            });
            ticking = true;
        }
    });
}

// ──────────── COUNTDOWN TIMER ────────────
function startCountdown() {
    function update() {
        const now = new Date();
        const diff = CONFIG.EVENT_DATE - now;

        if (diff <= 0) {
            document.getElementById('cd-days').textContent = '00';
            document.getElementById('cd-hours').textContent = '00';
            document.getElementById('cd-mins').textContent = '00';
            document.getElementById('cd-secs').textContent = '00';
            return;
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const mins = Math.floor((diff / (1000 * 60)) % 60);
        const secs = Math.floor((diff / 1000) % 60);

        document.getElementById('cd-days').textContent = String(days).padStart(2, '0');
        document.getElementById('cd-hours').textContent = String(hours).padStart(2, '0');
        document.getElementById('cd-mins').textContent = String(mins).padStart(2, '0');
        document.getElementById('cd-secs').textContent = String(secs).padStart(2, '0');
    }

    update();
    countdownInterval = setInterval(update, 1000);
}

// ──────────── QR PLACEHOLDER ────────────
function drawQRPlaceholder() {
    const canvas = document.getElementById('qr-placeholder-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    // Draw a realistic-looking QR pattern
    const cellSize = 8;
    const margin = 20;
    const gridSize = Math.floor((w - margin * 2) / cellSize);

    // Seed for consistent pattern
    function seededRandom(seed) {
        let s = seed;
        return function() {
            s = (s * 16807) % 2147483647;
            return (s - 1) / 2147483646;
        };
    }
    const rng = seededRandom(42);

    ctx.fillStyle = '#000000';

    // Position detection patterns (3 corners)
    function drawFinderPattern(x, y) {
        const s = cellSize;
        // Outer
        ctx.fillRect(x, y, 7 * s, 7 * s);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + s, y + s, 5 * s, 5 * s);
        ctx.fillStyle = '#000000';
        ctx.fillRect(x + 2 * s, y + 2 * s, 3 * s, 3 * s);
    }

    const offsetX = margin;
    const offsetY = margin;

    drawFinderPattern(offsetX, offsetY);
    drawFinderPattern(offsetX + (gridSize - 7) * cellSize, offsetY);
    drawFinderPattern(offsetX, offsetY + (gridSize - 7) * cellSize);

    // Random data cells
    for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
            // Skip finder pattern areas
            const inTL = r < 8 && c < 8;
            const inTR = r < 8 && c >= gridSize - 8;
            const inBL = r >= gridSize - 8 && c < 8;
            if (inTL || inTR || inBL) continue;

            if (rng() > 0.5) {
                ctx.fillStyle = '#000000';
                ctx.fillRect(offsetX + c * cellSize, offsetY + r * cellSize, cellSize, cellSize);
            }
        }
    }

    // Overlay text
    ctx.fillStyle = 'rgba(175, 25, 150, 0.9)';
    ctx.font = 'bold 14px Poppins, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Draw semi-transparent background for text
    const textBg = 'rgba(255,255,255,0.92)';
    ctx.fillStyle = textBg;
    ctx.fillRect(w / 2 - 70, h / 2 - 14, 140, 28);
    ctx.fillStyle = '#af1996';
    ctx.fillText('UPI QR Code', w / 2, h / 2);
}

// ──────────── REGISTRATION FORM ────────────
function initRegistrationForm() {
    const form = document.getElementById('register-form');
    const couponBtn = document.getElementById('apply-coupon-btn');

    // Apply coupon
    couponBtn.addEventListener('click', applyCoupon);

    // Coupon input enter key
    document.getElementById('reg-coupon').addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); applyCoupon(); }
    });

    // Form submit
    form.addEventListener('submit', e => {
        e.preventDefault();
        handleRegistrationSubmit();
    });

    // Real-time validation styling
    ['reg-name', 'reg-email', 'reg-phone', 'reg-college'].forEach(id => {
        const input = document.getElementById(id);
        input.addEventListener('blur', () => validateField(input));
        input.addEventListener('input', () => {
            input.classList.remove('error');
        });
    });
}

function applyCoupon() {
    const input = document.getElementById('reg-coupon');
    const msg = document.getElementById('coupon-message');
    const code = input.value.trim();

    if (!code) {
        msg.textContent = 'Please enter a coupon code';
        msg.className = 'form-message error';
        return;
    }

    const result = dataStore.validateCoupon(code);
    if (result.valid) {
        appliedCoupon = { code: result.code, discount: result.discount };
        msg.textContent = `✓ Coupon applied! You save ₹${result.discount}`;
        msg.className = 'form-message success';
        input.classList.add('success');
        input.classList.remove('error');
    } else {
        appliedCoupon = null;
        msg.textContent = '✗ Invalid or expired coupon code';
        msg.className = 'form-message error';
        input.classList.add('error');
        input.classList.remove('success');
    }

    updatePricingDisplay();
}

function updatePricingDisplay() {
    const couponCode = appliedCoupon ? appliedCoupon.code : '';
    const pricing = dataStore.calculatePrice(couponCode);

    document.getElementById('price-base').textContent = '₹' + pricing.basePrice;
    document.getElementById('price-discount').textContent = '−₹' + pricing.earlyBird;

    const couponLine = document.getElementById('coupon-price-line');
    if (pricing.couponValid && pricing.couponDiscount > 0) {
        couponLine.style.display = 'flex';
        document.getElementById('coupon-code-display').textContent = couponCode;
        document.getElementById('price-coupon').textContent = '−₹' + pricing.couponDiscount;
    } else {
        couponLine.style.display = 'none';
    }

    document.getElementById('price-total').textContent = '₹' + pricing.finalPrice;

    // Also update payment page amount
    const paymentDisplay = document.getElementById('payment-amount-display');
    if (paymentDisplay) paymentDisplay.textContent = '₹' + pricing.finalPrice;
}

function validateField(input) {
    const value = input.value.trim();
    let valid = true;

    if (input.required && !value) {
        valid = false;
    }

    if (input.type === 'email' && value) {
        valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    }

    if (input.type === 'tel' && value) {
        valid = /^[\d\s\+\-()]{10,15}$/.test(value.replace(/\s/g, ''));
    }

    input.classList.toggle('error', !valid);
    return valid;
}

function handleRegistrationSubmit() {
    const fields = {
        name: document.getElementById('reg-name'),
        email: document.getElementById('reg-email'),
        phone: document.getElementById('reg-phone'),
        year: document.getElementById('reg-year'),
        college: document.getElementById('reg-college'),
    };

    // Validate all
    let allValid = true;
    Object.values(fields).forEach(input => {
        if (!validateField(input)) allValid = false;
    });

    if (!fields.year.value) {
        fields.year.classList.add('error');
        allValid = false;
    }

    if (!allValid) {
        showToast('Please fill in all required fields correctly', 'error');
        return;
    }

    // Calculate price
    const couponCode = appliedCoupon ? appliedCoupon.code : '';
    const pricing = dataStore.calculatePrice(couponCode);
    const referralCode = document.getElementById('reg-referral').value.trim();

    // Check duplicate email
    const existing = dataStore.getRegistrations().find(
        r => r.email === fields.email.value.trim().toLowerCase()
    );
    if (existing) {
        showToast('This email is already registered!', 'error');
        return;
    }

    // Save registration (without payment info yet)
    currentRegistration = dataStore.addRegistration({
        name: fields.name.value.trim(),
        email: fields.email.value.trim(),
        phone: fields.phone.value.trim(),
        year: fields.year.value,
        college: fields.college.value.trim(),
        referredBy: referralCode,
        couponUsed: couponCode,
        couponDiscount: pricing.couponDiscount,
        finalPrice: pricing.finalPrice
    });

    // Update payment amount display
    document.getElementById('payment-amount-display').textContent = '₹' + pricing.finalPrice;

    // Navigate to payment
    navigateTo('payment');
}

// ──────────── PAYMENT PAGE ────────────
function initPaymentPage() {
    const zone = document.getElementById('screenshot-zone');
    const fileInput = document.getElementById('screenshot-input');
    const confirmBtn = document.getElementById('confirm-payment-btn');

    // Click to upload
    zone.addEventListener('click', () => fileInput.click());

    // Drag & drop
    zone.addEventListener('dragover', e => {
        e.preventDefault();
        zone.classList.add('dragover');
    });

    zone.addEventListener('dragleave', () => {
        zone.classList.remove('dragover');
    });

    zone.addEventListener('drop', e => {
        e.preventDefault();
        zone.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            handleScreenshotUpload(file);
        }
    });

    // File input change
    fileInput.addEventListener('change', () => {
        if (fileInput.files[0]) {
            handleScreenshotUpload(fileInput.files[0]);
        }
    });

    // Confirm payment
    confirmBtn.addEventListener('click', handlePaymentConfirm);
}

function handleScreenshotUpload(file) {
    if (!file || !file.type.startsWith('image/')) {
        showToast('Please upload an image file (PNG, JPG, etc.)', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_DIM = 1000;
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > MAX_DIM) {
                    height = Math.round((height * MAX_DIM) / width);
                    width = MAX_DIM;
                }
            } else {
                if (height > MAX_DIM) {
                    width = Math.round((width * MAX_DIM) / height);
                    height = MAX_DIM;
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.78);

            const preview = document.getElementById('screenshot-preview');
            const content = document.getElementById('upload-content');
            preview.src = compressedDataUrl;
            preview.style.display = 'block';
            content.style.display = 'none';

            // Save to current registration
            if (currentRegistration) {
                dataStore.updateRegistration(currentRegistration.id, {
                    paymentScreenshot: compressedDataUrl
                });
            }
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function handlePaymentConfirm() {
    const txnId = document.getElementById('txn-id').value.trim();

    if (!txnId) {
        showToast('Please enter your transaction ID', 'error');
        document.getElementById('txn-id').classList.add('error');
        return;
    }

    if (!currentRegistration) {
        showToast('Registration data not found. Please register again.', 'error');
        navigateTo('register');
        return;
    }

    // Update registration with payment info
    dataStore.updateRegistration(currentRegistration.id, {
        transactionId: txnId
    });

    // Populate confirmation ticket
    populateConfirmation(currentRegistration);

    // Navigate to confirmation
    navigateTo('confirmation');

    // Fire confetti!
    setTimeout(() => ConfettiBurst.fire(150), 500);

    // Reset form state for next registration
    resetRegistrationForm();
}

function populateConfirmation(reg) {
    document.getElementById('ticket-name').textContent = reg.name;
    document.getElementById('ticket-id').textContent = reg.id;
    document.getElementById('ticket-amount').textContent = '₹' + reg.finalPrice;
    
    // Status text
    const statusEl = document.getElementById('ticket-status');
    if (statusEl) {
        statusEl.textContent = reg.verified ? 'Payment Verified ✓' : 'Verification Pending';
        statusEl.className = reg.verified ? 'ticket-value status-verified' : 'ticket-value status-pending';
    }

    // Generate Ticket QR code
    generateTicketQR(reg);

    // Generate referral link
    const baseURL = window.location.origin + window.location.pathname;
    const referralLink = baseURL + '?ref=' + reg.referralCode + '#register';
    document.getElementById('referral-link-input').value = referralLink;
}

function generateTicketQR(reg) {
    const container = document.getElementById('ticket-qr-container');
    if (!container) return;
    container.innerHTML = '';

    const qrData = JSON.stringify({
        id: reg.id,
        name: reg.name,
        college: reg.college,
        event: 'CC2026'
    });

    if (window.QRCode && typeof window.QRCode.toCanvas === 'function') {
        const canvas = document.createElement('canvas');
        window.QRCode.toCanvas(canvas, qrData, {
            width: 190,
            margin: 2,
            color: {
                dark: '#2d0a27',
                light: '#ffffff'
            }
        }, err => {
            if (!err) {
                container.appendChild(canvas);
            } else {
                renderQRCanvasFallback(container, reg.id);
            }
        });
    } else {
        renderQRCanvasFallback(container, reg.id);
    }
}

function renderQRCanvasFallback(container, text) {
    const canvas = document.createElement('canvas');
    canvas.width = 190;
    canvas.height = 190;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 190, 190);

    // Simple visual pattern representation
    ctx.fillStyle = '#af1996';
    ctx.font = 'bold 12px Poppins, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ENTRY PASS', 95, 30);
    ctx.fillStyle = '#111111';
    ctx.font = 'bold 15px monospace';
    ctx.fillText(text, 95, 95);
    ctx.fillStyle = '#666666';
    ctx.font = '11px Poppins, sans-serif';
    ctx.fillText('Scan at WWI Gate', 95, 140);
    container.appendChild(canvas);
}

function resetRegistrationForm() {
    const form = document.getElementById('register-form');
    form.reset();
    appliedCoupon = null;
    document.getElementById('coupon-message').textContent = '';
    document.getElementById('coupon-price-line').style.display = 'none';
    document.getElementById('price-total').textContent = '₹150';
    document.getElementById('screenshot-preview').style.display = 'none';
    document.getElementById('upload-content').style.display = '';
    document.getElementById('txn-id').value = '';

    // Clear validation classes
    form.querySelectorAll('.form-input').forEach(input => {
        input.classList.remove('error', 'success');
    });
}

// ──────────── REFERRAL SYSTEM ────────────
function readReferralFromURL() {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
        // Pre-fill referral code when on register page
        const refInput = document.getElementById('reg-referral');
        if (refInput) refInput.value = ref;
        // Auto-navigate to register
        setTimeout(() => navigateTo('register'), 100);
    }
}

function copyReferralLink() {
    const input = document.getElementById('referral-link-input');
    navigator.clipboard.writeText(input.value).then(() => {
        showToast('Referral link copied!', 'success');
        const btn = document.getElementById('copy-referral-btn');
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.textContent = 'Copy'; }, 2000);
    }).catch(() => {
        // Fallback
        input.select();
        document.execCommand('copy');
        showToast('Referral link copied!', 'success');
    });
}

function shareWhatsApp() {
    const link = document.getElementById('referral-link-input').value;
    const text = `🎬 Hey! I just registered for Celebrate Cinema 2026 at Whistling Woods International! Join me — use my referral link: ${link}`;
    window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
}

function shareTwitter() {
    const link = document.getElementById('referral-link-input').value;
    const text = `🎬 Just registered for Celebrate Cinema 2026 @Whistling_Woods! Join the celebration of Indian cinema! 🍿`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(link)}`, '_blank');
}

// ──────────── NAMES WALL ────────────
function renderNamesWall() {
    const grid = document.getElementById('names-grid');
    const noData = document.getElementById('no-names');
    const counter = document.getElementById('names-total-count');
    const regs = dataStore.getRegistrations();

    grid.innerHTML = '';

    if (regs.length === 0) {
        noData.style.display = 'block';
        grid.style.display = 'none';
        counter.textContent = '0';
        return;
    }

    noData.style.display = 'none';
    grid.style.display = 'grid';

    const gradients = [
        'linear-gradient(135deg, #af1996, #e91e8c)',
        'linear-gradient(135deg, #4a1942, #8a1478)',
        'linear-gradient(135deg, #d4a843, #e8c060)',
        'linear-gradient(135deg, #e91e8c, #ff6b9d)',
        'linear-gradient(135deg, #8a1478, #c44dff)',
        'linear-gradient(135deg, #af1996, #d4a843)',
    ];

    regs.forEach((reg, i) => {
        const card = document.createElement('div');
        card.className = 'name-card';
        card.style.transitionDelay = (i * 60) + 'ms';

        const initial = reg.name.charAt(0).toUpperCase();
        const gradient = gradients[i % gradients.length];

        card.innerHTML = `
            <div class="name-card-initial" style="background: ${gradient};">${initial}</div>
            <div class="name-card-name">${escapeHTML(reg.name)}</div>
        `;

        grid.appendChild(card);
    });

    // Animate counter
    animateCounter(counter, regs.length, 1200);

    // Stagger reveal cards
    requestAnimationFrame(() => {
        document.querySelectorAll('.name-card').forEach((card, i) => {
            setTimeout(() => card.classList.add('revealed'), i * 60);
        });
    });
}

// ──────────── ADMIN LOGIN ────────────
function initAdminLogin() {
    const form = document.getElementById('admin-login-form');
    form.addEventListener('submit', e => {
        e.preventDefault();
        const password = document.getElementById('admin-password-input').value;
        const errorEl = document.getElementById('admin-login-error');

        if (dataStore.adminLogin(password)) {
            errorEl.style.display = 'none';
            navigateTo('admin');
        } else {
            errorEl.style.display = 'block';
            document.getElementById('admin-password-input').classList.add('error');
            setTimeout(() => {
                document.getElementById('admin-password-input').classList.remove('error');
            }, 1500);
        }
    });
}

function handleAdminLogout() {
    dataStore.adminLogout();
    navigateTo('landing');
    showToast('Logged out successfully', 'info');
}

// ──────────── TOAST NOTIFICATIONS ────────────
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');

    // Remove existing
    const existing = container.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3500);
}

// ──────────── UTILITIES ────────────
function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
