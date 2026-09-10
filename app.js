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
    ctx.font = "bold 14px 'Inter', 'Plus Jakarta Sans', sans-serif";
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
    ['reg-name', 'reg-email', 'reg-phone', 'reg-college', 'reg-year', 'reg-visit-date'].forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('blur', () => validateField(input));
            input.addEventListener('input', () => {
                input.classList.remove('error');
            });
            input.addEventListener('change', () => {
                input.classList.remove('error');
            });
        }
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

    const priceBase = document.getElementById('price-base');
    if (priceBase) priceBase.textContent = '₹' + pricing.basePrice;

    const discountEl = document.getElementById('price-discount');
    const discountLine = document.getElementById('price-discount-line');
    if (discountEl && discountLine) {
        if (pricing.earlyBird > 0) {
            discountLine.style.display = 'flex';
            discountEl.textContent = '−₹' + pricing.earlyBird;
        } else {
            discountLine.style.display = 'none';
        }
    }

    const couponLine = document.getElementById('coupon-price-line');
    if (couponLine) {
        if (pricing.couponValid && pricing.couponDiscount > 0) {
            couponLine.style.display = 'flex';
            const couponCodeEl = document.getElementById('coupon-code-display');
            if (couponCodeEl) couponCodeEl.textContent = couponCode;
            const priceCouponEl = document.getElementById('price-coupon');
            if (priceCouponEl) priceCouponEl.textContent = '−₹' + pricing.couponDiscount;
        } else {
            couponLine.style.display = 'none';
        }
    }

    const priceTotal = document.getElementById('price-total');
    if (priceTotal) priceTotal.textContent = '₹' + pricing.finalPrice;

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
        visitDate: document.getElementById('reg-visit-date')
    };

    // Validate all standard inputs
    let allValid = true;
    ['name', 'email', 'phone', 'college'].forEach(k => {
        if (fields[k] && !validateField(fields[k])) allValid = false;
    });

    if (!fields.year || !fields.year.value) {
        if (fields.year) fields.year.classList.add('error');
        allValid = false;
    }

    if (!fields.visitDate || !fields.visitDate.value) {
        if (fields.visitDate) fields.visitDate.classList.add('error');
        allValid = false;
    }

    if (!allValid) {
        if (!fields.visitDate || !fields.visitDate.value) {
            showToast('Please select when you are visiting (8th, 9th, or both)', 'error');
        } else {
            showToast('Please fill in all required fields correctly', 'error');
        }
        return;
    }

    // Calculate price
    const couponCode = appliedCoupon ? appliedCoupon.code : '';
    const pricing = dataStore.calculatePrice(couponCode);
    const referralCode = document.getElementById('reg-referral').value.trim();
    const userEmail = fields.email.value.trim().toLowerCase();

    const visitDate = fields.visitDate.value;

    // Check duplicate email: allow registration until screenshot and final submission are completed
    const existing = dataStore.getRegistrations().find(
        r => r.email && r.email.trim().toLowerCase() === userEmail
    );

    if (existing) {
        // Only block if BOTH transaction ID AND payment screenshot are already submitted
        const isCompleted = Boolean(existing.transactionId && existing.paymentScreenshot);
        if (isCompleted) {
            showToast('This email has already completed registration and submitted payment! View your pass in "Find My Pass".', 'info');
            return;
        }

        // Update existing incomplete registration and proceed to payment
        currentRegistration = dataStore.updateRegistration(existing.id, {
            name: fields.name.value.trim(),
            phone: fields.phone.value.trim(),
            year: fields.year.value,
            college: fields.college.value.trim(),
            visitDate: visitDate,
            referredBy: referralCode || existing.referredBy,
            couponUsed: couponCode,
            couponDiscount: pricing.couponDiscount,
            finalPrice: pricing.finalPrice
        }) || existing;

        showToast('Resuming registration for ' + fields.email.value.trim(), 'info');
    } else {
        // Save new registration
        currentRegistration = dataStore.addRegistration({
            name: fields.name.value.trim(),
            email: fields.email.value.trim(),
            phone: fields.phone.value.trim(),
            year: fields.year.value,
            college: fields.college.value.trim(),
            visitDate: visitDate,
            referredBy: referralCode,
            couponUsed: couponCode,
            couponDiscount: pricing.couponDiscount,
            finalPrice: pricing.finalPrice
        });
    }

    // Update payment amount display
    document.getElementById('payment-amount-display').textContent = '₹' + pricing.finalPrice;

    // Check if screenshot was previously uploaded for this registration
    const preview = document.getElementById('screenshot-preview');
    const uploadContent = document.getElementById('upload-content');
    if (currentRegistration && currentRegistration.paymentScreenshot && preview && uploadContent) {
        preview.src = currentRegistration.paymentScreenshot;
        preview.style.display = 'block';
        uploadContent.style.display = 'none';
    } else if (preview && uploadContent) {
        preview.style.display = 'none';
        uploadContent.style.display = '';
    }

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
            const zone = document.getElementById('screenshot-zone');
            if (preview) {
                preview.src = compressedDataUrl;
                preview.style.display = 'block';
            }
            if (content) content.style.display = 'none';
            if (zone) zone.classList.remove('error-pulse');

            // Save to current registration
            if (currentRegistration) {
                currentRegistration.paymentScreenshot = compressedDataUrl;
                dataStore.updateRegistration(currentRegistration.id, {
                    paymentScreenshot: compressedDataUrl
                });
            }

            showToast('Payment screenshot uploaded successfully ✓', 'success');
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function handlePaymentConfirm() {
    const txnInput = document.getElementById('txn-id');
    const txnId = txnInput ? txnInput.value.trim() : '';

    if (!currentRegistration) {
        showToast('Registration session not found. Please fill registration details.', 'error');
        navigateTo('register');
        return;
    }

    if (!txnId || txnId.length < 4) {
        showToast('Please enter your 12-digit UPI Reference / UTR / Transaction ID', 'error');
        if (txnInput) {
            txnInput.classList.add('error');
            txnInput.focus();
        }
        return;
    }
    if (txnInput) txnInput.classList.remove('error');

    // MANDATORY SCREENSHOT CHECK
    const hasScreenshot = Boolean(
        currentRegistration.paymentScreenshot && 
        currentRegistration.paymentScreenshot.length > 50
    );

    if (!hasScreenshot) {
        showToast('Payment screenshot is mandatory! Please upload your payment receipt screenshot.', 'error');
        const zone = document.getElementById('screenshot-zone');
        if (zone) {
            zone.classList.remove('error-pulse');
            void zone.offsetWidth; // force DOM reflow to retrigger animation
            zone.classList.add('error-pulse');
            zone.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
    }

    // Update registration with payment info
    currentRegistration = dataStore.updateRegistration(currentRegistration.id, {
        transactionId: txnId
    }) || currentRegistration;

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
    const amountEl = document.getElementById('ticket-amount');
    if (amountEl) amountEl.textContent = '₹' + reg.finalPrice;

    const stubId = document.getElementById('ticket-stub-id');
    if (stubId) stubId.textContent = reg.id;

    const collegeEl = document.getElementById('ticket-college');
    if (collegeEl) collegeEl.textContent = reg.college || 'Degree College';

    const visitDateEl = document.getElementById('ticket-visit-date');
    if (visitDateEl) {
        visitDateEl.textContent = reg.visitDate || 'Both Days (08th & 09th Oct)';
    }

    const isRejected = Boolean(reg.rejected) || 
        (typeof reg.transactionId === 'string' && reg.transactionId.toUpperCase().startsWith('REJECTED'));

    const ticketCard = document.getElementById('ticket-card');
    const voidStamp = document.getElementById('ticket-void-stamp');
    const statusEl = document.getElementById('ticket-status');

    if (ticketCard) ticketCard.classList.toggle('is-rejected', isRejected);
    if (voidStamp) voidStamp.style.display = isRejected ? 'block' : 'none';

    if (statusEl) {
        if (isRejected) {
            statusEl.textContent = 'PAYMENT REJECTED';
            statusEl.className = 'badge';
            statusEl.style.cssText = 'background:rgba(239,68,68,0.25); color:#ef4444; border:1px solid #ef4444; font-weight:700;';
        } else if (reg.verified) {
            statusEl.textContent = 'VERIFIED ✓';
            statusEl.className = 'badge badge-verified';
            statusEl.style.cssText = '';
        } else {
            statusEl.textContent = 'PENDING VERIFICATION';
            statusEl.className = 'badge badge-pending';
            statusEl.style.cssText = '';
        }
    }

    // Generate Ticket QR code
    generateTicketQR(reg);

    // Generate referral link (pointing cleanly to landing page with ?ref=...)
    const baseURL = window.location.origin + window.location.pathname;
    const referralLink = baseURL + '?ref=' + reg.referralCode;
    const refInput = document.getElementById('referral-link-input');
    if (refInput) refInput.value = referralLink;
}

function generateTicketQR(reg, containerId) {
    const id = containerId || 'ticket-qr-container';
    const container = document.getElementById(id);
    if (!container) return;
    container.innerHTML = '';

    const qrData = (reg.id || '').trim();
    if (!qrData) return;

    const isRejected = Boolean(reg.rejected) || 
        (typeof reg.transactionId === 'string' && reg.transactionId.toUpperCase().startsWith('REJECTED'));

    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';
    wrapper.style.display = 'inline-block';
    wrapper.style.lineHeight = '0';
    container.appendChild(wrapper);

    function onQrSuccess(qrNode) {
        wrapper.innerHTML = '';
        qrNode.style.display = 'block';
        qrNode.style.width = '170px';
        qrNode.style.height = '170px';
        qrNode.style.borderRadius = '6px';
        wrapper.appendChild(qrNode);

        // If rejected, overlay VOID shield directly over the QR code
        if (isRejected) {
            const voidOverlay = document.createElement('div');
            voidOverlay.style.cssText = 'position:absolute; top:0; left:0; width:100%; height:100%; background:rgba(239,68,68,0.88); color:#ffffff; display:flex; flex-direction:column; align-items:center; justify-content:center; border-radius:8px; font-weight:800; font-size:1rem; letter-spacing:1px; text-align:center; padding:8px; box-sizing:border-box; backdrop-filter:blur(2px);';
            voidOverlay.innerHTML = '<span style="font-size:1.6rem; line-height:1;">⛔</span><span style="margin-top:4px;">VOID</span><span style="font-size:0.65rem; font-weight:600; opacity:0.9;">PAYMENT REJECTED</span>';
            wrapper.appendChild(voidOverlay);
        }
    }

    // Engine 1: QRCode constructor from cdnjs (qrcodejs)
    if (window.QRCode && typeof window.QRCode === 'function') {
        try {
            const tempDiv = document.createElement('div');
            new window.QRCode(tempDiv, {
                text: qrData,
                width: 170,
                height: 170,
                colorDark: '#000000',
                colorLight: '#ffffff',
                correctLevel: (window.QRCode && window.QRCode.CorrectLevel) ? window.QRCode.CorrectLevel.M : 0
            });

            // qrcodejs renders canvas and img asynchronously in a tick
            setTimeout(() => {
                const img = tempDiv.querySelector('img');
                const canvas = tempDiv.querySelector('canvas');
                let targetEl = null;
                if (img && img.src && img.src.length > 50) {
                    targetEl = img;
                } else if (canvas) {
                    targetEl = canvas;
                }
                if (targetEl) {
                    onQrSuccess(targetEl);
                } else {
                    engineFallback();
                }
            }, 60);
            return;
        } catch (e) {
            console.warn('QRCode constructor fallback:', e);
            engineFallback();
            return;
        }
    }

    engineFallback();

    function engineFallback() {
        // Engine 2: High-resolution QR API Rasterizer (Guaranteed 100% Real QR Code)
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.alt = `Ticket QR Pass ${qrData}`;
        img.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&format=png&margin=4&data=${encodeURIComponent(qrData)}`;
        img.onload = () => {
            const c = document.createElement('canvas');
            c.width = 170;
            c.height = 170;
            const cx = c.getContext('2d');
            cx.drawImage(img, 0, 0, 170, 170);
            onQrSuccess(c);
        };
        img.onerror = () => {
            onQrSuccess(img);
        };
    }
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
        try { ref = sessionStorage.getItem('cc2026_referral') || localStorage.getItem('cc2026_referral'); } catch (e) {}
    }

    if (ref) {
        const cleanRef = ref.trim().toUpperCase();
        try {
            sessionStorage.setItem('cc2026_referral', cleanRef);
            localStorage.setItem('cc2026_referral', cleanRef);
        } catch (e) {}

        // Pre-fill referral code when on register page
        const refInput = document.getElementById('reg-referral');
        if (refInput && !refInput.value) {
            refInput.value = cleanRef;
        }

        // Show VIP Referral Banner on landing page (does NOT force-redirect, preserves landing hero experience)
        const banner = document.getElementById('landing-referral-banner');
        const nameEl = document.getElementById('lrb-referrer-name');
        if (banner) {
            let displayName = cleanRef;
            if (typeof dataStore !== 'undefined' && typeof dataStore.getPromoters === 'function') {
                const promoter = dataStore.getPromoters().find(p => p.code.toUpperCase() === cleanRef);
                if (promoter) displayName = `${promoter.name} (Promoter)`;
            }
            if (nameEl) nameEl.textContent = displayName;
            banner.style.display = 'block';
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
function payWithApp(app) {
    const amountEl = document.getElementById('payment-amount-display');
    const amount = amountEl ? amountEl.textContent.replace(/[₹,]/g, '').trim() : '150';
    const upiVpa = CONFIG.UPI_VPA || '7208070768@ibl';
    const payeeName = encodeURIComponent(CONFIG.UPI_PAYEE_NAME || 'Vigor LaunchPad');
    const note = encodeURIComponent('Celebrate Cinema 2026 Academic Trek');

    const upiQuery = `pa=${upiVpa}&pn=${payeeName}&am=${amount}&cu=INR&tn=${note}`;
    const standardUpiUrl = `upi://pay?${upiQuery}`;

    const ua = navigator.userAgent || navigator.vendor || window.opera || '';
    const isAndroid = /Android/i.test(ua);
    const isIOS = /iPhone|iPad|iPod/i.test(ua);
    const isMobile = isAndroid || isIOS;

    let targetUrl = standardUpiUrl;
    let appDisplayName = 'UPI App';

    if (app === 'phonepe') {
        appDisplayName = 'PhonePe';
        if (isAndroid) {
            // Android package intent opens PhonePe directly without generic system chooser
            targetUrl = `intent://pay?${upiQuery}#Intent;scheme=upi;package=com.phonepe.app;end`;
        } else if (isIOS) {
            targetUrl = `phonepe://pay?${upiQuery}`;
        } else {
            targetUrl = standardUpiUrl;
        }
    } else if (app === 'gpay') {
        appDisplayName = 'Google Pay';
        if (isAndroid) {
            targetUrl = `intent://pay?${upiQuery}#Intent;scheme=upi;package=com.google.android.apps.nbu.paisa.user;end`;
        } else if (isIOS) {
            targetUrl = `gpay://upi/pay?${upiQuery}`;
        } else {
            targetUrl = standardUpiUrl;
        }
    } else if (app === 'paytm') {
        appDisplayName = 'Paytm';
        if (isAndroid) {
            targetUrl = `intent://pay?${upiQuery}#Intent;scheme=upi;package=net.one97.paytm;end`;
        } else if (isIOS) {
            targetUrl = `paytmmp://pay?${upiQuery}`;
        } else {
            targetUrl = standardUpiUrl;
        }
    } else {
        appDisplayName = 'UPI App';
        targetUrl = standardUpiUrl;
    }

    if (!isMobile) {
        showToast(`Desktop detected: Please scan QR code with ${appDisplayName} or copy UPI ID ${upiVpa}`, 'info');
    } else {
        showToast(`Opening ${appDisplayName} for ₹${amount} payment...`, 'info');
    }

    try {
        const a = document.createElement('a');
        a.href = targetUrl;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            if (document.body.contains(a)) document.body.removeChild(a);
        }, 1200);
    } catch (e) {
        window.location.href = targetUrl;
    }
}

function openUPIApp() {
    payWithApp('other');
}

function copyUPIID() {
    const upiVpa = CONFIG.UPI_VPA || '7208070768@ibl';
    const btn = document.getElementById('copy-upi-btn');

    const doFallback = () => {
        const ta = document.createElement('textarea');
        ta.value = upiVpa;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
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
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:14px;height:14px;">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span>Copied!</span>`;
            setTimeout(() => {
                btn.innerHTML = orig;
                btn.classList.remove('copied');
            }, 2500);
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
    set('fp-ticket-stub-id', reg.id);
    set('fp-ticket-visit-date', reg.visitDate || 'Both Days (08th & 09th Oct)');
    set('fp-ticket-college', reg.college || 'Degree College');
    set('fp-ticket-amount', '₹' + reg.finalPrice);

    const isRejected = Boolean(reg.rejected) || 
        (typeof reg.transactionId === 'string' && reg.transactionId.toUpperCase().startsWith('REJECTED'));

    const ticketCard = document.getElementById('fp-ticket-card');
    const voidStamp = document.getElementById('fp-ticket-void-stamp');
    const statusEl = document.getElementById('fp-ticket-status');

    if (ticketCard) ticketCard.classList.toggle('is-rejected', isRejected);
    if (voidStamp) voidStamp.style.display = isRejected ? 'block' : 'none';

    if (statusEl) {
        if (isRejected) {
            statusEl.textContent = 'PAYMENT REJECTED';
            statusEl.className = 'badge';
            statusEl.style.cssText = 'background:rgba(239,68,68,0.25); color:#ef4444; border:1px solid #ef4444; font-weight:700;';
        } else if (reg.verified) {
            statusEl.textContent = 'VERIFIED ✓';
            statusEl.className = 'badge badge-verified';
            statusEl.style.cssText = '';
        } else {
            statusEl.textContent = 'PENDING VERIFICATION';
            statusEl.className = 'badge badge-pending';
            statusEl.style.cssText = '';
        }
    }

    // Generate QR in fp-qr-container using the shared robust function
    const container = document.getElementById('fp-qr-container');
    if (container) {
        container.innerHTML = '';
        generateTicketQR(reg, 'fp-qr-container');
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
// ──────────── SAVE PASS AS IMAGE ────────────
async function savePassAsImage(source) {
    // source: 'confirm' = confirmation page, 'fp' = find-pass page
    const reg = (source === 'fp') ? _foundPassReg : currentRegistration;
    const cardId = (source === 'fp') ? 'fp-ticket-card' : 'ticket-card';
    const passElement = document.getElementById(cardId);

    if (!reg || !passElement) {
        showToast('No boarding pass available to save', 'error');
        return;
    }

    const isRejected = Boolean(reg.rejected) || 
        (typeof reg.transactionId === 'string' && reg.transactionId.toUpperCase().startsWith('REJECTED'));

    const saveBtns = document.querySelectorAll(`[onclick*="savePassAsImage('${source}')"]`);
    saveBtns.forEach(b => { b.disabled = true; b.dataset.origHtml = b.innerHTML; b.innerHTML = '⏳ Generating Pass Image...'; });

    try {
        if (window.html2canvas) {
            await document.fonts.ready;

            const canvas = await window.html2canvas(passElement, {
                scale: 3,                   // 3x Ultra-HD crisp output
                useCORS: true,              // Support local & remote assets
                allowTaint: true,
                backgroundColor: null,      // Preserves neat rounded border
                logging: false,
                onclone: (clonedDoc) => {
                    // Force pristine horizontal boarding pass layout on any device / screen width
                    const style = clonedDoc.createElement('style');
                    style.innerHTML = `
                        #${cardId} {
                            width: 840px !important;
                            max-width: 840px !important;
                            flex-direction: row !important;
                            margin: 0 auto !important;
                            box-shadow: none !important;
                        }
                        #${cardId} .bp-main {
                            padding: 26px 30px !important;
                        }
                        #${cardId} .bp-meta-strip {
                            grid-template-columns: repeat(4, 1fr) !important;
                        }
                        #${cardId} .bp-body-grid {
                            grid-template-columns: repeat(2, 1fr) !important;
                        }
                        #${cardId} .bp-field-wide {
                            grid-column: span 2 !important;
                        }
                        #${cardId} .bp-perforation {
                            width: 24px !important;
                            height: auto !important;
                            flex-direction: column !important;
                        }
                        #${cardId} .bp-perforation-line {
                            width: 0 !important;
                            height: 100% !important;
                            border-left: 2px dashed rgba(247, 231, 197, 0.45) !important;
                            border-top: none !important;
                        }
                        #${cardId} .bp-notch {
                            width: 24px !important;
                            height: 24px !important;
                            left: 0 !important;
                            right: auto !important;
                        }
                        #${cardId} .bp-notch-top {
                            top: -12px !important;
                            bottom: auto !important;
                            border-bottom: 1.5px solid rgba(247, 231, 197, 0.5) !important;
                            border-right: none !important;
                        }
                        #${cardId} .bp-notch-bottom {
                            bottom: -12px !important;
                            top: auto !important;
                            border-top: 1.5px solid rgba(247, 231, 197, 0.5) !important;
                            border-left: none !important;
                        }
                        #${cardId} .bp-stub {
                            flex: 0 0 270px !important;
                            width: 270px !important;
                            border-left: 1px solid rgba(247, 231, 197, 0.15) !important;
                            border-top: none !important;
                        }
                    `;
                    clonedDoc.head.appendChild(style);
                }
            });

            const safeName = (reg.name || 'pass').replace(/[^a-zA-Z0-9]/g, '_');
            const link = document.createElement('a');
            link.download = `CelebrateCinema2026_BoardingPass_${safeName}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            showToast('✓ Boarding pass saved to downloads!', 'success');
            return;
        }
    } catch (err) {
        console.warn('html2canvas capture fallback:', err);
    } finally {
        saveBtns.forEach(b => { b.disabled = false; if (b.dataset.origHtml) b.innerHTML = b.dataset.origHtml; });
    }

    // Fallback: Horizontal Canvas Renderer
    downloadHorizontalPassCanvas(reg, cardId, isRejected);
}

// Fallback Horizontal Canvas Renderer matching the exact on-screen Boarding Pass
function downloadHorizontalPassCanvas(reg, cardId, isRejected) {
    const qrContainerId = (cardId === 'fp-ticket-card') ? 'fp-qr-container' : 'ticket-qr-container';
    const qrElement = document.querySelector(`#${qrContainerId} img`) || document.querySelector(`#${qrContainerId} canvas`);

    const W = 1680, H = 840; // 2x scale of 840x420
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    // ── Background ──
    const bgGrad = ctx.createLinearGradient(0, 0, W, H);
    bgGrad.addColorStop(0, '#100b1e');
    bgGrad.addColorStop(0.5, '#160e28');
    bgGrad.addColorStop(1, '#0c0816');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Border
    ctx.strokeStyle = isRejected ? 'rgba(239,68,68,0.7)' : 'rgba(247,231,197,0.5)';
    ctx.lineWidth = 3;
    roundRect(ctx, 16, 16, W - 32, H - 32, 28);
    ctx.stroke();

    // ── Left Main Passenger Section (68% = 1140px) ──
    const mainW = 1140;

    // Header logos & badge
    ctx.fillStyle = '#ffffff';
    ctx.font = "bold 28px 'Integral CF', sans-serif";
    ctx.textAlign = 'left';
    ctx.fillText('CELEBRATE CINEMA 2026', 60, 80);

    ctx.font = "bold 18px 'Inter', sans-serif";
    ctx.fillStyle = '#f7e7c5';
    ctx.fillText('OFFICIAL BOARDING PASS', mainW - 320, 80);

    // Header divider
    ctx.strokeStyle = 'rgba(247,231,197,0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(60, 110); ctx.lineTo(mainW - 60, 110); ctx.stroke();

    // Flight Meta Strip
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    roundRectFill(ctx, 60, 130, mainW - 120, 80, 14, 14);
    ctx.strokeStyle = 'rgba(247,231,197,0.18)';
    roundRect(ctx, 60, 130, mainW - 120, 80, 14);
    ctx.stroke();

    const metaCols = [
        ['FLIGHT / EVENT', 'CC-2026', 100],
        ['GATE', '01 FILM CITY', 340],
        ['CLASS / ACCESS', 'DELEGATE', 580],
        ['STATUS', isRejected ? 'VOID' : (reg.verified ? 'VERIFIED ✓' : 'PENDING'), 820]
    ];
    metaCols.forEach(([lbl, val, x]) => {
        ctx.font = "600 16px 'Inter', sans-serif";
        ctx.fillStyle = 'rgba(247,231,197,0.6)';
        ctx.fillText(lbl, x, 162);
        ctx.font = "bold 22px 'Integral CF', sans-serif";
        ctx.fillStyle = (lbl === 'STATUS') ? (isRejected ? '#ef4444' : (reg.verified ? '#10b981' : '#f59e0b')) : '#ffffff';
        ctx.fillText(val, x, 192);
    });

    // Passenger Body Grid
    const fields = [
        ['PASSENGER / ATTENDEE NAME', reg.name.toUpperCase(), 60, 270, true],
        ['REGISTRATION / PNR', reg.id, 60, 370, false, '#f7e7c5'],
        ['EVENT DATES', '08 & 09 OCT 2026', 600, 370, false, '#f7e7c5'],
        ['VISITING PASS', reg.visitDate || 'Both Days (08th & 09th Oct)', 60, 470],
        ['COLLEGE / INSTITUTION', reg.college || 'Degree College', 600, 470],
        ['VENUE / DESTINATION', 'Whistling Woods International, Film City, Goregaon (E), Mumbai', 60, 570]
    ];

    fields.forEach(([lbl, val, x, y, isBig, color]) => {
        ctx.font = "600 16px 'Inter', sans-serif";
        ctx.fillStyle = 'rgba(247,231,197,0.55)';
        ctx.fillText(lbl, x, y);
        ctx.font = isBig ? "bold 32px 'Integral CF', sans-serif" : "600 24px 'Inter', sans-serif";
        ctx.fillStyle = color || '#ffffff';
        ctx.fillText(val, x, y + 36);
    });

    // Footer note
    ctx.font = "italic 16px 'Inter', sans-serif";
    ctx.fillStyle = 'rgba(247,231,197,0.5)';
    ctx.fillText('Film City Gate 01 Security clearance mandatory • Valid College Student ID required', 60, 770);

    // ── Perforation Line ──
    const perfX = mainW;
    ctx.setLineDash([12, 14]);
    ctx.strokeStyle = 'rgba(247,231,197,0.4)';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(perfX, 40); ctx.lineTo(perfX, H - 40); ctx.stroke();
    ctx.setLineDash([]);

    // Notches (top and bottom punch circles)
    ctx.fillStyle = '#0a0614';
    ctx.beginPath(); ctx.arc(perfX, 16, 24, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(perfX, H - 16, 24, 0, Math.PI * 2); ctx.fill();

    // ── Right Stub (Gate Entry Stub) ──
    const stubCenterX = perfX + (W - perfX) / 2;
    ctx.fillStyle = '#f7e7c5';
    ctx.font = "bold 24px 'Integral CF', sans-serif";
    ctx.textAlign = 'center';
    ctx.fillText('GATE ENTRY STUB', stubCenterX, 90);
    ctx.font = "600 16px 'Inter', sans-serif";
    ctx.fillStyle = 'rgba(247,231,197,0.7)';
    ctx.fillText('SCAN FOR ADMISSION', stubCenterX, 120);

    // QR Box
    const qrSize = 340;
    const qrX = stubCenterX - qrSize / 2;
    const qrY = 160;
    ctx.fillStyle = '#ffffff';
    roundRectFill(ctx, qrX - 16, qrY - 16, qrSize + 32, qrSize + 32, 20, 20);

    if (qrElement) {
        ctx.drawImage(qrElement, qrX, qrY, qrSize, qrSize);
    }

    // PNR Text & Barcode Graphic
    ctx.font = "bold 24px monospace";
    ctx.fillStyle = '#ffffff';
    ctx.fillText(reg.id, stubCenterX, 590);

    // Barcode visual lines
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    let bx = stubCenterX - 140;
    for (let i = 0; i < 35; i++) {
        const lw = (i % 3 === 0) ? 4 : ((i % 2 === 0) ? 3 : 2);
        ctx.lineWidth = lw;
        ctx.beginPath(); ctx.moveTo(bx, 620); ctx.lineTo(bx, 680); ctx.stroke();
        bx += 8;
    }

    ctx.font = "600 16px 'Inter', sans-serif";
    ctx.fillStyle = 'rgba(247,231,197,0.5)';
    ctx.fillText('SCAN AT FILM CITY GATE 01', stubCenterX, 720);

    // Rejection Overlay
    if (isRejected) {
        ctx.save();
        ctx.translate(W / 2, H / 2);
        ctx.rotate(-18 * Math.PI / 180);
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.95)';
        ctx.lineWidth = 10;
        roundRect(ctx, -400, -80, 800, 160, 20);
        ctx.stroke();
        ctx.fillStyle = 'rgba(26, 5, 5, 0.92)';
        roundRectFill(ctx, -400, -80, 800, 160, 20, 20);
        ctx.fillStyle = '#ef4444';
        ctx.font = "bold 56px 'Integral CF', sans-serif";
        ctx.textAlign = 'center';
        ctx.fillText('VOID / PAYMENT REJECTED', 0, 10);
        ctx.font = "bold 20px 'Inter', sans-serif";
        ctx.fillStyle = '#ffffff';
        ctx.fillText('ENTRY STRICTLY DENIED AT GATE', 0, 50);
        ctx.restore();
    }

    // Trigger download
    try {
        const link = document.createElement('a');
        const safeName = (reg.name || 'pass').replace(/[^a-zA-Z0-9]/g, '_');
        link.download = `CelebrateCinema2026_BoardingPass_${safeName}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        showToast('✓ Boarding pass saved to downloads!', 'success');
    } catch (e) {
        console.error('Download pass error:', e);
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

// ──────────── GUIDELINES SCROLL HELPER ────────────
function scrollToGuidelines(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (currentPage !== 'landing') {
        navigateTo('landing');
        setTimeout(() => {
            const el = document.getElementById('guidelines-section');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
        }, 320);
    } else {
        const el = document.getElementById('guidelines-section');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
}

function scrollToGuidelinesAndClose() {
    closeMobileNav();
    scrollToGuidelines();
}
