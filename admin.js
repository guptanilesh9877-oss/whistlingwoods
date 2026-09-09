// ============================================
// ADMIN DASHBOARD & SCANNER — Celebrate Cinema 2026
// ============================================

let html5QrScanner = null;
let isScannerRunning = false;
let lastScannedCode = null;
let lastScanTime = 0;
let audioCtx = null;

// ──────────── RENDER DASHBOARD ────────────
function renderAdminDashboard() {
    renderStats();
    renderRegistrationsTable();
    renderCouponsGrid();
    renderReferralLeaderboard();
    renderRecentCheckins();
    initAdminTabSwitching();
    initAdminSearch();
    initSupabaseUI();

    // Auto-fetch latest cloud registrations from Supabase and refresh view
    if (window.dataStore && typeof dataStore.syncFromSupabase === 'function') {
        dataStore.syncFromSupabase().then(() => {
            refreshAdminView();
        });
    }
}

// ──────────── STATS ────────────
function renderStats() {
    const stats = dataStore.getStats();

    animateCounter(document.getElementById('stat-total'), stats.total, 800);
    animateCounter(document.getElementById('stat-verified'), stats.verified, 800);
    animateCounter(document.getElementById('stat-pending'), stats.pending, 800);
    animateCounter(document.getElementById('stat-revenue'), stats.totalRevenue, 1000, '₹');

    const attendedEl = document.getElementById('stat-attended');
    if (attendedEl) {
        animateCounter(attendedEl, stats.attended, 800);
    }
}

// ──────────── REGISTRATIONS TABLE ────────────
function renderRegistrationsTable(filter = 'all', search = '') {
    const tbody = document.getElementById('registrations-tbody');
    const noData = document.getElementById('no-registrations');
    const tableWrapper = document.querySelector('#tab-registrations .table-wrapper');
    let regs = dataStore.getRegistrations();

    // Apply filter
    if (filter === 'verified') regs = regs.filter(r => r.verified);
    if (filter === 'pending') regs = regs.filter(r => !r.verified);
    if (filter === 'attended') regs = regs.filter(r => r.attended);

    // Apply search
    if (search) {
        const q = search.toLowerCase();
        regs = regs.filter(r =>
            r.name.toLowerCase().includes(q) ||
            r.email.toLowerCase().includes(q) ||
            r.id.toLowerCase().includes(q) ||
            (r.phone && r.phone.includes(q)) ||
            (r.college && r.college.toLowerCase().includes(q)) ||
            (r.visitDate && r.visitDate.toLowerCase().includes(q))
        );
    }

    // Sort by newest first
    regs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    if (regs.length === 0) {
        noData.style.display = 'block';
        tableWrapper.style.display = 'none';
        return;
    }

    noData.style.display = 'none';
    tableWrapper.style.display = 'block';

    tbody.innerHTML = regs.map(r => `
        <tr id="row-${r.id}">
            <td title="${r.id}"><strong>${r.id}</strong></td>
            <td title="${escapeHTML(r.name)}">${escapeHTML(r.name)}</td>
            <td title="${escapeHTML(r.email)}">${escapeHTML(r.email)}</td>
            <td>${escapeHTML(r.phone)}</td>
            <td title="${escapeHTML(r.college)}">${escapeHTML(r.college)}</td>
            <td title="${escapeHTML(r.visitDate || 'Both Days')}"><span class="badge badge-gold-sm">${escapeHTML(r.visitDate ? (r.visitDate.includes('Both') ? 'Both Days' : (r.visitDate.includes('08th') ? 'Day 1 (8th)' : 'Day 2 (9th)')) : 'Both Days')}</span></td>
            <td>₹${r.finalPrice}</td>
            <td>${r.couponUsed || '—'}</td>
            <td title="${r.transactionId || '—'}">${r.transactionId ? r.transactionId.substring(0, 12) : '—'}</td>
            <td>
                <span class="badge ${r.verified ? 'badge-verified' : 'badge-pending'}">
                    ${r.verified ? 'Verified' : 'Pending'}
                </span>
            </td>
            <td>
                <span class="badge ${r.attended ? 'badge-verified' : 'badge-pending'}" style="cursor: pointer;" onclick="handleToggleAttendance('${r.id}')" title="Click to toggle attendance">
                    ${r.attended ? '✓ Checked In' : 'Not In'}
                </span>
            </td>
            <td>
                <div class="action-btns">
                    <button class="btn-verify ${r.verified ? 'verified' : ''}"
                            onclick="handleToggleVerify('${r.id}')"
                            title="${r.verified ? 'Mark as Pending' : 'Verify Payment'}">
                        ${r.verified ? '✓' : 'Verify'}
                    </button>
                    ${r.paymentScreenshot ? `<button class="btn-small" onclick="viewScreenshot('${r.id}')" title="View Screenshot">📷</button>` : ''}
                    <button class="btn-delete" onclick="handleDeleteRegistration('${r.id}')" title="Delete">✕</button>
                </div>
            </td>
        </tr>
    `).join('');
}

// ──────────── TOGGLE VERIFY ────────────
async function handleToggleVerify(id) {
    const reg = await dataStore.toggleVerification(id);
    if (reg) {
        showToast(
            reg.verified ? `${reg.name} verified ✓` : `${reg.name} marked as pending`,
            reg.verified ? 'success' : 'info'
        );
        refreshAdminView();
    }
}

// ──────────── TOGGLE ATTENDANCE ────────────
async function handleToggleAttendance(id) {
    const reg = await dataStore.toggleAttendance(id);
    if (reg) {
        showToast(
            reg.attended ? `Marked checked-in for ${reg.name} 🎫` : `Check-in cancelled for ${reg.name}`,
            reg.attended ? 'success' : 'info'
        );
        refreshAdminView();
    }
}

// ──────────── DELETE REGISTRATION ────────────
async function handleDeleteRegistration(id) {
    const reg = dataStore.getRegistrationById(id);
    if (!reg) return;

    if (confirm(`Permanently delete registration for "${reg.name}" (${reg.id})?\n\nThis will remove it from Supabase Cloud database and all synced devices.`)) {
        const res = await dataStore.deleteRegistration(id);
        if (res && res.success === false) {
            showToast('Warning: Deleted locally, but cloud delete error: ' + res.message, 'warning');
        } else {
            showToast(`Registration for "${reg.name}" deleted from Cloud ✓`, 'info');
        }
        refreshAdminView();
    }
}

// ──────────── VIEW SCREENSHOT ────────────
function viewScreenshot(id) {
    const reg = dataStore.getRegistrationById(id);
    if (!reg || !reg.paymentScreenshot) return;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay open';
    overlay.onclick = () => overlay.remove();
    overlay.innerHTML = `
        <div class="modal-content glass-card" onclick="event.stopPropagation()" style="max-width: 500px; padding: 24px; border: 1px solid var(--border-glass);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 16px;">
                <h3>Payment Screenshot — ${escapeHTML(reg.name)}</h3>
                <button class="btn-small" onclick="this.closest('.modal-overlay').remove()">Close ✕</button>
            </div>
            <img src="${reg.paymentScreenshot}" alt="Payment Screenshot" style="max-width:100%; max-height:400px; object-fit:contain; border-radius:12px; display:block; margin:0 auto;">
            <p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 14px; text-align:center;">Txn ID: <strong>${reg.transactionId || 'N/A'}</strong></p>
        </div>
    `;
    document.body.appendChild(overlay);
}

// ═══════════════════════════════════════════════
// ATTENDANCE SCANNER SYSTEM (SMOOTH & FAST)
// ═══════════════════════════════════════════════

function toggleScanner() {
    if (isScannerRunning) {
        stopScanner();
    } else {
        startScanner();
    }
}

async function startScanner() {
    const container = document.getElementById('qr-scanner-container');
    const startBtn = document.getElementById('start-scanner-btn');
    const placeholder = document.getElementById('scanner-placeholder');
    const viewport = document.querySelector('.scanner-viewport');

    if (!window.Html5Qrcode) {
        showToast('QR Scanner library loading, please wait a moment...', 'warning');
        return;
    }

    try {
        if (!html5QrScanner) {
            html5QrScanner = new Html5Qrcode('qr-scanner-container');
        }

        if (placeholder) placeholder.style.display = 'none';
        if (viewport) viewport.classList.add('scanner-active');
        if (startBtn) {
            startBtn.innerHTML = '⏹ Stop Camera';
            startBtn.classList.remove('btn-primary');
            startBtn.classList.add('btn-secondary');
        }

        const config = {
            fps: 15,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
            showTorchButtonIfSupported: true
        };

        await html5QrScanner.start(
            { facingMode: 'environment' },
            config,
            onScanSuccess,
            onScanFailure
        );

        isScannerRunning = true;
        showToast('Camera active! Point at ticket QR code', 'info');

        // Populate camera list if multiple
        try {
            const devices = await Html5Qrcode.getCameras();
            const select = document.getElementById('camera-select');
            if (devices && devices.length > 1 && select) {
                select.style.display = 'inline-block';
                select.innerHTML = devices.map(d => `<option value="${d.id}">${d.label || 'Camera ' + d.id}</option>`).join('');
                select.onchange = async () => {
                    if (isScannerRunning) {
                        await html5QrScanner.stop();
                        await html5QrScanner.start(select.value, config, onScanSuccess, onScanFailure);
                    }
                };
            }
        } catch (e) {
            console.log('Camera list query optional:', e);
        }

    } catch (err) {
        console.error('Camera start error:', err);
        if (placeholder) placeholder.style.display = 'flex';
        if (viewport) viewport.classList.remove('scanner-active');
        if (startBtn) {
            startBtn.innerHTML = '📷 Start Camera';
            startBtn.classList.add('btn-primary');
            startBtn.classList.remove('btn-secondary');
        }
        isScannerRunning = false;
        showToast('Unable to access camera. Please check permissions or use manual check-in.', 'error');
    }
}

async function stopScanner() {
    const startBtn = document.getElementById('start-scanner-btn');
    const placeholder = document.getElementById('scanner-placeholder');
    const viewport = document.querySelector('.scanner-viewport');

    if (html5QrScanner && isScannerRunning) {
        try {
            await html5QrScanner.stop();
        } catch (e) {
            console.log('Stop error:', e);
        }
    }

    isScannerRunning = false;
    if (placeholder) placeholder.style.display = 'flex';
    if (viewport) viewport.classList.remove('scanner-active');
    if (startBtn) {
        startBtn.innerHTML = '📷 Start Camera';
        startBtn.classList.add('btn-primary');
        startBtn.classList.remove('btn-secondary');
    }
}

// Handle scan success with 2.5s debounce per code
function onScanSuccess(decodedText) {
    const now = Date.now();
    if (decodedText === lastScannedCode && (now - lastScanTime) < 2500) {
        return; // debounce duplicate consecutive frames
    }

    lastScannedCode = decodedText;
    lastScanTime = now;

    // Play pleasant sound beep
    playScanBeep();

    // Haptic vibration
    if (navigator.vibrate) navigator.vibrate([80, 40, 80]);

    // Process attendance
    const result = dataStore.markAttendance(decodedText);
    displayScanResult(result);
    renderRecentCheckins();
    renderStats();
    renderRegistrationsTable();
}

function onScanFailure(error) {
    // Normal frame-by-frame scanning noise, suppress
}

// Web Audio API beep synthesizer (zero external dependencies)
function playScanBeep(type = 'success') {
    try {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        if (type === 'success') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
            osc.frequency.setValueAtTime(1320, audioCtx.currentTime + 0.08); // E6
            gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
            osc.start(audioCtx.currentTime);
            osc.stop(audioCtx.currentTime + 0.2);
        } else {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(300, audioCtx.currentTime);
            gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
            osc.start(audioCtx.currentTime);
            osc.stop(audioCtx.currentTime + 0.3);
        }
    } catch (e) {
        // audio context blocked or unsupported
    }
}

// Display scan result card
function displayScanResult(result) {
    const card = document.getElementById('scanner-result');
    const statusEl = document.getElementById('scan-status');
    const detailsEl = document.getElementById('scan-details');
    const actionsEl = document.getElementById('scan-actions');

    if (!card) return;
    card.style.display = 'block';

    if (result.status === 'success') {
        statusEl.innerHTML = `
            <span class="scan-status-icon">🎉</span>
            <div class="scan-status-text success">VALID PASS — CHECKED IN!</div>
            <p style="color:var(--text-secondary); font-size:0.85rem; margin-top:4px;">${result.message}</p>
        `;
        detailsEl.innerHTML = `
            <div class="scan-detail-row"><span class="scan-detail-label">Name:</span><span class="scan-detail-value">${escapeHTML(result.reg.name)}</span></div>
            <div class="scan-detail-row"><span class="scan-detail-label">Ticket ID:</span><span class="scan-detail-value" style="font-family:monospace; color:var(--gold);">${result.reg.id}</span></div>
            <div class="scan-detail-row"><span class="scan-detail-label">College:</span><span class="scan-detail-value">${escapeHTML(result.reg.college)}</span></div>
            <div class="scan-detail-row"><span class="scan-detail-label">Phone:</span><span class="scan-detail-value">${escapeHTML(result.reg.phone)}</span></div>
            <div class="scan-detail-row"><span class="scan-detail-label">Amount:</span><span class="scan-detail-value">₹${result.reg.finalPrice}</span></div>
        `;
        actionsEl.innerHTML = `
            <button class="btn-small" onclick="document.getElementById('scanner-result').style.display='none'">Dismiss</button>
        `;
    } else if (result.status === 'already_attended') {
        playScanBeep('error');
        statusEl.innerHTML = `
            <span class="scan-status-icon">⚠️</span>
            <div class="scan-status-text already">ALREADY CHECKED IN</div>
            <p style="color:var(--warning); font-size:0.85rem; margin-top:4px;">${result.message}</p>
        `;
        detailsEl.innerHTML = `
            <div class="scan-detail-row"><span class="scan-detail-label">Name:</span><span class="scan-detail-value">${escapeHTML(result.reg.name)}</span></div>
            <div class="scan-detail-row"><span class="scan-detail-label">Ticket ID:</span><span class="scan-detail-value" style="font-family:monospace;">${result.reg.id}</span></div>
            <div class="scan-detail-row"><span class="scan-detail-label">Check-in Time:</span><span class="scan-detail-value" style="color:var(--gold);">${new Date(result.attendedAt).toLocaleTimeString('en-IN')}</span></div>
        `;
        actionsEl.innerHTML = `
            <button class="btn-small" onclick="handleToggleAttendance('${result.reg.id}')">Cancel Check-in</button>
            <button class="btn-small" onclick="document.getElementById('scanner-result').style.display='none'">Dismiss</button>
        `;
    } else {
        playScanBeep('error');
        statusEl.innerHTML = `
            <span class="scan-status-icon">❌</span>
            <div class="scan-status-text error">INVALID TICKET</div>
            <p style="color:var(--error); font-size:0.85rem; margin-top:4px;">${result.message}</p>
        `;
        detailsEl.innerHTML = `
            <div class="scan-detail-row"><span class="scan-detail-label">Scanned Text:</span><span class="scan-detail-value" style="font-family:monospace; font-size:0.8rem;">${escapeHTML(result.scannedId || 'Unknown')}</span></div>
        `;
        actionsEl.innerHTML = `
            <button class="btn-small" onclick="document.getElementById('scanner-result').style.display='none'">Dismiss</button>
        `;
    }
}

// Manual Check-in
function handleManualCheckin() {
    const input = document.getElementById('manual-checkin-id');
    const msg = document.getElementById('manual-checkin-msg');
    const id = input.value.trim();

    if (!id) {
        msg.textContent = 'Please enter a Registration ID';
        msg.className = 'form-message error';
        return;
    }

    const result = dataStore.markAttendance(id);
    displayScanResult(result);
    renderRecentCheckins();
    renderStats();
    renderRegistrationsTable();

    if (result.success) {
        msg.textContent = `✓ Checked in: ${result.reg.name}`;
        msg.className = 'form-message success';
        input.value = '';
    } else {
        msg.textContent = `✗ ${result.message}`;
        msg.className = 'form-message error';
    }
}

// Render Recent Check-ins List
function renderRecentCheckins() {
    const container = document.getElementById('recent-checkins');
    if (!container) return;

    const list = dataStore.getRecentCheckins(8);
    if (!list.length) {
        container.innerHTML = '<p style="color:var(--text-muted); font-size:0.82rem; text-align:center; padding:12px;">No attendees checked in yet today</p>';
        return;
    }

    container.innerHTML = list.map(r => `
        <div class="checkin-item">
            <span class="checkin-time">${new Date(r.attendedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
            <span class="checkin-name">${escapeHTML(r.name)} <span style="color:var(--text-muted); font-size:0.75rem;">(${r.id})</span></span>
            <span class="checkin-badge">Checked In</span>
        </div>
    `).join('');
}

// ──────────── COUPONS ────────────
function renderCouponsGrid() {
    const grid = document.getElementById('coupons-grid');
    const coupons = dataStore.getCoupons();

    if (coupons.length === 0) {
        grid.innerHTML = '<div class="no-data"><div class="no-data-icon">🎟️</div><p>No coupons configured</p></div>';
        return;
    }

    grid.innerHTML = coupons.map(c => `
        <div class="coupon-card ${c.active ? '' : 'inactive'}">
            <div class="coupon-code">${c.code}</div>
            <div class="coupon-discount-display">−₹${c.discount}</div>
            <div class="coupon-desc">${c.description || ''}</div>
            <div class="coupon-actions">
                <button class="btn-small" onclick="handleToggleCoupon('${c.code}')" style="background: ${c.active ? 'var(--warning)' : 'var(--success)'}; color: #000;">
                    ${c.active ? 'Disable' : 'Enable'}
                </button>
                <button class="btn-delete" onclick="handleDeleteCoupon('${c.code}')">Remove</button>
            </div>
        </div>
    `).join('');
}

function handleToggleCoupon(code) {
    dataStore.toggleCoupon(code);
    renderCouponsGrid();
    showToast('Coupon updated', 'info');
}

function handleDeleteCoupon(code) {
    if (confirm(`Delete coupon "${code}"?`)) {
        dataStore.removeCoupon(code);
        renderCouponsGrid();
        showToast('Coupon deleted', 'info');
    }
}

// Add coupon form
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('add-coupon-form');
    if (form) {
        form.addEventListener('submit', e => {
            e.preventDefault();
            const code = document.getElementById('new-coupon-code').value.trim();
            const discount = document.getElementById('new-coupon-discount').value;
            const desc = document.getElementById('new-coupon-desc').value.trim();

            if (!code || !discount) {
                showToast('Please fill in code and discount amount', 'error');
                return;
            }

            const result = dataStore.addCoupon(code, discount, desc);
            if (result.success) {
                showToast(result.message, 'success');
                form.reset();
                renderCouponsGrid();
            } else {
                showToast(result.message, 'error');
            }
        });
    }

    // Manual check-in enter key
    const manualInput = document.getElementById('manual-checkin-id');
    if (manualInput) {
        manualInput.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleManualCheckin();
            }
        });
    }
});

// ──────────── PROMOTER REFERRAL LINKS & LEADERBOARD ────────────
function getBaseSiteURL() {
    const origin = window.location.origin;
    const pathname = window.location.pathname.replace(/\/admin.*$/, '').replace(/\/index\.html.*$/, '').replace(/\/+$/, '');
    return `${origin}${pathname}/`;
}

function buildPromoterReferralURL(code) {
    return `${getBaseSiteURL()}?ref=${encodeURIComponent(code)}#register`;
}

function handlePromoterNameInput(input) {
    const codeInput = document.getElementById('promoter-code');
    if (!codeInput) return;
    const cleanCode = input.value.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    codeInput.value = cleanCode;
}

function handleCreatePromoter(event) {
    event.preventDefault();
    const nameInput = document.getElementById('promoter-name');
    const codeInput = document.getElementById('promoter-code');
    const name = nameInput.value.trim();
    const code = codeInput.value.trim().toUpperCase();

    if (!name || !code) {
        showToast('Please enter promoter name and code', 'error');
        return;
    }

    const res = dataStore.addPromoter(name, code);
    if (res.success) {
        showToast(res.message, 'success');
        const url = buildPromoterReferralURL(res.code);

        const box = document.getElementById('new-promoter-link-box');
        const linkInput = document.getElementById('new-promoter-link-input');
        const nameBadge = document.getElementById('new-link-promoter-name');
        const waBtn = document.getElementById('new-promoter-whatsapp-btn');

        if (box && linkInput) {
            box.style.display = 'block';
            linkInput.value = url;
            if (nameBadge) nameBadge.textContent = `${name} (${res.code})`;
            if (waBtn) {
                const msg = encodeURIComponent(`Hi! Register for Celebrate Cinema 2026 Academic Trek at Whistling Woods International using my link: ${url}`);
                waBtn.href = `https://wa.me/?text=${msg}`;
            }
        }

        renderPromotersTable();
        renderReferralLeaderboard();
        nameInput.value = '';
        codeInput.value = '';
    } else {
        showToast(res.message, 'error');
    }
}

function copyGeneratedPromoterLink() {
    const input = document.getElementById('new-promoter-link-input');
    if (!input) return;
    navigator.clipboard.writeText(input.value).then(() => {
        showToast('Promoter link copied to clipboard!', 'success');
    }).catch(() => {
        input.select();
        document.execCommand('copy');
        showToast('Promoter link copied!', 'success');
    });
}

function copyPromoterLink(code) {
    const url = buildPromoterReferralURL(code);
    navigator.clipboard.writeText(url).then(() => {
        showToast(`Referral link for ${code} copied!`, 'success');
    }).catch(() => {
        showToast(`Link: ${url}`, 'info');
    });
}

function sharePromoterWhatsApp(code, name) {
    const url = buildPromoterReferralURL(code);
    const msg = encodeURIComponent(`Hey! Join me at Celebrate Cinema 2026 Academic Trek at Whistling Woods International (Film City, Mumbai). Register using my official link here: ${url}`);
    window.open(`https://wa.me/?text=${msg}`, '_blank');
}

function renderPromotersTable() {
    const tbody = document.getElementById('promoters-table-body');
    if (!tbody) return;
    const promoters = dataStore.getPromoters();

    tbody.innerHTML = promoters.map(p => {
        const count = dataStore.getReferralCount(p.code);
        const url = buildPromoterReferralURL(p.code);
        return `
            <tr>
                <td><strong>${escapeHTML(p.name)}</strong></td>
                <td><span class="badge badge-purple" style="font-family:'Integral CF',sans-serif;letter-spacing:1px;">${p.code}</span></td>
                <td><strong style="color:var(--gold);font-size:1.1rem;">${count}</strong> <span style="font-size:0.8rem;color:var(--lavender);">student${count !== 1 ? 's' : ''}</span></td>
                <td>
                    <div style="display:flex;gap:8px;align-items:center;">
                        <button class="btn btn-secondary btn-small" onclick="copyPromoterLink('${p.code}')" title="Copy ${url}">Copy Link</button>
                        <button class="btn btn-primary btn-small btn-whatsapp" onclick="sharePromoterWhatsApp('${p.code}', '${escapeHTML(p.name)}')">WhatsApp</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function renderReferralLeaderboard() {
    renderPromotersTable();
    const container = document.getElementById('referral-leaderboard');
    if (!container) return;
    const topReferrers = dataStore.getTopReferrers();

    if (topReferrers.length === 0) {
        container.innerHTML = '<div class="no-data"><div class="no-data-icon">🏆</div><p>No student referrals recorded yet</p></div>';
        return;
    }

    container.innerHTML = topReferrers.map((r, i) => `
        <div class="referral-item">
            <div class="referral-rank">#${i + 1}</div>
            <div class="referral-info">
                <div class="referral-name">${escapeHTML(r.name)}</div>
                <div class="referral-code-text">Code: <strong style="color:var(--gold);">${r.code}</strong></div>
            </div>
            <div class="referral-count">${r.count} referral${r.count !== 1 ? 's' : ''}</div>
        </div>
    `).join('');
}

// ──────────── TABS ────────────
function initAdminTabSwitching() {
    const tabs = document.querySelectorAll('#admin-tabs .tab-btn');
    tabs.forEach(tab => {
        const newTab = tab.cloneNode(true);
        tab.parentNode.replaceChild(newTab, tab);

        newTab.addEventListener('click', () => {
            document.querySelectorAll('#admin-tabs .tab-btn').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('#page-admin .tab-content').forEach(c => c.classList.remove('active'));

            newTab.classList.add('active');
            const tabId = 'tab-' + newTab.dataset.tab;
            const tabContent = document.getElementById(tabId);
            if (tabContent) tabContent.classList.add('active');

            // If switching away from attendance scanner, stop camera
            if (newTab.dataset.tab !== 'attendance' && isScannerRunning) {
                stopScanner();
            }
        });
    });
}

// ──────────── SEARCH & FILTER ────────────
function initAdminSearch() {
    const searchInput = document.getElementById('search-registrations');
    const filterSelect = document.getElementById('filter-status');

    if (!searchInput || !filterSelect) return;

    const newSearch = searchInput.cloneNode(true);
    searchInput.parentNode.replaceChild(newSearch, searchInput);
    const newFilter = filterSelect.cloneNode(true);
    filterSelect.parentNode.replaceChild(newFilter, filterSelect);

    let debounceTimer;
    newSearch.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            renderRegistrationsTable(newFilter.value, newSearch.value);
        }, 250);
    });

    newFilter.addEventListener('change', () => {
        renderRegistrationsTable(newFilter.value, newSearch.value);
    });
}

// ──────────── SUPABASE UI ────────────
function initSupabaseUI() {
    const header = document.querySelector('.admin-header-actions') || document.querySelector('.admin-header');
    if (!header) return;

    // Supabase Connect / Settings button
    if (!document.getElementById('btn-supabase-config')) {
        const btn = document.createElement('button');
        btn.id = 'btn-supabase-config';
        btn.className = 'btn btn-secondary';
        const config = dataStore.getSupabaseConfig();
        btn.innerHTML = config ? '⚡ Supabase: Connected' : '⚡ Connect Supabase';
        btn.onclick = openSupabaseModal;
        header.insertBefore(btn, header.firstChild);
    }

    // Dedicated Sync Now button
    if (!document.getElementById('btn-supabase-sync')) {
        const syncBtn = document.createElement('button');
        syncBtn.id = 'btn-supabase-sync';
        syncBtn.className = 'btn btn-secondary';
        syncBtn.innerHTML = '↻ Sync Cloud';
        syncBtn.title = 'Fetch latest data from Supabase Cloud Database';
        syncBtn.onclick = async () => {
            syncBtn.innerHTML = '↻ Syncing...';
            syncBtn.disabled = true;
            try {
                await dataStore.syncFromSupabase();
                refreshAdminView();
                showToast('Cloud database synced successfully!', 'success');
            } catch (err) {
                showToast('Sync error: ' + (err.message || 'Unknown error'), 'error');
            } finally {
                syncBtn.innerHTML = '↻ Sync Cloud';
                syncBtn.disabled = false;
            }
        };
        header.insertBefore(syncBtn, header.firstChild);
    }
}

function openSupabaseModal() {
    const config = dataStore.getSupabaseConfig() || { url: '', anonKey: '' };
    const localCount = dataStore.getRegistrations().length;
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay open';
    overlay.onclick = () => overlay.remove();
    overlay.innerHTML = `
        <div class="modal-content glass-card" onclick="event.stopPropagation()" style="max-width: 520px; padding: 28px; border: 1px solid var(--border-glass);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 16px;">
                <h3>⚡ Supabase Cloud Integration</h3>
                <button class="btn-small" onclick="this.closest('.modal-overlay').remove()">✕</button>
            </div>
            <p style="color:var(--text-muted); font-size:0.85rem; margin-bottom:16px;">
                Connect your Supabase project to sync all registrations, coupons, and real-time attendance to the cloud database.
            </p>
            <div class="form-group" style="margin-bottom:12px;">
                <label class="form-label">Supabase Project URL</label>
                <input type="text" id="supabase-url-input" class="form-input" placeholder="https://xyzcompany.supabase.co" value="${config.url || ''}">
            </div>
            <div class="form-group" style="margin-bottom:16px;">
                <label class="form-label">Supabase Anon / Public API Key</label>
                <input type="password" id="supabase-key-input" class="form-input" placeholder="eyJhbGciOiJIUzI1NiIsIn..." value="${config.anonKey || ''}">
            </div>
            <div style="display:flex; gap:10px; justify-content:space-between; align-items:center; flex-wrap:wrap; margin-top:16px;">
                <div>
                    ${localCount > 0 ? `<button class="btn-small" onclick="handlePushLocalToSupabase(this)" style="background:rgba(212,168,67,0.2); border:1px solid var(--gold); color:var(--gold-light);">Push ${localCount} Local Records to Cloud</button>` : ''}
                </div>
                <div style="display:flex; gap:10px;">
                    ${config.url ? `<button class="btn-delete" onclick="handleDisconnectSupabase(this)">Disconnect</button>` : ''}
                    <button class="btn btn-primary" onclick="handleSaveSupabase(this)">Save & Sync</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
}

async function handlePushLocalToSupabase(btn) {
    btn.disabled = true;
    btn.textContent = 'Pushing...';
    const res = await dataStore.syncLocalToSupabase();
    if (res.success) {
        showToast(res.message, 'success');
        refreshAdminView();
    } else {
        showToast(res.message || 'Sync failed', 'error');
    }
    btn.disabled = false;
    btn.textContent = 'Pushed ✓';
}

function handleSaveSupabase(btn) {
    const url = document.getElementById('supabase-url-input').value.trim();
    const key = document.getElementById('supabase-key-input').value.trim();

    if (!url || !key) {
        showToast('Please enter both Supabase URL and Anon Key', 'error');
        return;
    }

    const res = dataStore.setSupabaseConfig(url, key);
    showToast(res.message, 'success');
    btn.closest('.modal-overlay').remove();

    const sbBtn = document.getElementById('btn-supabase-config');
    if (sbBtn) sbBtn.innerHTML = '⚡ Supabase: Connected';
}

function handleDisconnectSupabase(btn) {
    dataStore.setSupabaseConfig(null, null);
    showToast('Supabase disconnected. Using LocalStorage.', 'info');
    btn.closest('.modal-overlay').remove();

    const sbBtn = document.getElementById('btn-supabase-config');
    if (sbBtn) sbBtn.innerHTML = '⚡ Connect Supabase';
}

// ──────────── CSV EXPORT ────────────
function handleExportCSV() {
    const csv = dataStore.exportToCSV();
    if (!csv) {
        showToast('No data to export', 'error');
        return;
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `celebrate_cinema_2026_registrations_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('CSV exported successfully with attendance details!', 'success');
}

// ──────────── HELPER: REFRESH ADMIN VIEW ────────────
function refreshAdminView() {
    renderStats();
    const search = document.getElementById('search-registrations');
    const filter = document.getElementById('filter-status');
    renderRegistrationsTable(filter ? filter.value : 'all', search ? search.value : '');
    renderReferralLeaderboard();
    renderRecentCheckins();
}

// ──────────── MANUAL SYNC CLOUD ────────────
async function handleManualSyncCloud() {
    const btn = document.getElementById('sync-cloud-btn');
    if (btn) {
        btn.textContent = 'Syncing...';
        btn.disabled = true;
    }
    showToast('Fetching latest records from Supabase Cloud...', 'info');
    try {
        if (window.dataStore && typeof dataStore.syncFromSupabase === 'function') {
            await dataStore.syncFromSupabase();
            refreshAdminView();
            showToast('Admin dashboard synchronized with Cloud ✓', 'success');
        }
    } catch (e) {
        console.error('Manual sync error:', e);
        showToast('Sync warning: ' + e.message, 'warning');
    } finally {
        if (btn) {
            btn.textContent = '⟳ Sync Cloud';
            btn.disabled = false;
        }
    }
}

