/**
 * CELEBRATE CINEMA 2026 — BULK DISPATCHER FOR HSNC-COLLAB DELEGATES
 * 
 * Dispatches personalized confirmation emails with attached PDF Boarding Pass tickets
 * to all delegates imported from the HSNC sheet.
 * - Uses mail_builder_hsnc.js
 * - NO personal phone numbers
 * - NO WhatsApp group link (per instruction)
 * - Highlights the 4 mandatory entry guidelines (ID Proof, no prohibited items, HSNC-COLLAB band, companions)
 * - Automatic resume via sent_emails_log.json & hsnc_sent_tickets_log.json
 * 
 * Usage:
 *   node send_hsnc_bulk_tickets.js --dry
 *   node send_hsnc_bulk_tickets.js --test=yourname@gmail.com
 *   node send_hsnc_bulk_tickets.js --send
 */

const fs = require('fs');
const path = require('path');
const { Resend } = require('resend');
const { buildHsncConfirmationEmail } = require('./mail_builder_hsnc');

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

const GENERAL_LOG_FILE = path.join(__dirname, 'sent_emails_log.json');
const HSNC_LOG_FILE = path.join(__dirname, 'hsnc_sent_tickets_log.json');

// CLI Arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry');
const isRealSend = args.includes('--send');
const testArg = args.find(a => a.startsWith('--test='));
const testEmail = testArg ? testArg.split('=')[1].trim() : null;
const limitArg = args.find(a => a.startsWith('--limit='));
const sendLimit = limitArg ? parseInt(limitArg.split('=')[1], 10) : Infinity;

const sleep = ms => new Promise(res => setTimeout(res, ms));

function loadLog(filePath) {
    if (fs.existsSync(filePath)) {
        try {
            return JSON.parse(fs.readFileSync(filePath, 'utf8'));
        } catch(e) {}
    }
    return { sent: {}, totalSent: 0, lastUpdated: null };
}

function saveLog(filePath, log) {
    log.lastUpdated = new Date().toISOString();
    fs.writeFileSync(filePath, JSON.stringify(log, null, 2));
}

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

(async () => {
    console.log('\n========================================================================');
    console.log('   CELEBRATE CINEMA 2026 — HSNC-COLLAB BULK TICKET EMAIL SENDER         ');
    console.log('========================================================================\n');

    if (!RESEND_API_KEY && !isDryRun) {
        console.error('❌ ERROR: RESEND_API_KEY is not configured in .env!');
        process.exit(1);
    }

    const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;
    const generalLog = loadLog(GENERAL_LOG_FILE);
    const hsncLog = loadLog(HSNC_LOG_FILE);

    // Load HSNC records: from backup JSON if exists, else fetch from Supabase
    let hsncRecords = [];
    const backupPath = path.join(__dirname, 'hsnc_imported_registrations.json');
    if (fs.existsSync(backupPath)) {
        console.log(`Loading records from local backup: ${backupPath}`);
        hsncRecords = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    } else {
        console.log('Fetching HSNC-COLLAB records from Supabase...');
        const SYNC_COLUMNS = 'id,name,email,phone,college,year,referral_code,referred_by,coupon_used,base_price,coupon_discount,final_price,transaction_id,verified,timestamp';
        const url = `${SUPABASE_URL}/rest/v1/registrations?referred_by=eq.HSNC-COLLAB&select=${SYNC_COLUMNS}&order=id.asc`;
        const res = await fetch(url, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } });
        hsncRecords = await res.json();
    }

    console.log(`✓ Loaded ${hsncRecords.length} HSNC-COLLAB records.`);

    // Deduplicate by clean email
    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
    const uniqueMap = new Map();
    for (const r of hsncRecords) {
        const em = cleanEmail(r.email);
        r.email = em;
        if (!em || !EMAIL_REGEX.test(em)) continue;
        if (!uniqueMap.has(em)) {
            uniqueMap.set(em, r);
        }
    }

    console.log(`✓ Found ${uniqueMap.size} unique valid emails in HSNC dataset.`);

    // Test mode
    if (testEmail) {
        console.log(`\n🧪 TEST MODE: Sending 1 preview email to ${testEmail}`);
        const sampleReg = Array.from(uniqueMap.values())[0];
        const testReg = { ...sampleReg, email: testEmail, name: `Preview (${sampleReg.name})` };
        console.log(`Generating email for Ticket [${testReg.id}] (${testReg.name})...`);

        const mailData = await buildHsncConfirmationEmail(testReg);
        console.log(`Subject: ${mailData.subject}`);
        console.log(`Attachment: ${mailData.attachments[0].filename} (${mailData.attachments[0].content.length} bytes base64)`);

        const sendRes = await resend.emails.send({
            from: FROM_EMAIL,
            to: [testEmail],
            subject: mailData.subject,
            html: mailData.html,
            text: mailData.text,
            attachments: mailData.attachments
        });

        if (sendRes.error) {
            console.error('❌ Test email failed:', sendRes.error);
        } else {
            console.log(`✓ Test email delivered! Resend ID: ${sendRes.data?.id}`);
        }
        return;
    }

    // Determine pending
    const targets = Array.from(uniqueMap.values()).filter(r => {
        const em = r.email.toLowerCase().trim();
        // Skip if already in hsncLog
        return !hsncLog.sent || !hsncLog.sent[em];
    }).slice(0, sendLimit);

    console.log(`Delegates pending ticket email in this run: ${targets.length}`);
    console.log(`Already delivered in previous runs: ${Object.keys(hsncLog.sent || {}).length}`);

    if (isDryRun || !isRealSend) {
        console.log('\n======================================================');
        console.log('🔍 PREVIEW / DRY RUN MODE');
        console.log(`Would dispatch emails to ${targets.length} HSNC delegates.`);
        console.log('Sample first 5 targets:');
        targets.slice(0, 5).forEach((t, i) => {
            console.log(`  ${i + 1}. [${t.id}] ${t.name} <${t.email}> (${t.college})`);
        });
        console.log('\nTo execute live send, run:');
        console.log('  node send_hsnc_bulk_tickets.js --send');
        console.log('======================================================\n');
        return;
    }

    // Live Execution
    console.log('\n======================================================');
    console.log(`🚀 STARTING LIVE DISPATCH TO ${targets.length} DELEGATES...`);
    console.log('======================================================\n');

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < targets.length; i++) {
        const reg = targets[i];
        const email = reg.email.toLowerCase().trim();
        const num = i + 1;

        process.stdout.write(`[${num}/${targets.length}] Sending to ${email} (${reg.id} - ${reg.name})... `);

        let sendRes = null;
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                const mailData = await buildHsncConfirmationEmail(reg);
                sendRes = await resend.emails.send({
                    from: FROM_EMAIL,
                    to: [email],
                    subject: mailData.subject,
                    html: mailData.html,
                    text: mailData.text,
                    attachments: mailData.attachments
                });

                if (sendRes && sendRes.error && (sendRes.error.name === 'rate_limit_exceeded' || sendRes.error.statusCode === 429)) {
                    console.warn(`[Rate limit hit] Pausing 2.5s before retry (attempt ${attempt}/3)...`);
                    await sleep(2500);
                    continue;
                }
                break;
            } catch(netErr) {
                if (attempt < 3) {
                    await sleep(1500);
                    continue;
                }
                sendRes = { error: { message: netErr.message } };
            }
        }

        if (sendRes && !sendRes.error) {
            const resendId = sendRes.data?.id;
            console.log(`✓ OK (ID: ${resendId})`);

            // Save in hsncLog
            if (!hsncLog.sent) hsncLog.sent = {};
            hsncLog.sent[email] = {
                ticketId: reg.id,
                name: reg.name,
                resendId: resendId,
                sentAt: new Date().toISOString()
            };
            hsncLog.totalSent = Object.keys(hsncLog.sent).length;
            saveLog(HSNC_LOG_FILE, hsncLog);

            // Also record in generalLog so other queues know ticket was sent
            if (!generalLog.sent) generalLog.sent = {};
            generalLog.sent[email] = {
                ticketId: reg.id,
                name: reg.name,
                resendId: resendId,
                sentAt: new Date().toISOString()
            };
            generalLog.totalSent = Object.keys(generalLog.sent).length;
            saveLog(GENERAL_LOG_FILE, generalLog);

            successCount++;
        } else {
            console.log(`FAILED: ${JSON.stringify(sendRes?.error)}`);
            failCount++;
        }

        await sleep(350);
    }

    console.log('\n======================================================');
    console.log(`✓ HSNC-COLLAB DISPATCH FINISHED!`);
    console.log(`- Successfully sent: ${successCount}`);
    console.log(`- Failures: ${failCount}`);
    console.log(`- Total logged in hsnc_sent_tickets_log.json: ${hsncLog.totalSent}`);
    console.log('======================================================\n');

})().catch(e => {
    console.error('Fatal execution error:', e);
    process.exit(1);
});
