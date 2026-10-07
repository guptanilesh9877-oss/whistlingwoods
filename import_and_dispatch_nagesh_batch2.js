/**
 * CELEBRATE CINEMA 2026 — IMPORT & DISPATCH NEW NAGESH BATCH (37 DELEGATES)
 * 
 * - Ingests 37 delegates under Nagesh's list (referred_by: 'Nagesh', coupon: 'FREE-NAGESH')
 * - Generates unique NAG-XXXXXX ticket IDs
 * - Sends official confirmation email in Nagesh format (FPHR counter band, guidelines, shuttle bus)
 * - Excludes WhatsApp group links (per instructions: "no group link")
 * - Sends preview to Nilesh & Nagesh
 * - Dispatches to all 37 delegates and logs to nagesh_batch2_sent_log.json
 */

const fs = require('fs');
const path = require('path');
const { Resend } = require('resend');
const { rawTsv } = require('./nagesh_new_batch_raw');
const { buildNageshConfirmationEmail } = require('./mail_builder_nagesh');

// Load .env
try {
    const envPath = path.join(__dirname, '.env');
    if (fs.existsSync(envPath)) {
        fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
            const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
            if (m && !process.env[m[1]]) {
                let v = m[2] || '';
                if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
                if (v.startsWith("'") && v.endsWith("'")) v = v.slice(1, -1);
                process.env[m[1]] = v.trim();
            }
        });
    }
} catch(e) {}

const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJueWxweGZqaHhwbWp3b2xzcWNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwOTgwMDEsImV4cCI6MjEwMzY3NDAwMX0.ms0YzXZ2Lb-VFpqEjD9BrAYzDp81ZklQwCwNnkyP6U8';
const SUPABASE_URL = 'https://rnylpxfjhxpmjwolsqcd.supabase.co';
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Celebrate Cinema <confirmations@careerbeam.in>';

const LOG_FILE = path.join(__dirname, 'nagesh_batch2_sent_log.json');
const GENERAL_LOG_FILE = path.join(__dirname, 'sent_emails_log.json');

const sleep = ms => new Promise(res => setTimeout(res, ms));

function cleanEmail(em) {
    let email = String(em || '').trim().toLowerCase();
    email = email.replace(/@gamil\.com$/, '@gmail.com');
    email = email.replace(/@g-mail\.com$/, '@gmail.com');
    email = email.replace(/@gnail\.com$/, '@gmail.com');
    email = email.replace(/@gamail\.com$/, '@gmail.com');
    email = email.replace(/@gmail\.co$/, '@gmail.com');
    email = email.replace(/\.comp$/, '.com');
    return email;
}

function cleanPhone(p) {
    const digits = String(p || '').replace(/\D/g, '');
    return digits.length >= 10 ? digits.slice(-10) : digits;
}

function parseVisitDate(raw) {
    const s = String(raw || '').toLowerCase();
    if (s.includes('second')) return '09th October 2026 (Day 2)';
    if (s.includes('first')) return '08th October 2026 (Day 1)';
    return 'Both Days (08th & 09th Oct)';
}

function loadLog(file) {
    if (fs.existsSync(file)) {
        try {
            return JSON.parse(fs.readFileSync(file, 'utf8'));
        } catch(e) {}
    }
    return { sent: {}, failed: {}, totalSent: 0, lastUpdated: null };
}

function saveLog(file, log) {
    log.lastUpdated = new Date().toISOString();
    log.totalSent = Object.keys(log.sent || {}).length;
    fs.writeFileSync(file, JSON.stringify(log, null, 2));
}

async function main() {
    console.log('\n======================================================');
    console.log('   NAGESH BATCH 2 — IMPORT & CONFIRMATION DISPATCH    ');
    console.log('======================================================\n');

    if (!RESEND_API_KEY) {
        console.error('❌ ERROR: RESEND_API_KEY is not set!');
        process.exit(1);
    }

    const resend = new Resend(RESEND_API_KEY);

    // 1. Fetch existing NAG-* IDs to prevent collisions
    console.log('Fetching existing NAG-* IDs from Supabase...');
    const existingIds = new Set();
    const idRes = await fetch(`${SUPABASE_URL}/rest/v1/registrations?id=like.NAG-*&select=id`, {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    });
    if (idRes.ok) {
        const idData = await idRes.json();
        idData.forEach(d => existingIds.add(d.id));
        console.log(`Found ${existingIds.size} existing NAG-* IDs.`);
    }

    // 2. Parse TSV rows
    const lines = rawTsv.trim().split('\n');
    const rows = lines.slice(1);
    const records = [];

    rows.forEach((line) => {
        const cols = line.split('\t').map(c => c.trim());
        if (cols.length < 9) return;

        const [timestamp, emailRaw, name, age, gender, visitDateRaw, location, phoneRaw, college] = cols;
        const email = cleanEmail(emailRaw);
        const phone = cleanPhone(phoneRaw);
        const visitDate = parseVisitDate(visitDateRaw);

        let ticketId;
        do {
            const num = Math.floor(100000 + Math.random() * 900000);
            ticketId = `NAG-${num}`;
        } while (existingIds.has(ticketId));
        existingIds.add(ticketId);

        const refPrefix = name.replace(/[^a-zA-Z]/g, '').substring(0, 4).toUpperCase() || 'NAG';
        const referralCode = refPrefix + Math.floor(1000 + Math.random() * 9000);
        const yearWithVd = `Age ${age || 'N/A'}__VD__${visitDate}`;

        records.push({
            id: ticketId,
            name: name,
            email: email,
            phone: phone,
            college: college || 'Partner College Delegation',
            year: yearWithVd,
            referral_code: referralCode,
            referred_by: 'Nagesh',
            coupon_used: 'FREE-NAGESH',
            base_price: 0,
            early_bird_discount: 0,
            coupon_discount: 0,
            final_price: 0,
            transaction_id: 'FREE-NAGESH',
            payment_screenshot: '',
            verified: true,
            attended: false,
            attended_at: null,
            timestamp: new Date().toISOString()
        });
    });

    console.log(`✓ Prepared ${records.length} records with NAG-XXXXXX IDs.`);

    // Save local backup
    const backupPath = path.join(__dirname, 'nagesh_batch2_imported.json');
    fs.writeFileSync(backupPath, JSON.stringify(records, null, 2));
    console.log(`✓ Saved backup to: ${backupPath}`);

    // 3. Ingest into Supabase
    console.log('\nInserting records into Supabase...');
    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/registrations`, {
        method: 'POST',
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify(records)
    });

    if (!insertRes.ok) {
        console.error('❌ Supabase insert failed:', insertRes.status, await insertRes.text());
        process.exit(1);
    }
    console.log(`✓ All ${records.length} records successfully synced to Supabase!`);

    // 4. Send preview emails to Nilesh & Nagesh
    console.log('\n--- Sending preview emails to Nilesh & Nagesh ---');
    const previewRecipients = [
        { name: 'Nilesh Gupta', email: 'nilesh@vigorlaunchpad.com' },
        { name: 'Nagesh Kumar', email: 'nageshkumsr@vigorlaunchpad.com' },
        { name: 'Nagesh Kumar', email: 'nageshkumar@vigorlaunchpad.com' }
    ];

    const sampleDelegate = records[0];
    for (const admin of previewRecipients) {
        try {
            const previewDelegate = {
                ...sampleDelegate,
                email: admin.email,
                name: `${admin.name} (Preview for ${sampleDelegate.name})`
            };
            const mailData = await buildNageshConfirmationEmail(previewDelegate, { includeWhatsApp: false });

            const sendRes = await resend.emails.send({
                from: FROM_EMAIL,
                to: [admin.email],
                subject: `[PREVIEW] ${mailData.subject}`,
                html: mailData.html,
                text: mailData.text,
                attachments: mailData.attachments
            });

            console.log(`✓ Preview sent to ${admin.email} (ID: ${sendRes.data ? sendRes.data.id : 'OK'})`);
        } catch (err) {
            console.warn(`⚠ Preview to ${admin.email} warning: ${err.message}`);
        }
        await sleep(500);
    }

    // 5. Dispatch confirmation emails to all 37 delegates
    console.log(`\n🚀 Starting dispatch to all ${records.length} delegates...`);
    const batchLog = loadLog(LOG_FILE);
    const generalLog = loadLog(GENERAL_LOG_FILE);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < records.length; i++) {
        const reg = records[i];
        const email = reg.email;
        const num = i + 1;

        console.log(`[${num}/${records.length}] Sending to ${email} (${reg.id} - ${reg.name})...`);

        try {
            const mailData = await buildNageshConfirmationEmail(reg, { includeWhatsApp: false });

            let sendRes = null;
            let attempts = 0;
            while (attempts < 3) {
                attempts++;
                try {
                    sendRes = await resend.emails.send({
                        from: FROM_EMAIL,
                        to: [email],
                        subject: mailData.subject,
                        html: mailData.html,
                        text: mailData.text,
                        attachments: mailData.attachments
                    });
                    break;
                } catch(netErr) {
                    if (attempts < 3) {
                        console.warn(`  Retry ${attempts}/3 for ${email}: ${netErr.message}`);
                        await sleep(1500);
                        continue;
                    }
                    throw netErr;
                }
            }

            if (sendRes && sendRes.error) {
                throw new Error(sendRes.error.message);
            }

            const resendId = sendRes && sendRes.data ? sendRes.data.id : 'UNKNOWN_ID';
            console.log(`  ✓ OK (ID: ${resendId})`);

            batchLog.sent[email] = {
                ticketId: reg.id,
                name: reg.name,
                resendId: resendId,
                sentAt: new Date().toISOString()
            };

            generalLog.sent[email] = {
                ticketId: reg.id,
                name: reg.name,
                resendId: resendId,
                sentAt: new Date().toISOString(),
                batch: 'nagesh_batch_2'
            };

            successCount++;
        } catch (err) {
            console.error(`  ❌ FAILED for ${email}: ${err.message}`);
            batchLog.failed[email] = {
                ticketId: reg.id,
                name: reg.name,
                error: err.message,
                failedAt: new Date().toISOString()
            };
            failCount++;
        }

        saveLog(LOG_FILE, batchLog);
        saveLog(GENERAL_LOG_FILE, generalLog);
        await sleep(350);
    }

    console.log('\n======================================================');
    console.log('✓ NAGESH BATCH 2 DISPATCH COMPLETE!');
    console.log(`- Successfully sent: ${successCount}`);
    console.log(`- Failed: ${failCount}`);
    console.log(`- Total logged in: ${LOG_FILE}`);
    console.log('======================================================\n');
}

main().catch(console.error);
