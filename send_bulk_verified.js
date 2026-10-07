/**
 * CELEBRATE CINEMA 2026 — BULK VERIFIED EMAIL SENDER
 * Sends official confirmation email + PDF Boarding Pass attachment via Resend.
 *
 * Usage:
 *   node send_bulk_verified.js --dry
 *   node send_bulk_verified.js --test=yourname@gmail.com
 *   node send_bulk_verified.js --limit=50
 *   node send_bulk_verified.js
 *
 * Environment variables:
 *   RESEND_API_KEY (or pass --key=re_xxxx)
 *   RESEND_FROM_EMAIL (default: Celebrate Cinema <confirmations@careerbeam.in>)
 */

const fs = require('fs');
const path = require('path');
const { Resend } = require('resend');
const { buildConfirmationEmail } = require('./mail_builder');

// Load .env if present
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

// CLI Arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry');
const testArg = args.find(a => a.startsWith('--test='));
const testEmail = testArg ? testArg.split('=')[1].trim() : null;
const limitArg = args.find(a => a.startsWith('--limit='));
const sendLimit = limitArg ? parseInt(limitArg.split('=')[1], 10) : Infinity;
const keyArg = args.find(a => a.startsWith('--key='));
const apiKey = (keyArg ? keyArg.split('=')[1] : null) || process.env.RESEND_API_KEY;

const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJueWxweGZqaHhwbWp3b2xzcWNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwOTgwMDEsImV4cCI6MjEwMzY3NDAwMX0.ms0YzXZ2Lb-VFpqEjD9BrAYzDp81ZklQwCwNnkyP6U8';
const SUPABASE_URL = 'https://rnylpxfjhxpmjwolsqcd.supabase.co';
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Celebrate Cinema <confirmations@careerbeam.in>';

const LOG_FILE = path.join(__dirname, 'sent_emails_log.json');

// Helper to delay
const sleep = ms => new Promise(res => setTimeout(res, ms));

// Load sent log
function loadSentLog() {
    if (fs.existsSync(LOG_FILE)) {
        try {
            return JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
        } catch(e) {
            console.warn('Could not parse sent log, starting fresh.');
        }
    }
    return { sent: {}, totalSent: 0, lastUpdated: null };
}

function saveSentLog(log) {
    log.lastUpdated = new Date().toISOString();
    fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2));
}

async function fetchAllVerified() {
    const list = [];
    console.log('Fetching verified registrations from Supabase...');
    for (let off = 0; ; off += 1000) {
        const url = `${SUPABASE_URL}/rest/v1/registrations?select=id,name,email,phone,college,year,timestamp,verified,transaction_id&verified=eq.true&order=timestamp.asc&limit=1000&offset=${off}`;
        const res = await fetch(url, {
            headers: {
                apikey: SUPABASE_KEY,
                Authorization: `Bearer ${SUPABASE_KEY}`
            }
        });
        if (!res.ok) throw new Error(`Supabase query error (${res.status}): ${await res.text()}`);
        const batch = await res.json();
        list.push(...batch);
        if (batch.length < 1000) break;
    }
    return list;
}

(async () => {
    console.log('\n======================================================');
    console.log('   CELEBRATE CINEMA 2026 — OFFICIAL EMAIL SENDER     ');
    console.log('   Domain: careerbeam.in | Powered by Resend         ');
    console.log('======================================================\n');

    if (!isDryRun && !apiKey) {
        console.error('❌ ERROR: RESEND_API_KEY is not set!');
        console.error('Please provide your Resend API Key:');
        console.error('  1. Add it to a .env file: RESEND_API_KEY=re_xxxxxxxx');
        console.error('  2. Or pass it as a flag: node send_bulk_verified.js --key=re_xxxxxxxx');
        console.error('  3. Or run with --dry to preview targets and test PDF generation.\n');
        process.exit(1);
    }

    const resend = apiKey ? new Resend(apiKey) : null;
    const sentLog = loadSentLog();

    // 1. Fetch verified registrations
    const rawList = await fetchAllVerified();
    console.log(`✓ Fetched ${rawList.length} verified registration records.`);

    // 2. Filter out invalid/empty emails and deduplicate
    const emailToReg = new Map();
    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
    for (const r of rawList) {
        const em = String(r.email || '').trim().toLowerCase();
        // Skip obvious broken emails
        if (!em || !EMAIL_REGEX.test(em) || em.endsWith('.comt') || em.includes('.@') || em.includes('@.')) continue;
        if (!emailToReg.has(em)) {
            emailToReg.set(em, r);
        }
    }

    const uniqueRegistrations = Array.from(emailToReg.values());
    console.log(`✓ Deduplicated to ${uniqueRegistrations.length} unique recipient emails.`);

    // If Test mode
    if (testEmail) {
        console.log(`\n🧪 TEST MODE ACTIVATED`);
        console.log(`Sending sample confirmation + PDF ticket to: ${testEmail}`);
        const sampleReg = uniqueRegistrations[0] || {
            id: 'TEST-2026',
            name: 'Test Delegate',
            email: testEmail,
            college: 'Whistling Woods International',
            year: '3rd Year (Direction & Filmmaking)',
            visitDate: 'Both Days (08th & 09th Oct 2026)'
        };
        sampleReg.email = testEmail;

        const mailData = await buildConfirmationEmail(sampleReg);
        console.log(`Generated sample PDF attachment (${mailData.attachments[0].content.length} bytes).`);

        if (isDryRun) {
            console.log('DRY RUN: Email prepared, but not dispatched.');
            return;
        }

        const resp = await resend.emails.send({
            from: FROM_EMAIL,
            to: [testEmail],
            subject: mailData.subject,
            html: mailData.html,
            text: mailData.text,
            attachments: mailData.attachments
        });

        if (resp.error) {
            console.error('❌ Test email failed:', resp.error);
        } else {
            console.log(`✓ Test email delivered successfully! Resend Message ID: ${resp.data?.id}`);
        }
        return;
    }

    // 3. Filter out already sent
    const pendingList = uniqueRegistrations.filter(r => {
        const em = r.email.trim().toLowerCase();
        return !sentLog.sent[em];
    });

    const alreadySentCount = uniqueRegistrations.length - pendingList.length;
    console.log(`✓ Already sent: ${alreadySentCount}`);
    console.log(`✓ Pending to send: ${pendingList.length}`);

    const targets = pendingList.slice(0, sendLimit);
    if (targets.length < pendingList.length) {
        console.log(`Notice: Limiting execution to first ${targets.length} recipients (--limit flag).`);
    }

    if (isDryRun) {
        console.log('\n[DRY RUN SUMMARY]');
        console.log(`- From: ${FROM_EMAIL}`);
        console.log(`- Targets to be emailed: ${targets.length}`);
        if (targets.length > 0) {
            console.log('Sample 3 recipients:');
            targets.slice(0, 3).forEach((r, idx) => {
                console.log(`  ${idx + 1}. ${r.name} <${r.email}> [${r.id}] - ${r.college}`);
            });
            console.log('Testing PDF builder for first target...');
            const sampleMail = await buildConfirmationEmail(targets[0]);
            console.log(`✓ Sample PDF size: ${(sampleMail.attachments[0].content.length / 1024).toFixed(1)} KB`);
        }
        console.log('Dry run complete. Remove --dry flag when ready to send.');
        return;
    }

    // 4. Send in controlled batches
    console.log(`\n🚀 Starting dispatch of ${targets.length} emails from: ${FROM_EMAIL}...`);
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < targets.length; i++) {
        const reg = targets[i];
        const email = reg.email.trim().toLowerCase();
        const num = i + 1;

        try {
            const mailData = await buildConfirmationEmail(reg);

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
                } catch(netErr) {
                    if (attempts < 3) {
                        console.warn(`[Network retry ${attempts}/3] for ${email}: ${netErr.message}`);
                        await sleep(1500);
                        continue;
                    }
                    throw netErr;
                }

                if (sendRes && sendRes.error && (sendRes.error.name === 'rate_limit_exceeded' || sendRes.error.statusCode === 429)) {
                    console.warn(`[Rate limit hit] Pausing 2.5s before retry (attempt ${attempts}/3)...`);
                    await sleep(2500);
                    continue;
                }
                break;
            }

            if (!sendRes || sendRes.error) {
                console.error(`[${num}/${targets.length}] ❌ Failed to ${email}:`, sendRes?.error?.message || sendRes?.error);
                failCount++;
            } else {
                successCount++;
                sentLog.sent[email] = {
                    ticketId: reg.id,
                    name: reg.name,
                    resendId: sendRes.data?.id,
                    sentAt: new Date().toISOString()
                };
                sentLog.totalSent = Object.keys(sentLog.sent).length;
                saveSentLog(sentLog);

                console.log(`[${num}/${targets.length}] ✓ Sent to ${email} (${reg.id} - ${reg.name})`);
            }
        } catch(err) {
            console.error(`[${num}/${targets.length}] ❌ Exception sending to ${email}:`, err.message);
            failCount++;
        }

        // Resend rate limit safety (350ms ≈ ~2.8 emails/sec)
        await sleep(350);
    }

    console.log('\n======================================================');
    console.log(`✓ DISPATCH FINISHED`);
    console.log(`- Successfully sent: ${successCount}`);
    console.log(`- Failures: ${failCount}`);
    console.log(`- Total logged in sent_emails_log.json: ${sentLog.totalSent}`);
    console.log('======================================================\n');

})().catch(e => {
    console.error('Fatal execution error:', e);
    process.exit(1);
});
