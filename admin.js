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
        if (search.includes('|') || search.includes(',')) {
            const tokens = search.split(/[|,]+/).map(t => t.trim().toLowerCase()).filter(Boolean);
            regs = regs.filter(r => {
                const referred = (r.referredBy || '').toLowerCase();
                const code = (r.referralCode || '').toLowerCase();
                const name = (r.name || '').toLowerCase();
                const college = (r.college || '').toLowerCase();
                return tokens.some(tok => referred === tok || code === tok || referred.includes(tok) || name.includes(tok) || college.includes(tok));
            });
        } else {
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
        // Detect KES Shroff free registration
        const isFreeKES = (r.transactionId === 'FREE-KES-SHROFF') || (r.couponUsed === 'FREE-KES-SHROFF') || (r.id && r.id.startsWith('KS'));

        return `
        <tr id="row-${r.id}" class="${r.rejected ? 'row-rejected' : ''}">
            <td class="col-ticketId" title="${r.id}"><strong>${r.id}</strong></td>
            <td class="col-name" title="${escapeHTML(r.name)}">${escapeHTML(r.name)}</td>
            <td class="col-email" title="${escapeHTML(r.email)}">${escapeHTML(r.email)}</td>
            <td class="col-phone">${escapeHTML(r.phone)}</td>
            <td class="col-college" title="${escapeHTML(r.college)}">${escapeHTML(r.college)}</td>
            <td class="col-date" title="${escapeHTML(r.visitDate || 'Both Days')}"><span class="badge badge-gold-sm">${escapeHTML(r.visitDate ? (r.visitDate.includes('Both') ? 'Both Days' : (r.visitDate.includes('08th') ? 'Day 1 (8th)' : 'Day 2 (9th)')) : 'Both Days')}</span></td>
            <td class="col-amount">${isFreeKES ? `<span style="color:#4ade80; font-weight:700; font-size:0.8rem;">FREE</span><div style="font-size:0.68rem; color:#4ade80; opacity:0.7; margin-top:2px;">KES Shroff</div>` : `₹${r.finalPrice}`}</td>
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
                ${isFreeKES && !r.rejected ? `<span class="badge badge-verified" style="background:rgba(34,197,94,0.15); color:#4ade80; border:1px solid rgba(34,197,94,0.4);">Free Reg ✓</span>` : `<span class="badge ${r.rejected ? 'badge-rejected' : (r.verified ? 'badge-verified' : 'badge-pending')}" style="${r.rejected ? 'background:rgba(239,68,68,0.2); color:#ef4444; border:1px solid rgba(239,68,68,0.5); font-weight:700;' : ''}">${r.rejected ? 'Rejected ✕' : (r.verified ? 'Verified ✓' : 'Pending')}</span>`}
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
                    ${r.paymentScreenshot ? `<button class="btn-small" onclick="viewScreenshot('${r.id}')" title="${isFreeKES ? 'View College ID / Fee Receipt' : 'View Screenshot'}">${isFreeKES ? '🪪' : '📷'}</button>` : ''}
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

// Filter registrations table by team duos (e.g. clicking a team card or button)
function filterRegistrationsByTeam(teamName, codes) {
    const regTabBtn = document.querySelector('#admin-tabs .tab-btn[data-tab="registrations"]');
    if (regTabBtn) regTabBtn.click();

    const searchInput = document.getElementById('search-registrations');
    const filterSelect = document.getElementById('filter-status');
    const query = Array.isArray(codes) ? codes.join(' | ') : codes;
    if (searchInput) {
        searchInput.value = query;
        if (filterSelect) filterSelect.value = 'all';
        renderRegistrationsTable('all', query);
        showToast(`Filtered by Team: ${teamName} (${query})`, 'info');
    }
}
window.filterRegistrationsByTeam = filterRegistrationsByTeam;

// Filter registrations table specifically for a team's PENDING leads (for easy conversion follow-up)
function filterRegistrationsByTeamPending(teamName, codes) {
    const regTabBtn = document.querySelector('#admin-tabs .tab-btn[data-tab="registrations"]');
    if (regTabBtn) regTabBtn.click();

    const searchInput = document.getElementById('search-registrations');
    const filterSelect = document.getElementById('filter-status');
    const query = Array.isArray(codes) ? codes.join(' | ') : codes;
    if (searchInput) {
        searchInput.value = query;
        if (filterSelect) filterSelect.value = 'pending';
        renderRegistrationsTable('pending', query);
        showToast(`Showing Pending Leads for Team: ${teamName}`, 'warning');
    }
}
window.filterRegistrationsByTeamPending = filterRegistrationsByTeamPending;

// Copy pending leads message formatted ready for WhatsApp follow-up
function copyTeamPendingLeads(teamName, codes) {
    const memberCodes = (Array.isArray(codes) ? codes : [codes]).map(c => String(c).trim().toUpperCase());
    const regs = dataStore.getRegistrations();
    const pending = regs.filter(r => {
        const ref = (r.referredBy || '').trim().toUpperCase();
        return memberCodes.includes(ref) && !r.verified;
    });

    if (pending.length === 0) {
        showToast(`No pending leads for Team ${teamName}! All signups verified 🎉`, 'success');
        return;
    }

    const lines = [
        `🎯 *Pending Registrations — Team ${teamName}* (${pending.length} Leads)`,
        `Hey guys, these students initiated registration but haven't submitted payment/screenshot yet. Please reach out to them and convert:`,
        ''
    ];

    pending.forEach((r, idx) => {
        lines.push(`${idx + 1}. *${r.name}* — ${r.phone || 'No phone'} (Referral: ${r.referredBy || '—'})${r.college ? ` [${r.college}]` : ''}`);
    });

    lines.push('');
    lines.push(`Let's get them converted! 🚀`);

    const text = lines.join('\n');
    navigator.clipboard.writeText(text).then(() => {
        showToast(`Copied ${pending.length} pending leads for ${teamName}! Ready to paste in WhatsApp.`, 'success');
    }).catch(() => {
        showToast(`Pending leads ready`, 'info');
    });
}
window.copyTeamPendingLeads = copyTeamPendingLeads;

// Share full live leaderboard standings formatted for WhatsApp
function shareLeaderboardWhatsApp() {
    const teamStats = dataStore.getTeamReferralStats ? dataStore.getTeamReferralStats() : [];
    const topInd = dataStore.getTopReferrers ? dataStore.getTopReferrers(5) : [];

    const medals = ['🥇', '🥈', '🥉', '🏅'];
    const lines = [
        `🏆 *CELEBRATE CINEMA 2026 — AMBASSADOR DUO CHAMPIONSHIP* 🏆`,
        `Whistling Woods International • Live Leaderboard Standings`,
        `━━━━━━━━━━━━━━━━━━━━━`
    ];

    teamStats.forEach((t, i) => {
        const medal = medals[i] || '🏅';
        lines.push(`${medal} *${i + 1}. ${t.name}*`);
        lines.push(`   📊 ${t.total} Signups (${t.verified} Verified, ${t.pending} Pending) • ${t.conversionRate}% Conv.`);
        lines.push(`   👥 ${t.members[0].name}: ${t.members[0].count} | ${t.members[1].name}: ${t.members[1].count}`);
        lines.push(``);
    });

    if (topInd.length > 0) {
        lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
        lines.push(`⭐ *Top Individual Performers:*`);
        topInd.slice(0, 3).forEach((r, i) => {
            lines.push(`${i + 1}. ${r.name} (${r.code}) — ${r.count} signups`);
        });
        lines.push(``);
    }

    lines.push(`Keep pushing team! Register student passes here:`);
    lines.push(`${window.location.origin}${window.location.pathname}`);

    const text = lines.join('\n');
    navigator.clipboard.writeText(text).then(() => {
        showToast('Leaderboard text copied! Opening WhatsApp...', 'success');
        const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(waUrl, '_blank');
    }).catch(() => {
        const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(waUrl, '_blank');
    });
}
window.shareLeaderboardWhatsApp = shareLeaderboardWhatsApp;

// Search & Sort state
let currentLeaderboardSearch = '';
let currentLeaderboardSort = 'total';

function handleLeaderboardSearch(query) {
    currentLeaderboardSearch = (query || '').toLowerCase().trim();
    renderReferralLeaderboard();
}
window.handleLeaderboardSearch = handleLeaderboardSearch;

function handleLeaderboardSortChange(sortBy) {
    currentLeaderboardSort = sortBy || 'total';
    renderReferralLeaderboard();
}
window.handleLeaderboardSortChange = handleLeaderboardSortChange;

// Switch between Team Leaderboard, Individual Leaderboard, or All Views
function switchLeaderboardView(view) {
    const teamPane = document.getElementById('pane-team-leaderboard');
    const indPane = document.getElementById('pane-individual-leaderboard');
    const buttons = document.querySelectorAll('#leaderboard-view-switch .btn-toggle');

    buttons.forEach(btn => {
        if (btn.dataset.view === view) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    if (view === 'teams') {
        if (teamPane) { teamPane.style.display = 'block'; teamPane.classList.add('active'); }
        if (indPane) { indPane.style.display = 'none'; indPane.classList.remove('active'); }
    } else if (view === 'individuals') {
        if (teamPane) { teamPane.style.display = 'none'; teamPane.classList.remove('active'); }
        if (indPane) { indPane.style.display = 'block'; indPane.classList.add('active'); }
    } else { // 'both'
        if (teamPane) { teamPane.style.display = 'block'; teamPane.classList.add('active'); }
        if (indPane) { indPane.style.display = 'block'; indPane.classList.add('active'); }
    }
}
window.switchLeaderboardView = switchLeaderboardView;

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

// ──────────── VIEW SCREENSHOT / ID CARD ────────────
function viewScreenshot(id) {
    const reg = dataStore.getRegistrationById(id);
    if (!reg || !reg.paymentScreenshot) return;
    const isFreeKES = (reg.transactionId === 'FREE-KES-SHROFF') || (reg.couponUsed === 'FREE-KES-SHROFF') || (reg.id && reg.id.startsWith('KS'));
    const titleText = isFreeKES ? `College ID / Fee Receipt — ${escapeHTML(reg.name)}` : `Payment Screenshot — ${escapeHTML(reg.name)}`;
    const isPdf = reg.paymentScreenshot.startsWith('PDF:') || reg.paymentScreenshot.startsWith('data:application/pdf');

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay open';
    overlay.onclick = () => overlay.remove();
    overlay.innerHTML = `
        <div class="modal-content glass-card" onclick="event.stopPropagation()" style="max-width: 550px; padding: 24px; border: 1px solid var(--border-glass);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 16px;">
                <h3 style="font-size:1.1rem; color:var(--gold);">${titleText}</h3>
                <button class="btn-small" onclick="this.closest('.modal-overlay').remove()">Close ✕</button>
            </div>
            ${isPdf ? `
                <div style="text-align:center; padding:32px; background:rgba(255,255,255,0.04); border-radius:12px; border:1px solid rgba(255,255,255,0.08);">
                    <div style="font-size:3rem; margin-bottom:10px;">📄</div>
                    <p style="color:var(--text); font-weight:600;">Uploaded Document (PDF)</p>
                    <p style="color:var(--lavender); font-size:0.85rem; margin-top:6px;">${escapeHTML(reg.paymentScreenshot.replace(/^PDF:/, ''))}</p>
                </div>
            ` : `
                <img src="${reg.paymentScreenshot}" alt="${isFreeKES ? 'ID Card / Fee Receipt' : 'Payment Screenshot'}" style="max-width:100%; max-height:440px; object-fit:contain; border-radius:12px; display:block; margin:0 auto; box-shadow: 0 4px 20px rgba(0,0,0,0.5);">
            `}
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top: 16px; font-size: 0.85rem; color: var(--text-muted); border-top:1px solid rgba(255,255,255,0.08); padding-top:12px;">
                <span>College: <strong style="color:var(--text);">${escapeHTML(reg.college || 'KES Shroff')}</strong></span>
                <span>${isFreeKES ? '<strong style="color:#4ade80;">FREE REGISTRATION</strong>' : `Txn ID: <strong>${escapeHTML(reg.transactionId || 'N/A')}</strong>`}</span>
            </div>
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
            fps: 10,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
                const edge = Math.floor(Math.min(viewfinderWidth, viewfinderHeight) * 0.85);
                return { width: edge, height: edge };
            },
            aspectRatio: 1.0,
            showTorchButtonIfSupported: true
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
function onScanSuccess(decodedText) {
    if (!decodedText) return;
    const cleanText = decodedText.trim();
    const now = Date.now();
    if (cleanText === lastScannedCode && (now - lastScanTime) < 2500) {
        return; // debounce duplicate consecutive frames
    }

    lastScannedCode = cleanText;
    lastScanTime = now;

    // Haptic vibration
    if (navigator.vibrate) navigator.vibrate([80, 40, 80]);

    // Process attendance IMMEDIATELY with zero network latency
    const result = dataStore.markAttendance(cleanText);
    displayScanResult(result);
    renderRecentCheckins();
    renderStats();
    renderRegistrationsTable();

    // Background sync to ensure Supabase stays completely up-to-date
    if (dataStore.supabaseClient) {
        dataStore.syncFromSupabase().then(() => {
            renderRecentCheckins();
            renderStats();
            renderRegistrationsTable();
        }).catch(() => {});
    }
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

    const teamGrid = document.getElementById('team-leaderboard-grid');
    const indContainer = document.getElementById('referral-leaderboard');
    const statsBar = document.getElementById('leaderboard-stats-bar');

    let teamStats = dataStore.getTeamReferralStats ? dataStore.getTeamReferralStats() : [];
    let topReferrers = dataStore.getTopReferrers ? dataStore.getTopReferrers(50) : [];

    // Apply client-side sorting to teams
    if (currentLeaderboardSort === 'verified') {
        teamStats.sort((a, b) => b.verified - a.verified || b.total - a.total);
    } else if (currentLeaderboardSort === 'conversion') {
        teamStats.sort((a, b) => b.conversionRate - a.conversionRate || b.total - a.total);
    } else if (currentLeaderboardSort === 'revenue') {
        teamStats.sort((a, b) => b.revenue - a.revenue || b.total - a.total);
    } else {
        teamStats.sort((a, b) => b.total - a.total || b.verified - a.verified);
    }

    // Apply client-side search query
    if (currentLeaderboardSearch) {
        const q = currentLeaderboardSearch;
        teamStats = teamStats.filter(t => 
            t.name.toLowerCase().includes(q) ||
            t.codes.some(c => c.toLowerCase().includes(q)) ||
            t.members.some(m => m.name.toLowerCase().includes(q))
        );
        topReferrers = topReferrers.filter(r => 
            r.name.toLowerCase().includes(q) ||
            r.code.toLowerCase().includes(q)
        );
    }

    // 1. Render Top Summary Stats Bar
    if (statsBar) {
        const allTeams = dataStore.getTeamReferralStats ? dataStore.getTeamReferralStats() : [];
        const topTeam = allTeams.length > 0 && allTeams[0].total > 0 ? allTeams[0] : null;
        const topInd = topReferrers.length > 0 ? topReferrers[0] : null;
        const allTeamTotal = allTeams.reduce((s, t) => s + t.total, 0);
        const allTeamVerified = allTeams.reduce((s, t) => s + t.verified, 0);
        const allTeamPending = allTeams.reduce((s, t) => s + t.pending, 0);
        const allTeamRevenue = allTeams.reduce((s, t) => s + t.revenue, 0);
        const overallConv = allTeamTotal > 0 ? Math.round((allTeamVerified / allTeamTotal) * 100) : 0;

        statsBar.innerHTML = `
            <div class="stat-pill-item">
                <div class="stat-pill-icon">👑</div>
                <div class="stat-pill-info">
                    <span class="stat-pill-label">Leading Duo</span>
                    <strong class="stat-pill-val">${topTeam ? escapeHTML(topTeam.name) : 'Tie / All 0'}</strong>
                </div>
            </div>
            <div class="stat-pill-item">
                <div class="stat-pill-icon">🔥</div>
                <div class="stat-pill-info">
                    <span class="stat-pill-label">Top Performer</span>
                    <strong class="stat-pill-val">${topInd ? `${escapeHTML(topInd.name)} (${topInd.count})` : 'None yet'}</strong>
                </div>
            </div>
            <div class="stat-pill-item">
                <div class="stat-pill-icon">👥</div>
                <div class="stat-pill-info">
                    <span class="stat-pill-label">Total Duo Signups</span>
                    <strong class="stat-pill-val" style="color:var(--gold);">${allTeamTotal} total</strong>
                </div>
            </div>
            <div class="stat-pill-item">
                <div class="stat-pill-icon">✓</div>
                <div class="stat-pill-info">
                    <span class="stat-pill-label">Verified / Pending</span>
                    <strong class="stat-pill-val" style="color:#10b981;">${allTeamVerified} <span style="font-size:0.75rem; color:#f59e0b;">(${allTeamPending} pending)</span></strong>
                </div>
            </div>
            <div class="stat-pill-item">
                <div class="stat-pill-icon">🎯</div>
                <div class="stat-pill-info">
                    <span class="stat-pill-label">Conversion Rate</span>
                    <strong class="stat-pill-val" style="color:var(--lavender);">${overallConv}%</strong>
                </div>
            </div>
            <div class="stat-pill-item hide-on-compact">
                <div class="stat-pill-icon">₹</div>
                <div class="stat-pill-info">
                    <span class="stat-pill-label">Duo Revenue</span>
                    <strong class="stat-pill-val" style="color:var(--gold);">₹${allTeamRevenue.toLocaleString('en-IN')}</strong>
                </div>
            </div>
        `;
    }

    // 2. Render Team Leaderboard Cards
    if (teamGrid) {
        if (teamStats.length === 0) {
            teamGrid.innerHTML = `
                <div class="no-data" style="grid-column: 1 / -1; padding: var(--space-xl);">
                    <div class="no-data-icon">🔍</div>
                    <p>No teams match "${escapeHTML(currentLeaderboardSearch)}"</p>
                    <button class="btn btn-secondary btn-small" onclick="handleLeaderboardSearch(''); document.getElementById('leaderboard-search-input').value = '';">Clear Search</button>
                </div>
            `;
        } else {
            const rankBadges = [
                { rank: 1, title: 'GOLD CHAMPION', badgeClass: 'rank-1', medal: '🥇', ribbon: '👑 1ST PLACE' },
                { rank: 2, title: 'SILVER RUNNER-UP', badgeClass: 'rank-2', medal: '🥈', ribbon: '⚡ 2ND PLACE' },
                { rank: 3, title: 'BRONZE 3RD PLACE', badgeClass: 'rank-3', medal: '🥉', ribbon: '🔥 3RD PLACE' },
                { rank: 4, title: '4TH CONTENDER', badgeClass: 'rank-4', medal: '🏅', ribbon: '🚀 4TH PLACE' }
            ];

            teamGrid.innerHTML = teamStats.map((team, idx) => {
                const meta = rankBadges[idx] || { rank: idx + 1, title: `#${idx + 1}`, badgeClass: 'rank-other', medal: '🏅', ribbon: `#${idx + 1}` };
                const m1 = team.members[0];
                const m2 = team.members[1];
                const codesParam = JSON.stringify(team.codes).replace(/"/g, '&quot;');
                const teamNameEsc = escapeHTML(team.name).replace(/'/g, "\\'");

                const m1Initial = (m1.name || 'P1').charAt(0).toUpperCase();
                const m2Initial = (m2.name || 'P2').charAt(0).toUpperCase();

                return `
                    <div class="team-card ${meta.badgeClass}">
                        <div class="team-card-header">
                            <div class="team-rank-ribbon">
                                <span class="rank-medal">${meta.medal}</span>
                                <span class="rank-title">${meta.ribbon}</span>
                            </div>
                            <div class="team-badges-cluster">
                                <span class="badge badge-success" title="Conversion rate of registrations that paid & verified">🎯 ${team.conversionRate}% Conv</span>
                                <span class="badge badge-purple" title="Leading member in this duo">${team.mvp !== 'Equal' ? `⭐ ${escapeHTML(team.mvp)} Lead` : '🤝 Tied'}</span>
                            </div>
                        </div>

                        <div class="team-card-body">
                            <!-- Team Name & Duo Avatars -->
                            <div class="team-identity-row">
                                <div class="duo-avatar-rings">
                                    <span class="avatar-ring ring-1" title="${escapeHTML(m1.name)} (${m1.code})">${m1Initial}</span>
                                    <span class="avatar-ring ring-2" title="${escapeHTML(m2.name)} (${m2.code})">${m2Initial}</span>
                                </div>
                                <h4 class="team-name">${escapeHTML(team.name)}</h4>
                            </div>
                            
                            <!-- Primary Metric & Sub-Pills -->
                            <div class="team-metrics-row">
                                <div class="team-primary-stat" onclick="filterRegistrationsByTeam('${teamNameEsc}', ${codesParam})" title="Click to view all registrations from ${escapeHTML(team.name)}" style="cursor:pointer;">
                                    <div class="team-metric-number">${team.total}</div>
                                    <div class="team-metric-caption">Student Signups</div>
                                </div>
                                <div class="team-sub-metrics">
                                    <div class="metric-pill pill-verified" onclick="filterRegistrationsByTeam('${teamNameEsc}', ${codesParam})" title="Verified & paid signups" style="cursor:pointer;">
                                        <span class="pill-dot">●</span> <strong>${team.verified}</strong> Verified
                                    </div>
                                    <div class="metric-pill pill-pending" onclick="filterRegistrationsByTeamPending('${teamNameEsc}', ${codesParam})" title="Click to view/filter pending signups" style="cursor:pointer;">
                                        <span class="pill-dot">●</span> <strong>${team.pending}</strong> Pending
                                    </div>
                                    <div class="metric-pill pill-revenue" title="Revenue generated from referrals">
                                        ₹<strong>${team.revenue.toLocaleString('en-IN')}</strong>
                                    </div>
                                </div>
                            </div>

                            <!-- Milestone Tracker Bar -->
                            <div class="milestone-tracker" title="Progress towards next milestone">
                                <div class="milestone-label-row">
                                    <span class="milestone-title">🎯 Next Goal: <strong>${team.nextMilestone} Signups</strong></span>
                                    <span class="milestone-percent">${team.milestoneProgress}%</span>
                                </div>
                                <div class="milestone-progress-bar">
                                    <div class="milestone-fill" style="width: ${team.milestoneProgress}%;"></div>
                                </div>
                            </div>

                            <!-- Teammate Split Breakdown -->
                            <div class="duo-split-wrapper">
                                <div class="duo-split-labels">
                                    <span class="duo-label left" onclick="filterRegistrationsByReferral('${m1.code}')" title="Filter by ${m1.name}">
                                        <strong>${escapeHTML(m1.name)}</strong>: ${m1.count} <small>(${m1.verified} ver)</small>
                                    </span>
                                    <span class="duo-split-ratio">${team.total > 0 ? `${team.split1}% vs ${team.split2}%` : '50% vs 50%'}</span>
                                    <span class="duo-label right" onclick="filterRegistrationsByReferral('${m2.code}')" title="Filter by ${m2.name}">
                                        <strong>${escapeHTML(m2.name)}</strong>: ${m2.count} <small>(${m2.verified} ver)</small>
                                    </span>
                                </div>
                                <div class="duo-split-bar" title="Contribution split between ${m1.name} and ${m2.name}">
                                    <div class="duo-bar-segment segment-left" style="width: ${team.split1}%;"></div>
                                    <div class="duo-bar-segment segment-right" style="width: ${team.split2}%;"></div>
                                </div>
                            </div>

                            <!-- Individual Code Quick Filter Tags -->
                            <div class="team-codes-bar">
                                <span class="codes-label">Quick Filter:</span>
                                <span class="badge badge-purple team-code-badge" onclick="filterRegistrationsByReferral('${m1.code}')" title="View only ${m1.name}'s (${m1.code}) referrals">
                                    ${m1.code} (${m1.count})
                                </span>
                                <span class="badge badge-purple team-code-badge" onclick="filterRegistrationsByReferral('${m2.code}')" title="View only ${m2.name}'s (${m2.code}) referrals">
                                    ${m2.code} (${m2.count})
                                </span>
                            </div>
                        </div>

                        <!-- Team Card Action Buttons -->
                        <div class="team-card-footer">
                            <div class="team-footer-actions">
                                <button type="button" class="btn btn-primary btn-small btn-flex" onclick="filterRegistrationsByTeam('${teamNameEsc}', ${codesParam})" title="View all registrations from this team">
                                    <span>View All (${team.total})</span>
                                    <svg class="btn-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:13px;height:13px;">
                                        <line x1="5" y1="12" x2="19" y2="12"></line>
                                        <polyline points="12 5 19 12 12 19"></polyline>
                                    </svg>
                                </button>
                                <button type="button" class="btn btn-secondary btn-small btn-flex" onclick="filterRegistrationsByTeamPending('${teamNameEsc}', ${codesParam})" title="Filter exclusively unverified / pending leads">
                                    <span>⏳ Follow-up (${team.pending})</span>
                                </button>
                            </div>
                            ${team.pending > 0 ? `
                                <button type="button" class="btn btn-copy-leads btn-small" onclick="copyTeamPendingLeads('${teamNameEsc}', ${codesParam})" title="Copy formatted pending leads list to WhatsApp">
                                    <span>📋 Copy ${team.pending} Pending Leads</span>
                                </button>
                            ` : ''}
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    // 3. Render Individual Referral Leaderboard
    if (indContainer) {
        if (topReferrers.length === 0) {
            indContainer.innerHTML = `
                <div class="no-data" style="padding: var(--space-xl);">
                    <div class="no-data-icon">🏆</div>
                    <p>No referrals found matching query</p>
                </div>
            `;
        } else {
            indContainer.innerHTML = topReferrers.map((r, i) => {
                const rankNum = i + 1;
                const medal = rankNum === 1 ? '🥇' : (rankNum === 2 ? '🥈' : (rankNum === 3 ? '🥉' : `#${rankNum}`));
                const rankClass = rankNum <= 3 ? `rank-${rankNum}` : '';
                const initial = (r.name || 'S').charAt(0).toUpperCase();

                return `
                    <div class="referral-item ${rankClass}" onclick="filterRegistrationsByReferral('${r.code}')" title="Click to view all registrations from code ${r.code}">
                        <div class="referral-rank-badge">${medal}</div>
                        <div class="referral-avatar-badge">${initial}</div>
                        <div class="referral-info">
                            <div class="referral-name-row">
                                <span class="referral-name">${escapeHTML(r.name)}</span>
                            </div>
                            <div class="referral-code-text">
                                Code: <strong class="referral-code-tag">${r.code}</strong>
                            </div>
                        </div>
                        <div class="referral-count-pill">
                            <strong class="count-num">${r.count}</strong>
                            <span class="count-label">student${r.count !== 1 ? 's' : ''}</span>
                            <span class="count-arrow">➔</span>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }
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

            // Auto-load Principals tab data on tab switch
            if (newTab.dataset.tab === 'principals') {
                loadPrincipalsTab();
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

// ══════════════════════════════════════════════
// PRINCIPALS RSVP — Admin Dashboard
// ══════════════════════════════════════════════

let _allPrincipalRsvps = [];  // cache for search

const PRINCIPALS_SB_URL = 'https://rnylpxfjhxpmjwolsqcd.supabase.co';
const PRINCIPALS_SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJueWxweGZqaHhwbWp3b2xzcWNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwOTgwMDEsImV4cCI6MjEwMzY3NDAwMX0.ms0YzXZ2Lb-VFpqEjD9BrAYzDp81ZklQwCwNnkyP6U8';

async function loadPrincipalsTab() {
    const syncBtn = document.getElementById('sync-principals-btn');
    if (syncBtn) { syncBtn.disabled = true; syncBtn.textContent = '⟳ Loading…'; }

    let rsvps = [];

    // 1. Try Supabase SDK client (from dataStore or create directly)
    try {
        let client = (typeof dataStore !== 'undefined' && dataStore?.supabaseClient) ||
                     (window.dataStore && window.dataStore.supabaseClient);

        if (!client && window.supabase && typeof window.supabase.createClient === 'function') {
            const url = (typeof CONFIG !== 'undefined' && CONFIG.SUPABASE_URL) || PRINCIPALS_SB_URL;
            const key = (typeof CONFIG !== 'undefined' && CONFIG.SUPABASE_ANON_KEY) || PRINCIPALS_SB_KEY;
            client = window.supabase.createClient(url, key);
        }

        if (client) {
            const { data, error } = await client
                .from('principal_rsvps')
                .select('*')
                .order('submitted_at', { ascending: false });

            if (!error && data && Array.isArray(data)) {
                rsvps = data;
            } else if (error) {
                console.warn('Principals RSVP Supabase SDK error:', error.message);
            }
        }
    } catch (e) {
        console.warn('Principals RSVP SDK exception:', e);
    }

    // 2. Direct REST API fallback (guaranteed to succeed in any browser)
    if (rsvps.length === 0) {
        try {
            const url = `${PRINCIPALS_SB_URL}/rest/v1/principal_rsvps?select=*&order=submitted_at.desc`;
            const resp = await fetch(url, {
                headers: {
                    'apikey': PRINCIPALS_SB_KEY,
                    'Authorization': `Bearer ${PRINCIPALS_SB_KEY}`
                }
            });
            if (resp.ok) {
                const data = await resp.json();
                if (Array.isArray(data) && data.length > 0) {
                    rsvps = data;
                }
            }
        } catch (e) {
            console.warn('Principals REST fetch error:', e);
        }
    }

    // 3. Fallback: local storage (if submitted offline on this browser)
    if (rsvps.length === 0) {
        try {
            const local = JSON.parse(localStorage.getItem('cc2026_principal_rsvps') || '[]');
            if (local.length > 0) rsvps = local;
        } catch (e) {}
    }

    _allPrincipalRsvps = rsvps;
    renderPrincipalsTable(rsvps);
    renderPrincipalsStats(rsvps);

    if (syncBtn) { syncBtn.disabled = false; syncBtn.textContent = '⟳ Refresh'; }
}

function renderPrincipalsStats(rsvps) {
    const statsEl = document.getElementById('principals-stats');
    if (!statsEl) return;

    const total     = rsvps.length;
    const attending = rsvps.filter(r => r.attending === true || r.attending === 'true').length;
    const declined  = total - attending;

    statsEl.innerHTML = `
        <div class="stat-card" style="padding:10px 18px; min-width:unset; flex:0 0 auto;">
            <div class="stat-label" style="font-size:0.72rem;">Total RSVPs</div>
            <div class="stat-value" style="font-size:1.4rem;">${total}</div>
        </div>
        <div class="stat-card" style="padding:10px 18px; min-width:unset; flex:0 0 auto; border-color:rgba(16,185,129,0.35);">
            <div class="stat-label" style="font-size:0.72rem;">✓ Attending</div>
            <div class="stat-value" style="font-size:1.4rem; color:#10b981;">${attending}</div>
        </div>
        <div class="stat-card" style="padding:10px 18px; min-width:unset; flex:0 0 auto; border-color:rgba(239,68,68,0.35);">
            <div class="stat-label" style="font-size:0.72rem;">✗ Declined</div>
            <div class="stat-value" style="font-size:1.4rem; color:#ef4444;">${declined}</div>
        </div>
    `;
}

function renderPrincipalsTable(rsvps) {
    const tbody   = document.getElementById('principals-tbody');
    const noData  = document.getElementById('no-principals');
    const wrapper = document.getElementById('principals-table-wrapper');

    if (!tbody) return;

    if (!rsvps || rsvps.length === 0) {
        if (noData)  noData.style.display  = 'block';
        if (wrapper) wrapper.style.display  = 'none';
        return;
    }

    if (noData)  noData.style.display  = 'none';
    if (wrapper) wrapper.style.display  = 'block';

    tbody.innerHTML = rsvps.map((r, idx) => {
        const isAttending = r.attending === true || r.attending === 'true';
        const submittedAt = r.submitted_at
            ? new Date(r.submitted_at).toLocaleString('en-IN', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
              })
            : '—';

        const rsvpBadge = isAttending
            ? `<span class="badge badge-success" style="background:rgba(16,185,129,0.15);color:#6ee7b7;border:1px solid rgba(16,185,129,0.35);">🎓 Attending</span>`
            : `<span class="badge" style="background:rgba(239,68,68,0.10);color:#fc8181;border:1px solid rgba(239,68,68,0.28);">🙏 Declined</span>`;

        return `<tr>
            <td style="color:var(--text-muted);font-size:0.8rem;">${idx + 1}</td>
            <td style="font-weight:600;">${_escHtml(r.name || '—')}</td>
            <td style="color:var(--text-secondary);">${_escHtml(r.college || '—')}</td>
            <td><a href="mailto:${_escHtml(r.email || '')}" style="color:var(--primary-light);text-decoration:none;" title="Email">${_escHtml(r.email || '—')}</a></td>
            <td><a href="tel:${_escHtml(r.phone || '')}" style="color:var(--text-secondary);text-decoration:none;">${_escHtml(r.phone || '—')}</a></td>
            <td>${rsvpBadge}</td>
            <td style="color:var(--text-muted);font-size:0.8rem;white-space:nowrap;">${submittedAt}</td>
        </tr>`;
    }).join('');
}

function handlePrincipalsSearch(query) {
    if (!query || !query.trim()) {
        renderPrincipalsTable(_allPrincipalRsvps);
        return;
    }
    const q = query.trim().toLowerCase();
    const filtered = _allPrincipalRsvps.filter(r =>
        (r.name    || '').toLowerCase().includes(q) ||
        (r.college || '').toLowerCase().includes(q) ||
        (r.email   || '').toLowerCase().includes(q) ||
        (r.phone   || '').includes(q)
    );
    renderPrincipalsTable(filtered);
}

function exportPrincipalsCSV() {
    const rsvps = _allPrincipalRsvps;
    if (!rsvps.length) { showToast('No data to export.', 'info'); return; }

    const headers = ['#', 'Name', 'College / Institution', 'Email', 'Phone', 'RSVP', 'Submitted At'];
    const rows = rsvps.map((r, i) => [
        i + 1,
        `"${(r.name    || '').replace(/"/g, '""')}"`,
        `"${(r.college || '').replace(/"/g, '""')}"`,
        r.email || '',
        r.phone || '',
        (r.attending === true || r.attending === 'true') ? 'Attending' : 'Declined',
        r.submitted_at ? new Date(r.submitted_at).toLocaleString('en-IN') : ''
    ]);

    const csv  = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `principal_rsvps_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`✓ Exported ${rsvps.length} principal RSVP records as CSV`, 'success');
}

// Private HTML-escape helper (avoids collision with any existing escapeHtml)
function _escHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
