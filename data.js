// ============================================
// DATA LAYER — Celebrate Cinema 2026
// ============================================

const CONFIG = {
    BASE_PRICE: 150,
    EARLY_BIRD_DISCOUNT: 0,
    MIN_PRICE: 0,
    ADMIN_PASSWORD: 'admin2026',
    EVENT_NAME: 'Celebrate Cinema 2026 — Academic Trek',
    EVENT_TAGLINE: 'Big Screen',
    EVENT_DATE: new Date('2026-10-08T09:00:00+05:30'),
    EVENT_DATE_STR: '08th & 09th October 2026',
    EVENT_TIME_STR: '9:00 AM to 5:00 PM',
    EVENT_VENUE: 'Whistling Woods International, Film City, Goregaon East, Mumbai',
    PROMOTED_BY: 'CareerBeam – Vigor',
    UPI_VPA: '7208070768@ibl',              // UPI Virtual Payment Address
    UPI_PAYEE_NAME: 'Vigor LaunchPad',
    CONTACT_PERSON: 'Nilesh Gupta',
    CONTACT_ROLE: 'Marketing & Events Executive',
    CONTACT_PHONE: '8699260386',
    SUPABASE_URL: 'https://rnylpxfjhxpmjwolsqcd.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJueWxweGZqaHhwbWp3b2xzcWNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwOTgwMDEsImV4cCI6MjEwMzY3NDAwMX0.ms0YzXZ2Lb-VFpqEjD9BrAYzDp81ZklQwCwNnkyP6U8',
    STORAGE_KEYS: {
        REGISTRATIONS: 'cc2026_registrations',
        COUPONS: 'cc2026_coupons',
        ADMIN_AUTH: 'cc2026_admin_auth',
        SUPABASE_CONFIG: 'cc2026_supabase_config'
    }
};

const DEFAULT_COUPONS = [
    { code: 'CINEMA50', discount: 50, active: true, description: '₹50 off' },
    { code: 'EARLYBIRD25', discount: 25, active: true, description: '₹25 off' },
    { code: 'WWI100', discount: 100, active: true, description: '₹100 off — Free Entry!' },
    { code: 'FILMS30', discount: 30, active: true, description: '₹30 off' }
];

// ============================================
// DATA STORE CLASS
// ============================================
class DataStore {
    constructor() {
        this._initCoupons();
        this.supabaseClient = null;
        this._initSupabase();
    }

    // ──────────── SUPABASE INTEGRATION ────────────
    _initSupabase() {
        try {
            const savedConfig = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.SUPABASE_CONFIG) || 'null');
            const url = savedConfig?.url || CONFIG.SUPABASE_URL;
            const anonKey = savedConfig?.anonKey || CONFIG.SUPABASE_ANON_KEY;

            if (!url || !anonKey) return;

            const tryConnect = (attempts = 15) => {
                if (window.supabase && typeof window.supabase.createClient === 'function') {
                    this.supabaseClient = window.supabase.createClient(url, anonKey);
                    console.log('⚡ Supabase client initialized with cloud backend');
                    this.syncFromSupabase();
                    this._subscribeRealtime();
                } else if (attempts > 0) {
                    setTimeout(() => tryConnect(attempts - 1), 200);
                } else {
                    console.warn('Supabase SDK library not available after retries');
                }
            };

            tryConnect();
        } catch (e) {
            console.warn('Supabase init warning:', e);
        }
    }

    _subscribeRealtime() {
        if (!this.supabaseClient) return;
        try {
            this.supabaseClient
                .channel('public:registrations')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'registrations' }, payload => {
                    console.log('⚡ Real-time Supabase update received:', payload.eventType);
                    if (payload.eventType === 'DELETE' && payload.old && payload.old.id) {
                        const targetId = payload.old.id;
                        const regs = this.getRegistrations().filter(r => r.id !== targetId);
                        this.saveRegistrations(regs);
                        if (typeof refreshAdminView === 'function') refreshAdminView();
                        if (typeof renderNamesWall === 'function') renderNamesWall();
                    } else {
                        this.syncFromSupabase();
                    }
                })
                .subscribe();
        } catch (e) {
            console.log('Supabase realtime optional:', e);
        }
    }

    setSupabaseConfig(url, anonKey) {
        if (!url || !anonKey) {
            localStorage.removeItem(CONFIG.STORAGE_KEYS.SUPABASE_CONFIG);
            this.supabaseClient = null;
            return { success: true, message: 'Custom Supabase credentials removed' };
        }
        localStorage.setItem(CONFIG.STORAGE_KEYS.SUPABASE_CONFIG, JSON.stringify({ url, anonKey }));
        if (window.supabase) {
            this.supabaseClient = window.supabase.createClient(url, anonKey);
            this.syncFromSupabase();
            this._subscribeRealtime();
            return { success: true, message: 'Supabase connected successfully!' };
        }
        return { success: true, message: 'Supabase credentials saved.' };
    }

    getSupabaseConfig() {
        try {
            const saved = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.SUPABASE_CONFIG) || 'null');
            return saved || { url: CONFIG.SUPABASE_URL, anonKey: CONFIG.SUPABASE_ANON_KEY };
        } catch {
            return { url: CONFIG.SUPABASE_URL, anonKey: CONFIG.SUPABASE_ANON_KEY };
        }
    }

    _toDbRecord(r) {
        // Embed visitDate safely into year string so it persists in Supabase without schema errors
        const visitDateStr = r.visitDate || r.visit_date || '';
        const rawYear = r.year || '';
        const combinedYear = visitDateStr ? `${rawYear}__VD__${visitDateStr}` : rawYear;

        return {
            id: r.id,
            name: r.name || '',
            email: r.email || '',
            phone: r.phone || '',
            college: r.college || '',
            year: combinedYear,
            referral_code: r.referralCode || r.referral_code || '',
            referred_by: r.referredBy || r.referred_by || '',
            coupon_used: r.couponUsed || r.coupon_used || '',
            base_price: Number(r.basePrice ?? r.base_price ?? CONFIG.BASE_PRICE),
            early_bird_discount: Number(r.earlyBirdDiscount ?? r.early_bird_discount ?? CONFIG.EARLY_BIRD_DISCOUNT),
            coupon_discount: Number(r.couponDiscount ?? r.coupon_discount ?? 0),
            final_price: Number(r.finalPrice ?? r.final_price ?? 0),
            transaction_id: r.transactionId || r.transaction_id || '',
            payment_screenshot: r.paymentScreenshot || r.payment_screenshot || '',
            verified: Boolean(r.verified),
            attended: Boolean(r.attended),
            attended_at: r.attendedAt || r.attended_at || null,
            timestamp: r.timestamp || new Date().toISOString()
        };
    }

    _fromDbRecord(row) {
        let yearVal = row.year || '';
        let visitDateVal = 'Both Days (08th & 09th Oct)';
        if (yearVal.includes('__VD__')) {
            const parts = yearVal.split('__VD__');
            yearVal = parts[0];
            visitDateVal = parts[1] || visitDateVal;
        } else if (yearVal.includes(' | ')) {
            const parts = yearVal.split(' | ');
            yearVal = parts[0];
            visitDateVal = parts[1] || visitDateVal;
        }
        if (row.visit_date) {
            visitDateVal = row.visit_date;
        }

        return {
            id: row.id,
            name: row.name || '',
            email: row.email || '',
            phone: row.phone || '',
            college: row.college || '',
            year: yearVal,
            visitDate: visitDateVal,
            referralCode: row.referral_code || row.referralCode || '',
            referredBy: row.referred_by || row.referredBy || '',
            couponUsed: row.coupon_used || row.couponUsed || '',
            basePrice: Number(row.base_price ?? row.basePrice ?? CONFIG.BASE_PRICE),
            earlyBirdDiscount: Number(row.early_bird_discount ?? row.earlyBirdDiscount ?? CONFIG.EARLY_BIRD_DISCOUNT),
            couponDiscount: Number(row.coupon_discount ?? row.couponDiscount ?? 0),
            finalPrice: Number(row.final_price ?? row.finalPrice ?? 0),
            transactionId: row.transaction_id || row.transactionId || '',
            paymentScreenshot: row.payment_screenshot || row.paymentScreenshot || '',
            verified: Boolean(row.verified),
            attended: Boolean(row.attended),
            attendedAt: row.attended_at || row.attendedAt || null,
            timestamp: row.timestamp || new Date().toISOString()
        };
    }

    async syncFromSupabase() {
        if (!this.supabaseClient) return;
        try {
            const { data, error } = await this.supabaseClient
                .from('registrations')
                .select('*')
                .order('timestamp', { ascending: false });

            if (error) {
                console.error('Supabase fetch error:', error.message);
                return;
            }
            if (data && Array.isArray(data)) {
                const cloudRegs = data.map(row => this._fromDbRecord(row));
                const cloudIds = new Set(cloudRegs.map(r => r.id));

                // Preserve & auto-sync any local registrations not yet in Cloud (and not deleted)
                const localRegs = this.getRegistrations();
                let deletedIds = new Set();
                try {
                    deletedIds = new Set(JSON.parse(localStorage.getItem('cc2026_deleted_ids') || '[]'));
                } catch (e) {}

                const now = Date.now();
                const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
                const pendingNewRegs = localRegs.filter(r => {
                    if (cloudIds.has(r.id)) return false;
                    if (deletedIds.has(r.id)) return false;
                    const age = now - new Date(r.timestamp || 0).getTime();
                    return age >= 0 && age < SEVEN_DAYS;
                });

                if (pendingNewRegs.length > 0) {
                    console.log(`⚡ Found ${pendingNewRegs.length} unsynced local registration(s), syncing to Supabase...`);
                    for (const pending of pendingNewRegs) {
                        cloudRegs.unshift(pending);
                        this.syncToSupabase(pending);
                    }
                }

                this.saveRegistrations(cloudRegs);
                console.log(`✓ Synced ${cloudRegs.length} authoritative records from Supabase Cloud`);

                if (typeof refreshAdminView === 'function') refreshAdminView();
                if (typeof renderNamesWall === 'function') renderNamesWall();
            }
        } catch (e) {
            console.warn('Supabase sync info:', e);
        }
    }

    async syncToSupabase(registration) {
        if (!this.supabaseClient) return { success: false, message: 'No Supabase client' };
        try {
            const dbPayload = this._toDbRecord(registration);
            const { error } = await this.supabaseClient.from('registrations').upsert(dbPayload);
            if (error) {
                console.error('Supabase upsert error:', error.message);
                return { success: false, message: error.message };
            } else {
                console.log('⚡ Record synced to Supabase successfully:', registration.id);
                return { success: true };
            }
        } catch (e) {
            console.error('Supabase push exception:', e);
            return { success: false, message: e.message };
        }
    }

    async syncLocalToSupabase() {
        if (!this.supabaseClient) return { success: false, message: 'Supabase client not connected' };
        const localRegs = this.getRegistrations();
        if (!localRegs.length) return { success: true, message: 'No local records to sync' };
        try {
            const payloads = localRegs.map(r => this._toDbRecord(r));
            const { error } = await this.supabaseClient.from('registrations').upsert(payloads);
            if (error) {
                console.warn('Sync local to Supabase warning:', error.message);
                return { success: false, message: error.message };
            }
            console.log(`⚡ Pushed ${payloads.length} local records to Supabase`);
            return { success: true, message: `Synced ${payloads.length} records to Supabase` };
        } catch (e) {
            console.warn('Sync local error:', e);
            return { success: false, message: e.message };
        }
    }

    // ──────────── COUPONS ────────────
    _initCoupons() {
        if (!localStorage.getItem(CONFIG.STORAGE_KEYS.COUPONS)) {
            localStorage.setItem(CONFIG.STORAGE_KEYS.COUPONS, JSON.stringify(DEFAULT_COUPONS));
        }
    }

    getCoupons() {
        try {
            return JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.COUPONS) || '[]');
        } catch {
            return [];
        }
    }

    saveCoupons(coupons) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.COUPONS, JSON.stringify(coupons));
    }

    addCoupon(code, discount, description = '') {
        const coupons = this.getCoupons();
        const normalized = code.trim().toUpperCase();
        if (!normalized) return { success: false, message: 'Code cannot be empty' };
        if (coupons.find(c => c.code === normalized)) {
            return { success: false, message: 'Coupon code already exists' };
        }
        coupons.push({
            code: normalized,
            discount: Math.max(1, Number(discount)),
            active: true,
            description: description || `₹${discount} off`
        });
        this.saveCoupons(coupons);
        return { success: true, message: 'Coupon added successfully' };
    }

    removeCoupon(code) {
        const coupons = this.getCoupons().filter(c => c.code !== code);
        this.saveCoupons(coupons);
    }

    toggleCoupon(code) {
        const coupons = this.getCoupons();
        const coupon = coupons.find(c => c.code === code);
        if (coupon) {
            coupon.active = !coupon.active;
            this.saveCoupons(coupons);
        }
    }

    validateCoupon(code) {
        if (!code) return { valid: false, discount: 0 };
        const normalized = code.trim().toUpperCase();
        const coupon = this.getCoupons().find(c => c.code === normalized && c.active);
        return coupon
            ? { valid: true, discount: coupon.discount, code: coupon.code }
            : { valid: false, discount: 0 };
    }

    // ──────────── REGISTRATIONS ────────────
    getRegistrations() {
        try {
            return JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.REGISTRATIONS) || '[]');
        } catch {
            return [];
        }
    }

    saveRegistrations(regs) {
        try {
            localStorage.setItem(CONFIG.STORAGE_KEYS.REGISTRATIONS, JSON.stringify(regs));
        } catch (e) {
            console.warn('LocalStorage save failed, trying without heavy screenshot payloads:', e);
            try {
                // If quota exceeded, strip long base64 screenshots locally to preserve metadata
                const lightweight = regs.map(r => ({
                    ...r,
                    paymentScreenshot: (r.paymentScreenshot && r.paymentScreenshot.length > 500) ? '' : r.paymentScreenshot
                }));
                localStorage.setItem(CONFIG.STORAGE_KEYS.REGISTRATIONS, JSON.stringify(lightweight));
            } catch (err2) {
                console.error('LocalStorage critical save error:', err2);
            }
        }
    }

    addRegistration(data) {
        const regs = this.getRegistrations();
        const registration = {
            id: this._generateId(),
            name: data.name.trim(),
            email: data.email.trim().toLowerCase(),
            phone: data.phone.trim(),
            college: data.college.trim(),
            year: data.year,
            visitDate: data.visitDate || 'Both Days (08th & 09th Oct)',
            referralCode: this._generateReferralCode(data.name),
            referredBy: data.referredBy || '',
            couponUsed: data.couponUsed || '',
            basePrice: CONFIG.BASE_PRICE,
            earlyBirdDiscount: CONFIG.EARLY_BIRD_DISCOUNT,
            couponDiscount: data.couponDiscount || 0,
            finalPrice: data.finalPrice,
            transactionId: '',
            paymentScreenshot: '',
            verified: false,
            attended: false,
            attendedAt: null,
            timestamp: new Date().toISOString()
        };
        regs.push(registration);
        this.saveRegistrations(regs);
        this.syncToSupabase(registration).then(() => {
            if (typeof refreshAdminView === 'function') refreshAdminView();
            if (typeof renderNamesWall === 'function') renderNamesWall();
        });
        return registration;
    }

    updateRegistration(id, updates) {
        const regs = this.getRegistrations();
        const idx = regs.findIndex(r => r.id === id);
        if (idx === -1) return null;
        regs[idx] = { ...regs[idx], ...updates };
        this.saveRegistrations(regs);
        this.syncToSupabase(regs[idx]).then(() => {
            if (typeof refreshAdminView === 'function') refreshAdminView();
            if (typeof renderNamesWall === 'function') renderNamesWall();
        });
        return regs[idx];
    }

    getRegistrationById(id) {
        if (!id) return null;
        const normalized = id.trim().toUpperCase();
        return this.getRegistrations().find(r => r.id.toUpperCase() === normalized) || null;
    }

    async toggleVerification(id) {
        const regs = this.getRegistrations();
        const reg = regs.find(r => r.id === id);
        if (!reg) return null;
        reg.verified = !reg.verified;
        this.saveRegistrations(regs);
        await this.syncToSupabase(reg);
        return reg;
    }

    async deleteRegistration(id) {
        // Track deleted ID so it is not auto-restored from stale devices
        try {
            const deleted = JSON.parse(localStorage.getItem('cc2026_deleted_ids') || '[]');
            if (!deleted.includes(id)) {
                deleted.push(id);
                localStorage.setItem('cc2026_deleted_ids', JSON.stringify(deleted.slice(-300)));
            }
        } catch (e) {}

        // 1. Remove from local array immediately
        const regs = this.getRegistrations().filter(r => r.id !== id);
        this.saveRegistrations(regs);

        // 2. Delete from Supabase cloud database
        if (this.supabaseClient) {
            try {
                const { error } = await this.supabaseClient
                    .from('registrations')
                    .delete()
                    .eq('id', id);

                if (error) {
                    console.error('Supabase delete error:', error.message);
                    return { success: false, message: error.message };
                }
                console.log('✓ Successfully deleted record from Supabase Cloud:', id);
                return { success: true };
            } catch (err) {
                console.error('Supabase delete exception:', err);
                return { success: false, message: err.message };
            }
        }
        return { success: true };
    }

    // ──────────── ATTENDANCE SYSTEM ────────────
    markAttendance(id) {
        if (!id) return { success: false, message: 'Invalid ticket / ID' };

        let regId = id.trim();
        try {
            const parsed = JSON.parse(id);
            if (parsed && parsed.id) regId = parsed.id;
        } catch {
            if (regId.includes('?')) {
                const urlParams = new URLSearchParams(regId.split('?')[1]);
                if (urlParams.get('id')) regId = urlParams.get('id');
            }
        }

        const regs = this.getRegistrations();
        const reg = regs.find(r => r.id.toUpperCase() === regId.toUpperCase());

        if (!reg) {
            return {
                success: false,
                status: 'not_found',
                message: `Ticket ID "${regId}" not found in database!`,
                scannedId: regId
            };
        }

        if (reg.attended) {
            return {
                success: false,
                status: 'already_attended',
                reg,
                message: `Already checked in on ${new Date(reg.attendedAt).toLocaleTimeString('en-IN')}`,
                attendedAt: reg.attendedAt
            };
        }

        // Mark attended
        reg.attended = true;
        reg.attendedAt = new Date().toISOString();
        if (!reg.verified) {
            reg.verified = true;
        }

        this.saveRegistrations(regs);
        this.syncToSupabase(reg);

        return {
            success: true,
            status: 'success',
            reg,
            message: `Attendance marked for ${reg.name}! Welcome to Celebrate Cinema 2026!`
        };
    }

    async toggleAttendance(id) {
        const regs = this.getRegistrations();
        const reg = regs.find(r => r.id === id);
        if (!reg) return null;
        reg.attended = !reg.attended;
        reg.attendedAt = reg.attended ? new Date().toISOString() : null;
        this.saveRegistrations(regs);
        await this.syncToSupabase(reg);
        return reg;
    }

    getRecentCheckins(limit = 10) {
        const regs = this.getRegistrations().filter(r => r.attended && r.attendedAt);
        return regs
            .sort((a, b) => new Date(b.attendedAt) - new Date(a.attendedAt))
            .slice(0, limit);
    }

    // ──────────── REFERRALS & PROMOTERS ────────────
    getPromoters() {
        const defaultPromoters = [
            { name: 'Nilesh', code: 'NILESH' },
            { name: 'Sahil', code: 'SAHIL' },
            { name: 'Golu', code: 'GOLU' },
            { name: 'Satvik', code: 'SATVIK' },
            { name: 'Tarasha', code: 'TARASHA' },
            { name: 'Muwaaz', code: 'MUWAAZ' },
            { name: 'Rahul', code: 'RAHUL' }
        ];
        const stored = localStorage.getItem('wwi_cc26_promoters');
        if (!stored) {
            localStorage.setItem('wwi_cc26_promoters', JSON.stringify(defaultPromoters));
            return defaultPromoters;
        }
        try {
            const list = JSON.parse(stored);
            defaultPromoters.forEach(def => {
                if (!list.some(p => p.code.toUpperCase() === def.code)) {
                    list.push(def);
                }
            });
            return list;
        } catch (e) {
            return defaultPromoters;
        }
    }

    addPromoter(name, code) {
        if (!name || !code) return { success: false, message: 'Name and Code are required' };
        const cleanCode = code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
        const cleanName = name.trim();
        const promoters = this.getPromoters();
        if (promoters.some(p => p.code.toUpperCase() === cleanCode)) {
            return { success: false, message: `Promoter code "${cleanCode}" already exists` };
        }
        promoters.push({ name: cleanName, code: cleanCode, createdAt: new Date().toISOString() });
        localStorage.setItem('wwi_cc26_promoters', JSON.stringify(promoters));
        return { success: true, message: `Promoter link created for ${cleanName}!`, code: cleanCode };
    }

    getReferralCount(referralCode) {
        if (!referralCode) return 0;
        const target = referralCode.trim().toUpperCase();
        return this.getRegistrations().filter(r => (r.referredBy || '').trim().toUpperCase() === target).length;
    }

    getTopReferrers(limit = 15) {
        const regs = this.getRegistrations();
        const counts = {};
        regs.forEach(r => {
            if (r.referredBy) {
                const code = r.referredBy.trim().toUpperCase();
                counts[code] = (counts[code] || 0) + 1;
            }
        });

        const promoters = this.getPromoters();
        const promoterMap = {};
        promoters.forEach(p => {
            promoterMap[p.code.toUpperCase()] = p.name;
        });

        return Object.entries(counts)
            .map(([code, count]) => {
                const referrer = regs.find(r => (r.referralCode || '').toUpperCase() === code);
                const promoterName = promoterMap[code];
                const displayName = promoterName 
                    ? `${promoterName} (Promoter)` 
                    : (referrer ? referrer.name : code);
                return { code, count, name: displayName };
            })
            .sort((a, b) => b.count - a.count)
            .slice(0, limit);
    }

    // ──────────── STATS ────────────
    getStats() {
        const regs = this.getRegistrations();
        const verified = regs.filter(r => r.verified);
        const attended = regs.filter(r => r.attended);
        // Total revenue = sum of ALL registrations' finalPrice (verified + pending payments received)
        const totalRevenue = regs.reduce((s, r) => s + (r.finalPrice || 0), 0);
        const verifiedRevenue = verified.reduce((s, r) => s + (r.finalPrice || 0), 0);
        const couponUsage = {};
        regs.forEach(r => {
            if (r.couponUsed) couponUsage[r.couponUsed] = (couponUsage[r.couponUsed] || 0) + 1;
        });
        return {
            total: regs.length,
            verified: verified.length,
            pending: regs.length - verified.length,
            attended: attended.length,
            totalRevenue,
            verifiedRevenue,
            avgPrice: regs.length ? Math.round(totalRevenue / regs.length) : 0,
            couponUsage,
            topReferrers: this.getTopReferrers()
        };
    }

    // ──────────── PRICING CALCULATOR ────────────
    calculatePrice(couponCode = '') {
        const basePrice = CONFIG.BASE_PRICE;
        const earlyBird = CONFIG.EARLY_BIRD_DISCOUNT;
        let couponDiscount = 0;
        let couponValid = false;

        if (couponCode) {
            const v = this.validateCoupon(couponCode);
            if (v.valid) { couponDiscount = v.discount; couponValid = true; }
        }

        const subtotal = basePrice - earlyBird;
        const finalPrice = Math.max(CONFIG.MIN_PRICE, subtotal - couponDiscount);

        return { basePrice, earlyBird, subtotal, couponDiscount: couponValid ? couponDiscount : 0, couponValid, finalPrice };
    }

    // ──────────── ADMIN AUTH ────────────
    adminLogin(password) {
        if (password === CONFIG.ADMIN_PASSWORD) {
            sessionStorage.setItem(CONFIG.STORAGE_KEYS.ADMIN_AUTH, 'authenticated');
            return true;
        }
        return false;
    }

    isAdminAuthenticated() {
        return sessionStorage.getItem(CONFIG.STORAGE_KEYS.ADMIN_AUTH) === 'authenticated';
    }

    adminLogout() {
        sessionStorage.removeItem(CONFIG.STORAGE_KEYS.ADMIN_AUTH);
    }

    // ──────────── CSV EXPORT ────────────
    exportToCSV() {
        const regs = this.getRegistrations();
        if (!regs.length) return '';
        const headers = [
            'ID', 'Name', 'Email', 'Phone', 'College', 'Year', 'Visiting Dates',
            'Base Price', 'Early Bird', 'Coupon', 'Coupon Discount',
            'Final Price', 'Transaction ID', 'Referred By',
            'Referral Code', 'Verified', 'Attended', 'Check-in Time', 'Date'
        ];
        const escape = v => `"${String(v).replace(/"/g, '""')}"`;
        const rows = regs.map(r => [
            r.id, escape(r.name), escape(r.email), escape(r.phone),
            escape(r.college), r.year, escape(r.visitDate || 'Both Days (08th & 09th Oct)'),
            r.basePrice, r.earlyBirdDiscount,
            r.couponUsed || '—', r.couponDiscount || 0, r.finalPrice,
            r.transactionId || '—', r.referredBy || '—', r.referralCode,
            r.verified ? 'Yes' : 'No',
            r.attended ? 'Yes' : 'No',
            r.attendedAt ? new Date(r.attendedAt).toLocaleString('en-IN') : '—',
            new Date(r.timestamp).toLocaleString('en-IN')
        ]);
        return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    }

    // ──────────── HELPERS ────────────
    _generateId() {
        return 'CC' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 5).toUpperCase();
    }

    _generateReferralCode(name) {
        const prefix = name.replace(/[^a-zA-Z]/g, '').substring(0, 4).toUpperCase() || 'REF';
        const suffix = Math.floor(1000 + Math.random() * 9000);
        return prefix + suffix;
    }
}

// Global singleton
const dataStore = new DataStore();
