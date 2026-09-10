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
    initColumnVisibility();

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
            (r.visitDate && r.visitDate.toLowerCase().includes(q)) ||
            (r.couponUsed && r.couponUsed.toLowerCase().includes(q)) ||
            (r.referredBy && r.referredBy.toLowerCase().includes(q)) ||
            (r.referralCode && r.referralCode.toLowerCase().includes(q))
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

    // Lookup maps for promoters & student referrers
    const promoterMap = {};
    if (typeof dataStore.getPromoters === 'function') {
        dataStore.getPromoters().forEach(p => {
            if (p.code) promoterMap[p.code.trim().toUpperCase()] = p.name;
        });
    }
    const studentMap = {};
    const allRegs = dataStore.getRegistrations();
    allRegs.forEach(reg => {
        if (reg.referralCode) studentMap[reg.referralCode.trim().toUpperCase()] = reg.name;
    });

    tbody.innerHTML = regs.map(r => {
        const refCode = (r.referredBy || '').trim().toUpperCase();
        const referrerName = refCode 
            ? (promoterMap[refCode] ? `${promoterMap[refCode]} (Promoter)` : (studentMap[refCode] ? `${studentMap[refCode]}` : null))
            : null;

        return `
        <tr id="row-${r.id}" class="${r.rejected ? 'row-rejected' : ''}">
            <td class="col-ticketId" title="${r.id}"><strong>${r.id}</strong></td>
            <td class="col-name" title="${escapeHTML(r.name)}">${escapeHTML(r.name)}</td>
            <td class="col-email" title="${escapeHTML(r.email)}">${escapeHTML(r.email)}</td>
            <td class="col-phone">${escapeHTML(r.phone)}</td>
            <td class="col-college" title="${escapeHTML(r.college)}">${escapeHTML(r.college)}</td>
            <td class="col-date" title="${escapeHTML(r.visitDate || 'Both Days')}"><span class="badge badge-gold-sm">${escapeHTML(r.visitDate ? (r.visitDate.includes('Both') ? 'Both Days' : (r.visitDate.includes('08th') ? 'Day 1 (8th)' : 'Day 2 (9th)')) : 'Both Days')}</span></td>
            <td class="col-amount">₹${r.finalPrice}</td>
            <td class="col-coupon">${r.couponUsed || '—'}</td>
            <td class="col-referral">
                ${refCode ? `
                    <span class="badge badge-purple" style="font-family:monospace; font-size:0.75rem; letter-spacing:0.5px; cursor:pointer;" onclick="filterRegistrationsByReferral('${escapeHTML(refCode)}')" title="Click to filter by referral code ${escapeHTML(refCode)}">
                        ${escapeHTML(refCode)}
                    </span>
                    ${referrerName ? `<div style="font-size:0.72rem; color:var(--lavender); margin-top:2px; font-weight:500;" title="Referred by: ${escapeHTML(referrerName)}">👤 ${escapeHTML(referrerName)}</div>` : ''}
                ` : `<span style="color:var(--text-muted); font-size:0.75rem; opacity:0.6;">Direct / —</span>`}
                ${r.referralCode ? `<div style="font-size:0.68rem; color:var(--text-muted); opacity:0.6; margin-top:2px;" title="Registrant's own referral code">Own: ${escapeHTML(r.referralCode)}</div>` : ''}
            </td>
            <td class="col-txnId" title="${r.transactionId || '—'}">${r.transactionId ? r.transactionId.substring(0, 16) : '—'}</td>
            <td class="col-payment">
                <span class="badge ${r.rejected ? 'badge-rejected' : (r.verified ? 'badge-verified' : 'badge-pending')}" style="${r.rejected ? 'background:rgba(239,68,68,0.2); color:#ef4444; border:1px solid rgba(239,68,68,0.5); font-weight:700;' : ''}">
                    ${r.rejected ? 'Rejected ✕' : (r.verified ? 'Verified ✓' : 'Pending')}
                </span>
            </td>
            <td class="col-attendance">
                <span class="badge ${r.attended ? 'badge-verified' : 'badge-pending'}" style="cursor: pointer;" onclick="handleToggleAttendance('${r.id}')" title="Click to toggle attendance">
                    ${r.attended ? '✓ Checked In' : 'Not In'}
                </span>
            </td>
            <td class="col-actions">
                <div class="action-btns">
                    <button class="btn-verify ${r.verified ? 'verified' : ''}"
                            onclick="handleToggleVerify('${r.id}')"
                            title="${r.verified ? 'Mark as Pending' : 'Verify Payment'}">
                        ${r.verified ? '✓' : 'Verify'}
                    </button>
                    <button class="btn-reject ${r.rejected ? 'is-rejected' : ''}"
                            onclick="handleRejectPayment('${r.id}')"
                            title="${r.rejected ? 'Payment is Rejected (click to un-reject)' : 'Reject Payment & Void Pass'}"
                            style="${r.rejected ? 'background:#ef4444; color:#fff; border-color:#dc2626;' : 'color:#ef4444; border:1px solid rgba(239,68,68,0.4); background:rgba(239,68,68,0.08);'}">
                        ${r.rejected ? 'Void' : 'Reject'}
                    </button>
                    ${r.paymentScreenshot ? `<button class="btn-small" onclick="viewScreenshot('${r.id}')" title="View Screenshot">📷</button>` : ''}
                    <button class="btn-delete" onclick="handleDeleteRegistration('${r.id}')" title="Delete">✕</button>
                </div>
            </td>
        </tr>
    `;
    }).join('');

    applyColumnVisibility();
}

// ──────────── REJECT PAYMENT ────────────
async function handleRejectPayment(id) {
    const reg = dataStore.getRegistrationById(id);
    if (!reg) return;
    if (reg.rejected) {
        if (confirm(`Payment for ${reg.name} (${reg.id}) is currently marked REJECTED. Do you want to un-reject and verify it?`)) {
            await dataStore.toggleVerification(id);
            showToast(`Payment un-rejected and verified for ${reg.name} ✓`, 'success');
            refreshAdminView();
        }
        return;
    }
    const reason = prompt(`Reject payment for ${reg.name}? (This voids their QR pass and denies gate entry):`, 'Invalid payment screenshot / txn not found');
    if (reason !== null) {
        await dataStore.rejectPayment(id, reason.trim() || 'Payment verification rejected by admin');
        showToast(`Payment REJECTED for ${reg.name}. Pass is now VOID ✕`, 'warning');
        refreshAdminView();
    }
}
window.handleRejectPayment = handleRejectPayment;

// Filter registrations table by referral code (e.g. when clicking promoter link or code badge)
function filterRegistrationsByReferral(code) {
    const regTabBtn = document.querySelector('#admin-tabs .tab-btn[data-tab="registrations"]');
    if (regTabBtn) regTabBtn.click();

    const searchInput = document.getElementById('search-registrations');
    const filterSelect = document.getElementById('filter-status');
    if (searchInput) {
        searchInput.value = code;
        renderRegistrationsTable(filterSelect ? filterSelect.value : 'all', code);
        showToast(`Filtered by referral code: "${code}"`, 'info');
    }
}
window.filterRegistrationsByReferral = filterRegistrationsByReferral;

// ──────────── GOOGLE SHEETS STYLE COLUMN VISIBILITY ────────────
const TABLE_COLUMNS = [
    { id: 'col-ticketId', label: 'Ticket ID', defaultVisible: true },
    { id: 'col-name', label: 'Name', defaultVisible: true },
    { id: 'col-email', label: 'Email', defaultVisible: true, hideInCompact: true },
    { id: 'col-phone', label: 'Phone', defaultVisible: true },
    { id: 'col-college', label: 'College', defaultVisible: true, hideInCompact: true },
    { id: 'col-date', label: 'Visiting Date', defaultVisible: true },
    { id: 'col-amount', label: 'Amount', defaultVisible: true, hideInCompact: true },
    { id: 'col-coupon', label: 'Coupon', defaultVisible: true, hideInCompact: true },
    { id: 'col-referral', label: 'Referral Code', defaultVisible: true },
    { id: 'col-txnId', label: 'Txn ID', defaultVisible: true, hideInCompact: true },
    { id: 'col-payment', label: 'Payment', defaultVisible: true },
    { id: 'col-attendance', label: 'Attendance', defaultVisible: true },
    { id: 'col-actions', label: 'Actions', defaultVisible: true }
];

function getHiddenColumns() {
    try {
        const stored = localStorage.getItem('admin_hidden_cols');
        if (stored) return JSON.parse(stored);
    } catch (e) {}
    return [];
}

function saveHiddenColumns(hidden) {
    try {
        localStorage.setItem('admin_hidden_cols', JSON.stringify(hidden));
    } catch (e) {}
    applyColumnVisibility(hidden);
}

function applyColumnVisibility(hidden = getHiddenColumns()) {
    const table = document.getElementById('registrations-table');
    if (!table) return;

    TABLE_COLUMNS.forEach(col => {
        const isHidden = hidden.includes(col.id);
        table.classList.toggle(`hide-${col.id}`, isHidden);
    });

    // Update counter badge on button
    const badge = document.getElementById('hidden-col-count');
    if (badge) {
        if (hidden.length > 0) {
            badge.style.display = 'inline-block';
            badge.textContent = `${hidden.length} hidden`;
        } else {
            badge.style.display = 'none';
        }
    }

    renderColumnMenu();
}

function toggleColumnVisibility(colId) {
    let hidden = getHiddenColumns();
    if (hidden.includes(colId)) {
        hidden = hidden.filter(id => id !== colId);
    } else {
        hidden.push(colId);
    }
    saveHiddenColumns(hidden);
}

function setColumnPreset(preset) {
    let hidden = [];
    if (preset === 'compact') {
        hidden = TABLE_COLUMNS.filter(c => c.hideInCompact).map(c => c.id);
        showToast('Switched to Compact View — no horizontal scroll!', 'info');
    } else {
        hidden = [];
        showToast('All columns visible', 'info');
    }
    saveHiddenColumns(hidden);
}

function toggleColumnMenu(e) {
    if (e) e.stopPropagation();
    const menu = document.getElementById('column-visibility-menu');
    if (!menu) return;
    const isOpen = menu.classList.contains('open');
    if (isOpen) {
        menu.classList.remove('open');
    } else {
        renderColumnMenu();
        menu.classList.add('open');
    }
}

function renderColumnMenu() {
    const menu = document.getElementById('column-visibility-menu');
    if (!menu) return;
    const hidden = getHiddenColumns();

    menu.innerHTML = `
        <div class="col-menu-header">
            <div style="font-weight:700; font-size:0.85rem; color:var(--gold);">⚙️ Hide / Show Columns</div>
            <div class="col-menu-presets">
                <button type="button" class="btn-preset ${hidden.length > 0 ? 'active' : ''}" onclick="setColumnPreset('compact')">Compact</button>
                <button type="button" class="btn-preset ${hidden.length === 0 ? 'active' : ''}" onclick="setColumnPreset('all')">Show All</button>
            </div>
        </div>
        <div class="col-menu-hint">Check or uncheck columns to customize table width (like Google Sheets):</div>
        <div class="col-menu-grid">
            ${TABLE_COLUMNS.map(col => {
                const isVisible = !hidden.includes(col.id);
                return `
                    <label class="col-menu-item">
                        <input type="checkbox" ${isVisible ? 'checked' : ''} onchange="toggleColumnVisibility('${col.id}')">
                        <span>${col.label}</span>
                    </label>
                `;
            }).join('')}
        </div>
    `;
}

function initColumnVisibility() {
    applyColumnVisibility();
    // Close menu when clicking outside
    document.removeEventListener('click', handleColMenuOutsideClick);
    document.addEventListener('click', handleColMenuOutsideClick);
}

function handleColMenuOutsideClick(e) {
    const menu = document.getElementById('column-visibility-menu');
    const btn = document.getElementById('btn-col-visibility');
    if (menu && menu.classList.contains('open') && !menu.contains(e.target) && (!btn || !btn.contains(e.target))) {
        menu.classList.remove('open');
    }
}

window.toggleColumnMenu = toggleColumnMenu;
window.toggleColumnVisibility = toggleColumnVisibility;
window.setColumnPreset = setColumnPreset;


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
            fps: 20,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
                const edge = Math.floor(Math.min(viewfinderWidth, viewfinderHeight) * 0.72);
                return { width: edge, height: edge };
            },
            aspectRatio: 1.0,
            showTorchButtonIfSupported: true,
            experimentalFeatures: {
                useBarCodeDetectorIfSupported: true
            }
        };

        // Query available camera devices and strictly select Back/Rear camera
        let backCameraId = null;
        try {
            const devices = await Html5Qrcode.getCameras();
            if (devices && devices.length > 0) {
                // Find back camera by matching rear/back/environment keywords
                const backCam = devices.find(d => /back|rear|environment|facing\s*back|trás|arrière|rück|wide/i.test(d.label));
                if (backCam) {
                    backCameraId = backCam.id;
                } else if (devices.length > 1) {
                    // On mobile, the last enumerated video device is almost always the back camera
                    backCameraId = devices[devices.length - 1].id;
                } else {
                    backCameraId = devices[0].id;
                }

                // Populate camera select
                const select = document.getElementById('camera-select');
                if (select) {
                    select.style.display = devices.length > 1 ? 'inline-block' : 'none';
                    select.innerHTML = devices.map(d => {
                        const isRear = /back|rear|environment/i.test(d.label) || d.id === backCameraId;
                        return `<option value="${d.id}" ${d.id === backCameraId ? 'selected' : ''}>${d.label || (isRear ? 'Back Camera' : 'Camera ' + d.id)}</option>`;
                    }).join('');
                    select.onchange = async () => {
                        if (isScannerRunning) {
                            await html5QrScanner.stop();
                            await html5QrScanner.start(select.value, config, onScanSuccess, onScanFailure);
                        }
                    };
                }
            }
        } catch (e) {
            console.log('Camera enumeration optional error:', e);
        }

        // Start strictly with back camera
        const cameraConfig = backCameraId 
            ? backCameraId 
            : { facingMode: { exact: 'environment' } };

        try {
            await html5QrScanner.start(
                cameraConfig,
                config,
                onScanSuccess,
                onScanFailure
            );
        } catch (errExact) {
            console.warn('Exact back camera constraint failed, falling back to facingMode environment:', errExact);
            await html5QrScanner.start(
                { facingMode: 'environment' },
                config,
                onScanSuccess,
                onScanFailure
            );
        }

        isScannerRunning = true;
        showToast('Back camera active! Point at ticket QR code', 'info');

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

        // Specific error messages
        const errMsg = (err && err.message) ? err.message.toLowerCase() : '';
        if (errMsg.includes('permission') || errMsg.includes('denied') || errMsg.includes('notallowed')) {
            showToast('Camera permission denied. Please tap the camera icon in your browser address bar and Allow access.', 'error');
        } else if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
            showToast('Camera requires HTTPS. Open the live site at whistlingwoods.careerbeam.in to use the scanner.', 'warning');
        } else if (!window.Html5Qrcode) {
            showToast('QR scanner library failed to load. Check your internet connection and reload the page.', 'error');
        } else {
            showToast('Camera access failed. Try refreshing the page, or use Manual Check-In below.', 'error');
        }
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
async function onScanSuccess(decodedText) {
    const now = Date.now();
    if (decodedText === lastScannedCode && (now - lastScanTime) < 2500) {
        return; // debounce duplicate consecutive frames
    }

    lastScannedCode = decodedText;
    lastScanTime = now;

    // Haptic vibration
    if (navigator.vibrate) navigator.vibrate([80, 40, 80]);

    // Sync fresh from Supabase first so we have the latest attendance state
    if (dataStore.supabaseClient) {
        await dataStore.syncFromSupabase().catch(() => {});
    }

    // Process attendance (marks locally + pushes to Supabase via syncToSupabase)
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
            osc.frequency.setValueAtTime(220, audioCtx.currentTime);
            osc.frequency.setValueAtTime(160, audioCtx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
            osc.start(audioCtx.currentTime);
            osc.stop(audioCtx.currentTime + 0.35);
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
        playScanBeep('success');
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
            ${result.reg.referredBy ? `<div class="scan-detail-row"><span class="scan-detail-label">Referred By:</span><span class="scan-detail-value" style="font-family:monospace; color:var(--lavender); font-weight:600;">${escapeHTML(result.reg.referredBy)}</span></div>` : ''}
        `;
        actionsEl.innerHTML = `
            <button class="btn-small" onclick="document.getElementById('scanner-result').style.display='none'">Dismiss</button>
        `;
    } else if (result.status === 'payment_rejected') {
        playScanBeep('error');
        statusEl.innerHTML = `
            <span class="scan-status-icon">⛔</span>
            <div class="scan-status-text error" style="color:#ef4444; font-size:1.1rem; font-weight:800; letter-spacing:0.5px;">ENTRY DENIED — PAYMENT REJECTED!</div>
            <p style="color:#ef4444; font-size:0.85rem; margin-top:4px; font-weight:600;">${result.message}</p>
        `;
        detailsEl.innerHTML = `
            <div class="scan-detail-row"><span class="scan-detail-label">Attendee:</span><span class="scan-detail-value" style="color:#ef4444; font-weight:bold;">${escapeHTML(result.reg.name)}</span></div>
            <div class="scan-detail-row"><span class="scan-detail-label">Ticket ID:</span><span class="scan-detail-value" style="font-family:monospace; color:#ef4444;">${result.reg.id}</span></div>
            <div class="scan-detail-row"><span class="scan-detail-label">Pass Status:</span><span class="scan-detail-value"><span class="badge" style="background:rgba(239,68,68,0.25); color:#ef4444; border:1px solid #ef4444; font-weight:700;">VOID / PAYMENT REJECTED</span></span></div>
            <div class="scan-detail-row"><span class="scan-detail-label">Txn / Reason:</span><span class="scan-detail-value" style="color:var(--text-muted); font-size:0.82rem;">${escapeHTML(result.reg.transactionId || 'Payment rejected by admin')}</span></div>
        `;
        actionsEl.innerHTML = `
            <button class="btn-small" style="background:#ef4444; color:#fff; font-weight:700;" onclick="document.getElementById('scanner-result').style.display='none'">Dismiss (Entry Denied)</button>
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
    return `${getBaseSiteURL()}?ref=${encodeURIComponent(code)}`;
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
                <td><span class="badge badge-purple" style="font-family:'Integral CF',sans-serif;letter-spacing:1px;cursor:pointer;" onclick="filterRegistrationsByReferral('${p.code}')" title="Click to view registrations for ${p.code}">${p.code}</span></td>
                <td><strong style="color:var(--gold);font-size:1.1rem;cursor:pointer;" onclick="filterRegistrationsByReferral('${p.code}')" title="Click to view registrations for ${p.code}">${count}</strong> <span style="font-size:0.8rem;color:var(--lavender);">student${count !== 1 ? 's' : ''}</span></td>
                <td>
                    <div style="display:flex;gap:8px;align-items:center;">
                        <button class="btn btn-secondary btn-small" onclick="filterRegistrationsByReferral('${p.code}')" title="View student registrations">View Students (${count})</button>
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
        <div class="referral-item" style="cursor:pointer;" onclick="filterRegistrationsByReferral('${r.code}')" title="Click to view all registrations from code ${r.code}">
            <div class="referral-rank">#${i + 1}</div>
            <div class="referral-info">
                <div class="referral-name">${escapeHTML(r.name)}</div>
                <div class="referral-code-text">Code: <strong style="color:var(--gold);">${r.code}</strong></div>
            </div>
            <div class="referral-count"><strong style="color:var(--gold);">${r.count}</strong> referral${r.count !== 1 ? 's' : ''} ➔</div>
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

// ──────────── MANUAL REGISTRATION MODAL ────────────
function openManualRegModal() {
    const existing = document.getElementById('manual-reg-modal');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'manual-reg-modal';
    overlay.className = 'modal-overlay open';
    overlay.onclick = () => overlay.remove();
    overlay.innerHTML = `
        <div class="modal-content glass-card" onclick="event.stopPropagation()" style="max-width: 540px; padding: 28px; border: 1px solid var(--border-glass); max-height: 92vh; overflow-y: auto;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 14px;">
                <h3 style="color:var(--gold); display:flex; align-items:center; gap:8px; margin:0; font-size:1.25rem;">
                    <span>🎟️</span> Add Registration Manually
                </h3>
                <button class="btn-small" onclick="this.closest('.modal-overlay').remove()" style="font-size:1.1rem; line-height:1; cursor:pointer;">✕</button>
            </div>
            <p style="color:var(--text-muted); font-size:0.85rem; margin-bottom:18px; line-height:1.4;">
                Enter student registration details. This generates an official Ticket ID, saves locally, and syncs immediately to Supabase Cloud.
            </p>
            <form id="form-manual-reg" onsubmit="handleSaveManualReg(event)" style="display:flex; flex-direction:column; gap:14px;">
                <div class="form-group">
                    <label class="form-label" style="font-size:0.8rem; font-weight:600; color:var(--text-secondary); margin-bottom:4px; display:block;">Full Name *</label>
                    <input type="text" id="manual-reg-name" class="form-input" placeholder="e.g. Rahul Sharma" required autofocus>
                </div>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
                    <div class="form-group">
                        <label class="form-label" style="font-size:0.8rem; font-weight:600; color:var(--text-secondary); margin-bottom:4px; display:block;">Email Address *</label>
                        <input type="email" id="manual-reg-email" class="form-input" placeholder="student@example.com" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label" style="font-size:0.8rem; font-weight:600; color:var(--text-secondary); margin-bottom:4px; display:block;">Phone Number *</label>
                        <input type="tel" id="manual-reg-phone" class="form-input" placeholder="9876543210" required>
                    </div>
                </div>
                <div style="display:grid; grid-template-columns: 1.2fr 0.8fr; gap:12px;">
                    <div class="form-group">
                        <label class="form-label" style="font-size:0.8rem; font-weight:600; color:var(--text-secondary); margin-bottom:4px; display:block;">College / Institution</label>
                        <input type="text" id="manual-reg-college" class="form-input" placeholder="e.g. KC College">
                    </div>
                    <div class="form-group">
                        <label class="form-label" style="font-size:0.8rem; font-weight:600; color:var(--text-secondary); margin-bottom:4px; display:block;">Academic Year</label>
                        <select id="manual-reg-year" class="form-input">
                            <option value="1st Year">1st Year</option>
                            <option value="2nd Year">2nd Year</option>
                            <option value="3rd Year">3rd Year</option>
                            <option value="4th Year">4th Year</option>
                            <option value="Post Graduate">Post Graduate</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label" style="font-size:0.8rem; font-weight:600; color:var(--text-secondary); margin-bottom:4px; display:block;">Visiting Dates *</label>
                    <select id="manual-reg-date" class="form-input">
                        <option value="Both Days (08th & 09th Oct)">Both Days (08th & 09th Oct)</option>
                        <option value="08th October 2026">08th October 2026 (Day 1 Only)</option>
                        <option value="09th October 2026">09th October 2026 (Day 2 Only)</option>
                    </select>
                </div>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
                    <div class="form-group">
                        <label class="form-label" style="font-size:0.8rem; font-weight:600; color:var(--text-secondary); margin-bottom:4px; display:block;">Transaction ID / Ref</label>
                        <input type="text" id="manual-reg-txn" class="form-input" placeholder="UPI Ref / Cash / Free">
                    </div>
                    <div class="form-group">
                        <label class="form-label" style="font-size:0.8rem; font-weight:600; color:var(--text-secondary); margin-bottom:4px; display:block;">Referred By / Promoter</label>
                        <input type="text" id="manual-reg-ref" class="form-input" placeholder="NILESH / SAHIL">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label" style="font-size:0.8rem; font-weight:600; color:var(--text-secondary); margin-bottom:4px; display:block;">Payment Status</label>
                    <select id="manual-reg-status" class="form-input">
                        <option value="verified" selected>Verified (Payment Confirmed)</option>
                        <option value="pending">Pending (Awaiting Verification)</option>
                    </select>
                </div>
                <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:8px;">
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                    <button type="submit" class="btn btn-primary" id="btn-save-manual-reg" style="background:var(--gold-gradient); color:#000; font-weight:600;">Save & Sync Cloud</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(overlay);
}

async function handleSaveManualReg(e) {
    if (e) e.preventDefault();
    const btn = document.getElementById('btn-save-manual-reg');
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Saving...';
    }

    try {
        const name = document.getElementById('manual-reg-name').value.trim();
        const email = document.getElementById('manual-reg-email').value.trim();
        const phone = document.getElementById('manual-reg-phone').value.trim();
        const college = document.getElementById('manual-reg-college').value.trim();
        const year = document.getElementById('manual-reg-year').value;
        const visitDate = document.getElementById('manual-reg-date').value;
        const transactionId = document.getElementById('manual-reg-txn').value.trim();
        const referredBy = document.getElementById('manual-reg-ref').value.trim();
        const verified = document.getElementById('manual-reg-status').value === 'verified';

        if (!name || !email || !phone) {
            showToast('Please fill in Name, Email, and Phone number.', 'error');
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Save & Sync Cloud';
            }
            return;
        }

        const reg = dataStore.addRegistration({
            name,
            email,
            phone,
            college: college || 'Other',
            year,
            visitDate,
            transactionId: transactionId || 'ADMIN_ENTRY',
            referredBy,
            verified,
            finalPrice: 150
        });

        showToast(`✓ Ticket created for ${name} (${reg.id}) and synced to Cloud!`, 'success');
        const modal = document.getElementById('manual-reg-modal');
        if (modal) modal.remove();
        refreshAdminView();
    } catch (err) {
        console.error('Manual reg error:', err);
        showToast('Error creating registration: ' + (err.message || 'Unknown error'), 'error');
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Save & Sync Cloud';
        }
    }
}

