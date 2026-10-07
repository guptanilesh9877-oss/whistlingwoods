/**
 * CELEBRATE CINEMA 2026 — VERIFY & SEND CONFIRMATION TO UNVERIFIED FREE REGISTRATIONS
 * 
 * Automatically marks unverified free registrations (college delegations, rotaract, vendor, gaming, etc.)
 * as verified (verified: true) in Supabase, and dispatches their official confirmation email
 * with their personalized Boarding Pass PDF ticket attached.
 *
 * Usage:
 *   node verify_and_send_free.js --dry
 *   node verify_and_send_free.js --test=yourname@gmail.com
 *   node verify_and_send_free.js --send
 *   node verify_and_send_free.js --send --limit=10
 */

const fs = require('fs');
const path = require('path');
const { Resend } = require('resend');
const { buildConfirmationEmail } = require('./mail_builder');

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

// CLI args
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
        } catch(e) {}
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

async function markVerifiedInSupabase(id) {
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/registrations?id=eq.${encodeURIComponent(id)}`, {
            method: 'PATCH',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify({ verified: true })
        });
        return res.ok;
    } catch(e) {
        console.error(`Error verifying record ${id} in Supabase:`, e.message);
        return false;
    }
}

async function fetchUnverifiedFreeRegistrations() {
    console.log('Fetching unverified registrations from Supabase...');
    const fields = 'id,name,email,phone,college,year,final_price,transaction_id,coupon_used,referred_by,timestamp';
    const url = `${SUPABASE_URL}/rest/v1/registrations?verified=eq.false&id=not.eq.CONFIG_COLLEGES&select=${fields}&order=timestamp.asc`;
    const res = await fetch(url, {
        headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`
        }
    });

    if (!res.ok) {
        throw new Error(`Failed to query Supabase: ${await res.text()}`);
    }

    const data = await res.json();
    console.log(`✓ Fetched ${data.length} total unverified registrations.`);

    // Filter to FREE registrations only (not paid CCM intent)
    const freeList = data.filter(r => {
        const id = String(r.id || '');
        const price = Number(r.final_price);
        const txn = String(r.transaction_id || '').toUpperCase();
        const coup = String(r.coupon_used || '').toUpperCase();

        // If price is 0 or null and not a CCM ticket, or has FREE coupon/txn
        const isFree = (price === 0 || isNaN(price) || price === null) && !id.startsWith('CCM');
        const hasFreeCode = txn.startsWith('FREE') || coup.startsWith('FREE');

        return (isFree || hasFreeCode) && id !== 'CONFIG_COLLEGES';
    });

    console.log(`✓ Filtered down to ${freeList.length} free delegation registrations.`);
    return freeList;
}

(async () => {
    console.log('\n================================================================');
    console.log('   CELEBRATE CINEMA 2026 — VERIFY & SEND CONFIRMATION PASSES    ');
    console.log('   Target: Unverified Free Registrations                        ');
    console.log('   Email: Official Confirmation + PDF Boarding Pass Attachment   ');
    console.log('================================================================\n');

    if (!RESEND_API_KEY && !isDryRun) {
        console.error('❌ ERROR: RESEND_API_KEY is not set in environment or .env!');
        process.exit(1);
    }

    const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;
    const sentLog = loadSentLog();

    // 1. Fetch unverified free registrations
    const rawList = await fetchUnverifiedFreeRegistrations();

    // 2. Filter & clean emails, deduplicate
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

    const uniqueList = Array.from(emailToReg.values());
    console.log(`✓ Deduplicated to ${uniqueList.length} unique recipient emails.`);

    // 3. Filter out anyone already in sent_emails_log.json
    const pendingList = uniqueList.filter(r => {
        const em = r.email.trim().toLowerCase();
        return !sentLog.sent || !sentLog.sent[em];
    });

    const alreadySentCount = uniqueList.length - pendingList.length;
    console.log(`✓ Already received confirmation previously: ${alreadySentCount}`);
    console.log(`✓ Pending to verify & send now: ${pendingList.length}\n`);

    // TEST MODE
    if (testEmail) {
        console.log(`🧪 TEST MODE ACTIVATED`);
        console.log(`Sending sample confirmation + generated PDF pass to: ${testEmail}`);
        const sampleReg = pendingList[0] || {
            id: 'VEN-999999',
            name: 'Test Delegate',
            email: testEmail,
            college: 'Whistling Woods International',
            year: '3rd Year__VD__Both Days (08th & 09th Oct)'
        };
        sampleReg.email = testEmail;

        const mailData = await buildConfirmationEmail(sampleReg);
        console.log(`✓ Generated Boarding Pass PDF (${mailData.attachments[0].content.length} bytes).`);

        if (isDryRun) {
            console.log('DRY RUN: Subject:', mailData.subject);
            console.log('DRY RUN: From:', FROM_EMAIL);
            console.log('DRY RUN: To:', testEmail);
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

    const targets = pendingList.slice(0, sendLimit);
    if (targets.length < pendingList.length) {
        console.log(`Notice: Limiting execution to first ${targets.length} recipients (--limit flag).\n`);
    }

    // DRY RUN
    if (isDryRun || !isRealSend) {
        console.log('🔍 PREVIEW / DRY RUN MODE:');
        console.log(`Would verify in Supabase & send Boarding Pass PDF to ${targets.length} delegates:\n`);
        targets.forEach((r, idx) => {
            console.log(`  ${idx + 1}. [${r.id}] ${r.name || 'Delegate'} <${r.email}> (${r.college || 'No college'}) [Txn: ${r.transaction_id || 'FREE'}]`);
        });
        console.log('\nTo execute live verification and email dispatch, run:');
        console.log('  node verify_and_send_free.js --send');
        console.log('Or send a preview test first:');
        console.log('  node verify_and_send_free.js --test=yourname@gmail.com');
        return;
    }

    // REAL SEND
    console.log(`🚀 Step 1: Updating ${rawList.length} records to verified: true in Supabase...`);
    const targetIds = rawList.map(r => r.id);
    let verifiedDbCount = 0;

    for (let i = 0; i < targetIds.length; i += 25) {
        const chunk = targetIds.slice(i, i + 25);
        try {
            const inFilter = chunk.map(id => `"${id}"`).join(',');
            const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/registrations?id=in.(${encodeURIComponent(inFilter)})`, {
                method: 'PATCH',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify({ verified: true })
            });
            if (patchRes.ok) {
                verifiedDbCount += chunk.length;
            } else {
                console.warn(`Batch patch warning (${patchRes.status}): ${await patchRes.text()}`);
                // Fallback to single patches for this chunk
                for (const singleId of chunk) {
                    if (await markVerifiedInSupabase(singleId)) verifiedDbCount++;
                }
            }
        } catch(e) {
            console.error('Batch patch error:', e.message);
        }
    }
    console.log(`✓ Marked ${verifiedDbCount} records as verified: true in Supabase.\n`);

    console.log(`🚀 Step 2: Starting live email dispatch with Boarding Pass PDF to ${targets.length} delegates...\n`);
    let sentCount = 0;
    let failCount = 0;

    for (let i = 0; i < targets.length; i++) {
        const r = targets[i];
        const em = r.email.trim().toLowerCase();
        const name = r.name || 'Delegate';

        process.stdout.write(`[${i + 1}/${targets.length}] ${r.id} (${name} <${em}>)... `);

        try {
            r.verified = true;
            // 1. Generate PDF Boarding Pass & Email HTML
            const mailData = await buildConfirmationEmail(r);

            // 2. Send email via Resend
            const resp = await resend.emails.send({
                from: FROM_EMAIL,
                to: [em],
                subject: mailData.subject,
                html: mailData.html,
                text: mailData.text,
                attachments: mailData.attachments
            });

            if (resp.error) {
                console.log(`FAILED: ${JSON.stringify(resp.error)}`);
                failCount++;
            } else {
                const resendId = resp.data?.id;
                console.log(`✓ OK (ID: ${resendId})`);

                if (!sentLog.sent) sentLog.sent = {};
                sentLog.sent[em] = {
                    ticketId: r.id,
                    name: name,
                    resendId: resendId,
                    sentAt: new Date().toISOString()
                };
                sentLog.totalSent = (sentLog.totalSent || 0) + 1;
                saveSentLog(sentLog);
                sentCount++;
            }
        } catch(err) {
            console.log(`ERROR: ${err.message}`);
            failCount++;
        }

        // Delay 1000ms between sends to stay within Resend rate limits
        if (i < targets.length - 1) {
            await sleep(1000);
        }
    }

    console.log('\n================================================================');
    console.log(`Execution complete. Successfully verified & sent: ${sentCount} | Failed: ${failCount}`);
    console.log(`Log saved to: ${LOG_FILE}`);
    console.log('================================================================\n');
})();
