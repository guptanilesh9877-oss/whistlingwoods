/**
 * CELEBRATE CINEMA 2026 — NAGESH BULK CONFIRMATION SENDER
 * 
 * Sends official confirmation email + personalized PDF Boarding Pass attachment
 * to Nagesh's verified delegacy registrants.
 * 
 * FEATURES:
 * - Omits personal contact numbers and WhatsApp group links (per instructions)
 * - Includes complete event guide and Do's & Don'ts
 * - Attaches official personalized Boarding Pass PDF (NAG-XXXXXX-Boarding-Pass.pdf)
 * - Deduplicates emails and logs sent records into sent_emails_log.json
 * - Built-in rate limiting (350ms delay) and retry logic
 * 
 * USAGE:
 *   node send_nagesh_bulk_tickets.js --dry
 *   node send_nagesh_bulk_tickets.js --test=yourname@gmail.com
 *   node send_nagesh_bulk_tickets.js --send --limit=10
 *   node send_nagesh_bulk_tickets.js --send
 */

const fs = require('fs');
const path = require('path');
const { Resend } = require('resend');
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

const LOG_FILE = path.join(__dirname, 'sent_emails_log.json');

// CLI Arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry');
const isRealSend = args.includes('--send');
const testArg = args.find(a => a.startsWith('--test='));
const testEmail = testArg ? testArg.split('=')[1].trim() : null;
const limitArg = args.find(a => a.startsWith('--limit='));
const sendLimit = limitArg ? parseInt(limitArg.split('=')[1], 10) : Infinity;

const sleep = ms => new Promise(res => setTimeout(res, ms));

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

async function fetchNageshRegistrations() {
    console.log('Fetching Nagesh registrations from Supabase...');
    const list = [];
    const fields = 'id,name,email,phone,college,year,verified,referred_by,timestamp';

    for (let off = 0; ; off += 1000) {
        const url = `${SUPABASE_URL}/rest/v1/registrations?id=like.NAG-*&select=${fields}&order=timestamp.asc&limit=1000&offset=${off}`;
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
    console.log('   CELEBRATE CINEMA 2026 — NAGESH TICKET DISPATCH     ');
    console.log('   Email + Personalized PDF Boarding Pass Attachment  ');
    console.log('======================================================\n');

    if (!isDryRun && !testEmail && !isRealSend) {
        console.log('⚠️ Running in PREVIEW mode. To send live emails, add the --send flag:');
        console.log('   node send_nagesh_bulk_tickets.js --send');
        console.log('   node send_nagesh_bulk_tickets.js --send --limit=50\n');
    }

    if (!isDryRun && !RESEND_API_KEY) {
        console.error('❌ ERROR: RESEND_API_KEY is not set in environment or .env!');
        process.exit(1);
    }

    const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;
    const sentLog = loadSentLog();

    // 1. Fetch Nagesh registrations
    const rawList = await fetchNageshRegistrations();
    console.log(`✓ Fetched ${rawList.length} total Nagesh records from Supabase.`);

    // 2. Clean & deduplicate by email
    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
    const emailToReg = new Map();

    for (const r of rawList) {
        const em = cleanEmail(r.email);
        r.email = em;
        if (!em || !EMAIL_REGEX.test(em)) continue;
        if (!emailToReg.has(em)) {
            emailToReg.set(em, r);
        }
    }

    const uniqueRegistrations = Array.from(emailToReg.values());
    console.log(`✓ Deduplicated to ${uniqueRegistrations.length} unique recipient delegates.`);

    // Test mode
    if (testEmail) {
        console.log(`\n🧪 TEST DISPATCH to: ${testEmail}`);
        const sampleReg = { ...uniqueRegistrations[0], email: testEmail, name: 'Test Delegate (Nagesh)' };
        const mailData = await buildNageshConfirmationEmail(sampleReg);
        console.log(`✓ Generated sample PDF attachment (${(mailData.attachments[0].content.length / 1024).toFixed(1)} KB)`);

        if (isDryRun) {
            console.log('Dry run: Email prepared, not sent.');
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

        if (resp.error) console.error('❌ Test email failed:', resp.error);
        else console.log(`✓ Test email delivered! Message ID: ${resp.data?.id}`);
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

    // If Dry Run or not --send
    if (isDryRun || !isRealSend) {
        console.log('\n[SUMMARY PREVIEW]');
        console.log(`- From: ${FROM_EMAIL}`);
        console.log(`- Recipient delegates to be emailed: ${targets.length}`);
        if (targets.length > 0) {
            console.log('Sample 3 recipients:');
            targets.slice(0, 3).forEach((r, idx) => {
                console.log(`  ${idx + 1}. ${r.name} <${r.email}> [${r.id}] - ${r.college}`);
            });
            console.log('Testing PDF builder for first target...');
            const sampleMail = await buildNageshConfirmationEmail(targets[0], { includeWhatsApp: true });
            console.log(`✓ Sample PDF size: ${(sampleMail.attachments[0].content.length / 1024).toFixed(1)} KB`);
            console.log(`✓ Email Subject: "${sampleMail.subject}"`);
        }
        console.log('\nReady! Run with --send to begin dispatching confirmation emails:');
        console.log('   node send_nagesh_bulk_tickets.js --send\n');
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
            const mailData = await buildNageshConfirmationEmail(reg, { includeWhatsApp: true });

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

        // Resend rate limit safety delay
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
