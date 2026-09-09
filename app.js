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
    initFindPass();

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
    const rawHash = (window.location.hash || '').replace(/^#/, '');
    const cleanHash = rawHash.split('?')[0].split('&')[0] || 'landing';
    const validPages = ['landing', 'register', 'payment', 'confirmation', 'admin-login', 'admin', 'names', 'find-pass'];
    const page = validPages.includes(cleanHash) ? cleanHash : 'landing';

    // Also check referral in case query parameters are in hash
    readReferralFromURL();

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
        // Pre-fill referral from URL or session storage
        let ref = new URLSearchParams(window.location.search).get('ref');
        if (!ref && window.location.hash.includes('ref=')) {
            const hashParts = window.location.hash.split(/[?&]/);
            for (const part of hashParts) {
                if (part.startsWith('ref=')) {
                    ref = decodeURIComponent(part.substring(4));
                    break;
                }
            }
        }
        if (!ref) {
            try { ref = sessionStorage.getItem('cc2026_referral'); } catch (e) {}
        }
        if (ref) {
            const refInput = document.getElementById('reg-referral');
            if (refInput && !refInput.value) {
                refInput.value = ref.trim().toUpperCase();
            }
        }
    }
    if (page === 'find-pass') {
        // Clear previous result when navigating to page
        const input = document.getElementById('fp-search-input');
        if (input) input.focus();
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
            document.querySelectorAll('#cd-days, .cd-days').forEach(el => el.textContent = '00');
            document.querySelectorAll('#cd-hours, .cd-hours').forEach(el => el.textContent = '00');
            document.querySelectorAll('#cd-mins, .cd-mins').forEach(el => el.textContent = '00');
            document.querySelectorAll('#cd-secs, .cd-secs').forEach(el => el.textContent = '00');
            return;
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const mins = Math.floor((diff / (1000 * 60)) % 60);
        const secs = Math.floor((diff / 1000) % 60);

        const dStr = String(days).padStart(2, '0');
        const hStr = String(hours).padStart(2, '0');
        const mStr = String(mins).padStart(2, '0');
        const sStr = String(secs).padStart(2, '0');

        document.querySelectorAll('#cd-days, .cd-days').forEach(el => el.textContent = dStr);
        document.querySelectorAll('#cd-hours, .cd-hours').forEach(el => el.textContent = hStr);
        document.querySelectorAll('#cd-mins, .cd-mins').forEach(el => el.textContent = mStr);
        document.querySelectorAll('#cd-secs, .cd-secs').forEach(el => el.textContent = sStr);
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
    ctx.fillStyle = 'rgba(141, 106, 174, 0.9)';
    ctx.font = "bold 14px 'Helvetica Custom', 'Poppins', sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Draw semi-transparent background for text
    const textBg = 'rgba(255,255,255,0.92)';
    ctx.fillStyle = textBg;
    ctx.fillRect(w / 2 - 70, h / 2 - 14, 140, 28);
    ctx.fillStyle = '#8d6aae';
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

    // Retry loop — CDN may load slightly after page render
    function tryGenerate(qrDataStr, targetContainer, attempts) {
        if (window.QRCode && typeof window.QRCode.toCanvas === 'function') {
            const canvas = document.createElement('canvas');
            window.QRCode.toCanvas(canvas, qrDataStr, {
                width: 200,
                margin: 2,
                errorCorrectionLevel: 'M',
                color: {
                    dark: '#12121e',
                    light: '#ffffff'
                }
            }, err => {
                if (!err) {
                    targetContainer.appendChild(canvas);
                } else {
                    console.warn('QRCode.toCanvas error:', err);
                    renderQRCanvasFallback(targetContainer, reg.id);
                }
            });
        } else if (attempts > 0) {
            setTimeout(() => tryGenerate(qrDataStr, targetContainer, attempts - 1), 250);
        } else {
            renderQRCanvasFallback(targetContainer, reg.id);
        }
    }

    // Defer slightly to ensure DOM is painted and lib is loaded
    setTimeout(() => tryGenerate(qrData, container, 12), 60);
}

function renderQRCanvasFallback(container, text) {
    const canvas = document.createElement('canvas');
    canvas.width = 190;
    canvas.height = 190;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 190, 190);

    // Simple visual pattern representation
    ctx.fillStyle = '#8d6aae';
    ctx.font = "bold 12px 'Helvetica Custom', 'Poppins', sans-serif";
    ctx.textAlign = 'center';
    ctx.fillText('ENTRY PASS', 95, 30);
    ctx.fillStyle = '#111111';
    ctx.font = 'bold 15px monospace';
    ctx.fillText(text, 95, 95);
    ctx.fillStyle = '#666666';
    ctx.font = "11px 'Helvetica Custom', 'Poppins', sans-serif";
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
    let ref = new URLSearchParams(window.location.search).get('ref');
    if (!ref && window.location.hash.includes('ref=')) {
        const hashParts = window.location.hash.split(/[?&]/);
        for (const part of hashParts) {
            if (part.startsWith('ref=')) {
                ref = decodeURIComponent(part.substring(4));
                break;
            }
        }
    }
    if (!ref) {
        try { ref = sessionStorage.getItem('cc2026_referral'); } catch (e) {}
    }
    if (ref) {
        const cleanRef = ref.trim().toUpperCase();
        try { sessionStorage.setItem('cc2026_referral', cleanRef); } catch (e) {}
        // Pre-fill referral code when on register page
        const refInput = document.getElementById('reg-referral');
        if (refInput && !refInput.value) refInput.value = cleanRef;

        // Auto-navigate to register if arrived on landing with ref in URL and no explicit other page
        if ((window.location.search.includes('ref=') || window.location.hash.includes('ref=')) && 
            (currentPage === 'landing' || window.location.hash.includes('register'))) {
            setTimeout(() => {
                if (currentPage !== 'register') navigateTo('register');
            }, 100);
        }
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
        'linear-gradient(135deg, #8d6aae, #6b4e8a)',
        'linear-gradient(135deg, #8d6aae, #a882c8)',
        'linear-gradient(135deg, #f7e7c5, #e0cfa5)',
        'linear-gradient(135deg, #6b4e8a, #8d7ea4)',
        'linear-gradient(135deg, #a882c8, #f7e7c5)',
        'linear-gradient(135deg, #8d6aae, #f7e7c5)',
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

// ──────────── UPI PAYMENT ACTIONS ────────────
function openUPIApp() {
    const amountEl = document.getElementById('payment-amount-display');
    const amount = amountEl ? amountEl.textContent.replace(/[₹,]/g, '').trim() : '150';
    const upiVpa = CONFIG.UPI_VPA || 'vigorlaunchpad@ybl';
    const payeeName = encodeURIComponent(CONFIG.UPI_PAYEE_NAME || 'Vigor LaunchPad');
    const note = encodeURIComponent('Celebrate Cinema 2026 Academic Trek');
    const upiUrl = `upi://pay?pa=${upiVpa}&pn=${payeeName}&am=${amount}&cu=INR&tn=${note}`;

    // On mobile, this opens the UPI app chooser
    // On desktop it usually does nothing visible — show toast explaining
    const a = document.createElement('a');
    a.href = upiUrl;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    showToast(`Opening UPI app for ₹${amount} payment...`, 'info');
}

function copyUPIID() {
    const upiVpa = CONFIG.UPI_VPA || 'vigorlaunchpad@ybl';
    const btn = document.getElementById('copy-upi-btn');

    const doFallback = () => {
        const ta = document.createElement('textarea');
        ta.value = upiVpa;
        ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
    };

    const onSuccess = () => {
        showToast(`UPI ID copied: ${upiVpa}`, 'success');
        if (btn) {
            btn.classList.add('copied');
            const orig = btn.innerHTML;
            btn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:16px;height:16px;">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                Copied!`;
            setTimeout(() => { btn.innerHTML = orig; btn.classList.remove('copied'); }, 2500);
        }
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(upiVpa).then(onSuccess).catch(() => { doFallback(); onSuccess(); });
    } else {
        doFallback();
        onSuccess();
    }
}

// ──────────── FIND MY PASS ────────────
let _foundPassReg = null;  // currently displayed pass in find-pass page

function initFindPass() {
    const input = document.getElementById('fp-search-input');
    if (!input) return;
    // already wired via onkeydown in HTML, nothing else needed
}

function findPassByContact() {
    const input = document.getElementById('fp-search-input');
    const msgEl = document.getElementById('fp-message');
    const resultArea = document.getElementById('fp-result-area');
    const btn = document.getElementById('fp-search-btn');

    if (!input) return;
    const query = input.value.trim().toLowerCase().replace(/[\s\-()]/g, '');

    if (!query) {
        msgEl.textContent = 'Please enter your phone number or email address';
        msgEl.className = 'form-message error';
        input.classList.add('error');
        return;
    }

    input.classList.remove('error');
    msgEl.textContent = 'Searching...';
    msgEl.className = 'form-message';
    if (btn) { btn.textContent = '...'; btn.disabled = true; }

    // Trigger a fresh Supabase sync then search
    const search = () => {
        const regs = dataStore.getRegistrations();
        const found = regs.find(r => {
            const phone = (r.phone || '').replace(/[\s\-()]/g, '');
            const email = (r.email || '').toLowerCase();
            return phone.includes(query) || email === query || phone === query;
        });

        if (btn) { btn.textContent = 'Search'; btn.disabled = false; }

        if (found) {
            _foundPassReg = found;
            renderFoundTicket(found);
            msgEl.textContent = `✓ Pass found for ${found.name}`;
            msgEl.className = 'form-message success';
            resultArea.style.display = 'flex';
            // Smooth scroll to result
            setTimeout(() => resultArea.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
        } else {
            _foundPassReg = null;
            resultArea.style.display = 'none';
            msgEl.textContent = '✗ No registration found with that phone or email. Double-check and try again, or contact +91 86992 60386.';
            msgEl.className = 'form-message error';
        }
    };

    // Allow Supabase sync to complete (if connected) then search
    if (dataStore.supabaseClient) {
        dataStore.syncFromSupabase().then(() => search()).catch(() => search());
    } else {
        setTimeout(search, 100);
    }
}

function renderFoundTicket(reg) {
    // Populate text fields
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('fp-ticket-name', reg.name);
    set('fp-ticket-id', reg.id);
    set('fp-ticket-college', reg.college);
    set('fp-ticket-amount', '₹' + reg.finalPrice);

    const statusEl = document.getElementById('fp-ticket-status');
    if (statusEl) {
        statusEl.textContent = reg.verified ? 'Payment Verified ✓' : 'Verification Pending';
        statusEl.className = reg.verified
            ? 'ticket-value status-verified'
            : 'ticket-value status-pending';
    }

    // Generate QR in fp-qr-container
    const container = document.getElementById('fp-qr-container');
    if (container) {
        container.innerHTML = '';
        const qrData = JSON.stringify({ id: reg.id, name: reg.name, college: reg.college, event: 'CC2026' });

        function tryFpQR(attempts) {
            if (window.QRCode && typeof window.QRCode.toCanvas === 'function') {
                const canvas = document.createElement('canvas');
                window.QRCode.toCanvas(canvas, qrData, {
                    width: 200, margin: 2, errorCorrectionLevel: 'M',
                    color: { dark: '#12121e', light: '#ffffff' }
                }, err => {
                    if (!err) { container.appendChild(canvas); }
                    else { renderQRCanvasFallback(container, reg.id); }
                });
            } else if (attempts > 0) {
                setTimeout(() => tryFpQR(attempts - 1), 250);
            } else {
                renderQRCanvasFallback(container, reg.id);
            }
        }
        setTimeout(() => tryFpQR(12), 60);
    }
}

function shareFoundPassWhatsApp() {
    if (!_foundPassReg) return;
    const reg = _foundPassReg;
    const text = `🎬 *Celebrate Cinema 2026 — Academic Trek*\n` +
        `📋 Pass ID: ${reg.id}\n` +
        `👤 Name: ${reg.name}\n` +
        `📅 Dates: 08th & 09th October 2026\n` +
        `📍 Venue: Whistling Woods International, Film City\n` +
        `✅ Status: ${reg.verified ? 'Verified' : 'Pending Verification'}\n\n` +
        `Present your QR pass at the WWI gate.`;
    window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
}

// ──────────── SAVE PASS AS IMAGE ────────────
function savePassAsImage(source) {
    // source: 'confirm' = confirmation page, 'fp' = find-pass page
    const reg = (source === 'fp') ? _foundPassReg : currentRegistration;
    if (!reg) {
        showToast('No ticket data available to save', 'error');
        return;
    }

    const qrContainerId = (source === 'fp') ? 'fp-qr-container' : 'ticket-qr-container';
    const qrCanvas = document.querySelector(`#${qrContainerId} canvas`);

    const W = 620, H = (qrCanvas ? 920 : 780);
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    // ── Background ──
    const bgGrad = ctx.createLinearGradient(0, 0, W, H);
    bgGrad.addColorStop(0, '#12121e');
    bgGrad.addColorStop(0.5, '#1e1830');
    bgGrad.addColorStop(1, '#12121e');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Subtle radial glow top-left
    const glow1 = ctx.createRadialGradient(0, 0, 0, 0, 0, 350);
    glow1.addColorStop(0, 'rgba(141,106,174,0.35)');
    glow1.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow1;
    ctx.fillRect(0, 0, W, H);

    // ── Border ──
    ctx.strokeStyle = 'rgba(247,231,197,0.6)';
    ctx.lineWidth = 2;
    roundRect(ctx, 14, 14, W - 28, H - 28, 14);
    ctx.stroke();

    // ── Header band ──
    const headerGrad = ctx.createLinearGradient(0, 0, W, 0);
    headerGrad.addColorStop(0, 'rgba(141,106,174,0.45)');
    headerGrad.addColorStop(1, 'rgba(23,19,42,0.85)');
    ctx.fillStyle = headerGrad;
    roundRectFill(ctx, 14, 14, W - 28, 90, 14, 0);

    // ── Event title ──
    ctx.fillStyle = '#f7e7c5';
    ctx.font = "bold 20px 'Integral CF', 'Helvetica Custom', sans-serif";
    ctx.textAlign = 'center';
    ctx.fillText('CELEBRATE CINEMA 2026', W / 2, 56);
    ctx.font = "600 12px 'Helvetica Custom', 'Poppins', sans-serif";
    ctx.fillStyle = '#a882c8';
    ctx.letterSpacing = '3px';
    ctx.fillText('THE ACADEMIC TREK  •  OFFICIAL ENTRY PASS', W / 2, 82);

    // ── Gold divider ──
    ctx.strokeStyle = 'rgba(247,231,197,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(40, 112); ctx.lineTo(W - 40, 112); ctx.stroke();

    // ── Detail rows ──
    const rows = [
        ['Attendee Name', reg.name],
        ['Registration ID', reg.id],
        ['Trek Dates', '08th & 09th October 2026'],
        ['Time', '9:00 AM – 5:00 PM IST'],
        ['Venue', 'WWI, Film City, Goregaon East, Mumbai'],
        ['College', reg.college],
        ['Amount Paid', '\u20B9' + reg.finalPrice],
        ['Payment Status', reg.verified ? 'Verified \u2713' : 'Pending Verification']
    ];

    let y = 140;
    const labelX = 50, valueX = W - 50;
    rows.forEach(([label, value], i) => {
        // Alternate row bg
        if (i % 2 === 0) {
            ctx.fillStyle = 'rgba(255,255,255,0.03)';
            ctx.fillRect(26, y - 16, W - 52, 36);
        }
        ctx.font = "500 12px 'Helvetica Custom', 'Poppins', sans-serif";
        ctx.fillStyle = 'rgba(247,231,197,0.6)';
        ctx.textAlign = 'left';
        ctx.fillText(label.toUpperCase(), labelX, y);

        ctx.font = "600 14px 'Helvetica Custom', 'Poppins', sans-serif";
        ctx.fillStyle = (label === 'Payment Status' && reg.verified)
            ? '#10b981'
            : (label === 'Trek Dates' ? '#f7e7c5' : '#ffffff');
        ctx.textAlign = 'right';
        ctx.fillText(value, valueX, y);
        y += 42;
    });

    // ── Dashed divider ──
    y += 10;
    ctx.setLineDash([6, 8]);
    ctx.strokeStyle = 'rgba(247,231,197,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(40, y); ctx.lineTo(W - 40, y); ctx.stroke();
    ctx.setLineDash([]);

    // ── QR Section ──
    y += 24;
    ctx.fillStyle = '#f7e7c5';
    ctx.font = "bold 11px 'Integral CF', 'Helvetica Custom', sans-serif";
    ctx.textAlign = 'center';
    ctx.fillText('OFFICIAL ENTRY PASS QR CODE', W / 2, y);
    y += 18;

    if (qrCanvas) {
        // Draw QR with white background box
        const qrSize = 200;
        const qrX = (W - qrSize) / 2;
        ctx.fillStyle = '#ffffff';
        roundRectFill(ctx, qrX - 10, y - 6, qrSize + 20, qrSize + 20, 10, 10);
        ctx.drawImage(qrCanvas, qrX, y + 4, qrSize, qrSize);
        y += qrSize + 28;
    } else {
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect((W - 160) / 2, y, 160, 160);
        ctx.fillStyle = 'rgba(247,231,197,0.5)';
        ctx.font = "12px 'Helvetica Custom', 'Poppins', sans-serif";
        ctx.fillText('[QR not yet generated]', W / 2, y + 85);
        y += 175;
    }

    ctx.fillStyle = 'rgba(247,231,197,0.5)';
    ctx.font = "11px 'Helvetica Custom', 'Poppins', sans-serif";
    ctx.textAlign = 'center';
    ctx.fillText('Scan at Whistling Woods International Entry Gate', W / 2, y + 8);

    // ── Footer ──
    ctx.fillStyle = 'rgba(247,231,197,0.45)';
    ctx.font = "10px 'Helvetica Custom', 'Poppins', sans-serif";
    ctx.fillText('Celebrate Cinema 2026  •  Whistling Woods International, Film City, Mumbai', W / 2, H - 24);

    // ── Download ──
    try {
        const link = document.createElement('a');
        const safeName = (reg.name || 'pass').replace(/[^a-zA-Z0-9]/g, '_');
        link.download = `CC2026_Pass_${safeName}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        showToast('Pass saved as image! Check your downloads.', 'success');
    } catch (e) {
        console.error('Save pass error:', e);
        showToast('Could not save image. Try screenshotting instead.', 'error');
    }
}

// Canvas helper: stroke a rounded rect path
function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

// Canvas helper: fill top-radius or full rounded rect
function roundRectFill(ctx, x, y, w, h, rTop, rBot) {
    const rt = rTop || 0;
    const rb = (rBot !== undefined) ? rBot : rt;
    ctx.beginPath();
    ctx.moveTo(x + rt, y);
    ctx.lineTo(x + w - rt, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rt);
    ctx.lineTo(x + w, y + h - rb);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rb, y + h);
    ctx.lineTo(x + rb, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rb);
    ctx.lineTo(x, y + rt);
    ctx.quadraticCurveTo(x, y, x + rt, y);
    ctx.closePath();
    ctx.fill();
}
