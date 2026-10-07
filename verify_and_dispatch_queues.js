/**
 * CELEBRATE CINEMA 2026 — VERIFY AND SEND EMAILS TO FREE & PAID DELEGATES
 * 
 * Category A: Free Registrations (Unverified) -> Mark verified: true in Supabase, Send Confirmation + Boarding Pass PDF
 * Category B: Paid Registrations WITH Screenshot (Unverified) -> Mark verified: true in Supabase, Send Confirmation + Boarding Pass PDF
 * Category C: Paid Registrations WITHOUT Screenshot (Incomplete) -> Send Tanishka Free Pass Link Email
 * 
 * Usage:
 *   node verify_and_dispatch_queues.js --dry
 *   node verify_and_dispatch_queues.js --send
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

const FREE_PASS_URL = 'https://whistlingwoods.careerbeam.in/c/tanishka';
const WHATSAPP_URL = 'https://chat.whatsapp.com/DzA3LRSfW44Ap6viArkjI7';

const CONFIRMATION_LOG_FILE = path.join(__dirname, 'sent_emails_log.json');
const FREE_PASS_LOG_FILE = path.join(__dirname, 'sent_free_pass_emails_log.json');

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry');
const isRealSend = args.includes('--send');

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
    email = email.replace(/@gmail$/, '@gmail.com');
    email = email.replace(/@92gmail\.com$/, '92@gmail.com');
    return email;
}

function buildFreePassEmailHtml(name, college) {
    const safeName = name ? name.trim() : 'Delegate';
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Exclusive Free Pass: Celebrate Cinema 2026</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0914; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f3f0f7; -webkit-font-smoothing: antialiased;">
    <div style="padding: 24px 12px; background-color: #0b0914;">
        <div style="max-width: 600px; margin: 0 auto; background: #140f21; border: 1px solid rgba(212, 168, 67, 0.4); border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
            <!-- Header Banner -->
            <div style="background: linear-gradient(135deg, #24163f 0%, #110c1c 100%); padding: 32px 24px; text-align: center; border-bottom: 2px solid #d4a843;">
                <div style="display: inline-block; background: rgba(212, 168, 67, 0.15); color: #f7e7c5; border: 1px solid #d4a843; border-radius: 20px; padding: 4px 14px; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 12px;">
                    Special Invitation • 100% Free Pass
                </div>
                <h1 style="color: #ffffff; font-size: 23px; font-weight: 800; margin: 0 0 6px; letter-spacing: 0.5px;">
                    Celebrate Cinema 2026
                </h1>
                <p style="color: #d4a843; font-size: 14px; font-weight: 600; margin: 0; letter-spacing: 0.5px;">
                    The Academic Trek at Whistling Woods International
                </p>
            </div>

            <!-- Content -->
            <div style="padding: 28px 24px; line-height: 1.6; color: #d6cee3; font-size: 14.5px;">
                <p style="margin: 0 0 14px; font-size: 16px;">Dear <strong style="color: #ffffff;">${safeName}</strong>,</p>
                
                <p style="margin: 0 0 16px;">
                    We noticed that you started your registration for <strong>Celebrate Cinema 2026</strong> at <strong>Whistling Woods International</strong>, but did not complete the payment step or submit your payment screenshot.
                </p>

                <p style="margin: 0 0 20px;">
                    <strong style="color: #f7e7c5;">Great news: You do not need to pay anything!</strong> As part of our special campus outreach partnership with Tanishka, we have arranged a <strong style="color: #4ade80;">100% Free Delegate Pass</strong> exclusively for you.
                </p>

                <!-- Free Pass CTA Box -->
                <div style="background: linear-gradient(135deg, rgba(37, 26, 60, 0.95), rgba(19, 15, 33, 0.95)); border: 1.5px solid #d4a843; border-radius: 12px; padding: 24px 20px; text-align: center; margin: 24px 0; box-shadow: 0 6px 20px rgba(212, 168, 67, 0.15);">
                    <div style="font-size: 12px; font-weight: 700; color: #d4a843; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px;">
                        ★ Exclusive Free Registration Link ★
                    </div>
                    <h3 style="color: #ffffff; margin: 0 0 14px; font-size: 19px;">
                        Claim Your Free Pass in 30 Seconds
                    </h3>
                    <p style="margin: 0 0 18px; font-size: 13px; color: #c4a8e2;">
                        The ₹150 registration fee is completely waived. Simply click below, confirm your name &amp; college, and receive your instant digital entry QR pass:
                    </p>
                    <a href="${FREE_PASS_URL}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #d4a843 0%, #b8860b 100%); color: #0b0914 !important; font-weight: 800; font-size: 15px; padding: 14px 34px; border-radius: 30px; text-decoration: none; box-shadow: 0 4px 16px rgba(212, 168, 67, 0.4); text-transform: uppercase; letter-spacing: 0.5px;">
                        👉 Click Here For Free Pass
                    </a>
                    <div style="margin-top: 14px; font-size: 12px; color: #a69bb5;">
                        Direct URL: <a href="${FREE_PASS_URL}" style="color: #d4a843; word-break: break-all; text-decoration: underline;">${FREE_PASS_URL}</a>
                    </div>
                </div>

                <!-- Event Snapshot -->
                <div style="background: rgba(26, 20, 42, 0.7); border: 1px solid rgba(141, 106, 174, 0.25); border-radius: 8px; padding: 16px 18px; margin-bottom: 22px;">
                    <div style="font-size: 13px; font-weight: 700; color: #d4a843; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px;">
                        📍 Event Details &amp; Venue
                    </div>
                    <table style="width: 100%; border-collapse: collapse; font-size: 13.5px;">
                        <tr>
                            <td style="padding: 5px 0; color: #a69bb5; width: 28%;">📅 Dates:</td>
                            <td style="padding: 5px 0; color: #ffffff; font-weight: 600;">08th &amp; 09th October 2026 (Thursday &amp; Friday)</td>
                        </tr>
                        <tr>
                            <td style="padding: 5px 0; color: #a69bb5;">⏰ Timings:</td>
                            <td style="padding: 5px 0; color: #ffffff; font-weight: 600;">09:00 AM – 06:00 PM (Gates open at 8:30 AM)</td>
                        </tr>
                        <tr>
                            <td style="padding: 5px 0; color: #a69bb5;">🏛️ Venue:</td>
                            <td style="padding: 5px 0; color: #ffffff; font-weight: 600;">Whistling Woods International, Film City, Goregaon (East), Mumbai</td>
                        </tr>
                        <tr>
                            <td style="padding: 5px 0; color: #a69bb5;">🎟️ Pass Type:</td>
                            <td style="padding: 5px 0; color: #4ade80; font-weight: 600;">100% Free Campus Delegation Pass (₹0)</td>
                        </tr>
                    </table>
                </div>

                <!-- WhatsApp Community CTA -->
                <div style="text-align: center; margin: 24px 0; background: rgba(37, 211, 102, 0.1); border: 1px dashed rgba(37, 211, 102, 0.45); border-radius: 10px; padding: 20px 18px;">
                    <h4 style="color: #ffffff; margin: 0 0 6px; font-size: 15.5px;">
                        📲 Official WhatsApp Delegate Group
                    </h4>
                    <p style="margin: 0 0 14px; font-size: 13px; color: #c4a8e2; line-height: 1.5;">
                        Join the official group to get live updates on workshop slot bookings, celebrity schedules, and shuttle bus timings:
                    </p>
                    <a href="${WHATSAPP_URL}" target="_blank" style="display: inline-block; background: #25D366; color: #ffffff !important; text-decoration: none; font-weight: 700; font-size: 13.5px; padding: 10px 24px; border-radius: 20px;">
                        👉 Click Here to Join WhatsApp Group
                    </a>
                </div>

                <p style="margin: 20px 0 6px; font-size: 14px;">We look forward to hosting you on campus at Film City!</p>
                <p style="margin: 0 0 16px; font-size: 14px; color: #ffffff; font-weight: 700;">See you at Whistling Woods International!</p>

                <!-- Signoff -->
                <div style="border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 14px; margin-top: 16px; font-size: 13px; color: #b8acc9;">
                    Warm regards,<br>
                    <strong style="color: #ffffff;">Team Celebrate Cinema 2026</strong><br>
                    <span style="color: #d4a843;">Whistling Woods International &amp; CareerBeam</span>
                </div>
            </div>

            <!-- Footer -->
            <div style="background: #0b0914; padding: 16px 20px; text-align: center; font-size: 11px; color: #736882; border-top: 1px solid rgba(255, 255, 255, 0.06);">
                <p style="margin: 0 0 4px;">Whistling Woods International, Film City Complex, Goregaon (East), Mumbai - 400065</p>
                <p style="margin: 0;">Powered by CareerBeam (<a href="https://careerbeam.in" style="color: #d4a843; text-decoration: none;">careerbeam.in</a>)</p>
            </div>
        </div>
    </div>
</body>
</html>`;
}

function buildFreePassEmailText(name) {
    const safeName = name ? name.trim() : 'Delegate';
    return `Dear ${safeName},

We noticed that you started your registration for Celebrate Cinema 2026 at Whistling Woods International, but did not complete the payment step or submit your payment screenshot.

Great news: You do not need to pay anything! As part of our special campus outreach partnership with Tanishka, we have arranged a 100% Free Delegate Pass exclusively for you.

CLAIM YOUR FREE PASS HERE:
${FREE_PASS_URL}

Event Dates: 08th & 09th October 2026
Venue: Whistling Woods International, Film City, Goregaon (East), Mumbai
Join WhatsApp Community: ${WHATSAPP_URL}

Warm regards,
Team Celebrate Cinema 2026
Whistling Woods International & CareerBeam`;
}

async function markVerifiedInSupabase(ids) {
    let successCount = 0;
    const CHUNK_SIZE = 50;
    for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
        const chunk = ids.slice(i, i + CHUNK_SIZE);
        try {
            const inFilter = chunk.map(id => id.trim()).join(',');
            const res = await fetch(`${SUPABASE_URL}/rest/v1/registrations?id=in.(${encodeURIComponent(inFilter)})`, {
                method: 'PATCH',
                headers: {
                    apikey: SUPABASE_KEY,
                    Authorization: `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json',
                    Prefer: 'return=minimal'
                },
                body: JSON.stringify({ verified: true })
            });
            if (res.ok) {
                successCount += chunk.length;
            } else {
                console.warn(`Chunk PATCH returned ${res.status}, falling back to single updates...`);
                for (const singleId of chunk) {
                    const sRes = await fetch(`${SUPABASE_URL}/rest/v1/registrations?id=eq.${encodeURIComponent(singleId)}`, {
                        method: 'PATCH',
                        headers: {
                            apikey: SUPABASE_KEY,
                            Authorization: `Bearer ${SUPABASE_KEY}`,
                            'Content-Type': 'application/json',
                            Prefer: 'return=minimal'
                        },
                        body: JSON.stringify({ verified: true })
                    });
                    if (sRes.ok) successCount++;
                }
            }
        } catch(e) {
            console.error('Error verifying chunk in Supabase:', e.message);
        }
    }
    return successCount;
}

(async () => {
    console.log('\n========================================================================');
    console.log('   CELEBRATE CINEMA 2026 — DUAL PROCESSOR FOR UNVERIFIED REGISTRATIONS  ');
    console.log('   Part 1: Verify & Send Confirmation Passes to Free & Paid (with SS)   ');
    console.log('   Part 2: Send Tanishka Free Pass Link to Incomplete Paid (without SS) ');
    console.log('========================================================================\n');

    if (!RESEND_API_KEY && !isDryRun) {
        console.error('❌ ERROR: RESEND_API_KEY is not configured in .env!');
        process.exit(1);
    }

    const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;
    const confirmLog = loadLog(CONFIRMATION_LOG_FILE);
    const freePassLog = loadLog(FREE_PASS_LOG_FILE);

    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

    // 1. Fetch all unverified records from Supabase (metadata only)
    const SYNC_COLUMNS = 'id,name,email,phone,college,year,referral_code,referred_by,coupon_used,base_price,coupon_discount,final_price,transaction_id,verified,timestamp';
    const allUnverified = [];
    for (let off = 0; ; off += 1000) {
        const url = `${SUPABASE_URL}/rest/v1/registrations?id=neq.CONFIG_COLLEGES&verified=eq.false&select=${SYNC_COLUMNS}&order=timestamp.desc&limit=1000&offset=${off}`;
        const res = await fetch(url, { headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY } });
        const batch = await res.json();
        if (!Array.isArray(batch)) {
            console.error('Fetch error:', batch);
            break;
        }
        allUnverified.push(...batch);
        if (batch.length < 1000) break;
    }
    console.log(`✓ Fetched ${allUnverified.length} total unverified registrations from Supabase.`);

    // 2. Identify records with NO screenshot
    const noSSIds = new Set();
    const ssNullUrl = `${SUPABASE_URL}/rest/v1/registrations?id=neq.CONFIG_COLLEGES&verified=eq.false&payment_screenshot=is.null&select=id`;
    const ssNullRes = await fetch(ssNullUrl, { headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY } });
    const ssNull = await ssNullRes.json();
    (ssNull || []).forEach(r => noSSIds.add(r.id));

    const ssEmptyUrl = `${SUPABASE_URL}/rest/v1/registrations?id=neq.CONFIG_COLLEGES&verified=eq.false&payment_screenshot=eq.&select=id`;
    const ssEmptyRes = await fetch(ssEmptyUrl, { headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY } });
    const ssEmpty = await ssEmptyRes.json();
    (ssEmpty || []).forEach(r => noSSIds.add(r.id));

    console.log(`✓ Identified ${noSSIds.size} unverified records without payment screenshot.`);

    // 3. Classify records
    const isFree = r => {
        const id = String(r.id || '');
        const price = Number(r.final_price);
        const txn = String(r.transaction_id || '').toUpperCase();
        const coup = String(r.coupon_used || '').toUpperCase();
        const ref = String(r.referred_by || '').toUpperCase();
        return ((price === 0 || isNaN(price) || price === null) && !id.startsWith('CCM')) ||
            txn.startsWith('FREE') || coup.startsWith('FREE') || coup.includes('WWI100') ||
            txn.includes('FREE') || ref.includes('COLLEGE:') || ref.includes('ROTARACT');
    };

    const catFree = [];
    const catPaidWithSS = [];
    const catPaidWithoutSS = [];

    allUnverified.forEach(r => {
        const hasSS = !noSSIds.has(r.id);
        if (isFree(r)) {
            catFree.push(r);
        } else {
            if (hasSS) {
                catPaidWithSS.push(r);
            } else {
                catPaidWithoutSS.push(r);
            }
        }
    });

    console.log(`\nClassification Summary:`);
    console.log(`- Category A (Free Passes): ${catFree.length}`);
    console.log(`- Category B (Paid WITH Screenshot): ${catPaidWithSS.length}`);
    console.log(`- Category C (Paid WITHOUT Screenshot): ${catPaidWithoutSS.length}`);

    // Combine Category A and Category B for VERIFICATION in Supabase
    const toVerifyList = [...catFree, ...catPaidWithSS];
    const toVerifyIds = toVerifyList.map(r => r.id);

    // Build unique confirmation email targets (Category A + B)
    const uniqueConfirmMap = new Map();
    for (const r of toVerifyList) {
        const em = cleanEmail(r.email);
        r.email = em;
        if (!em || !EMAIL_REGEX.test(em)) continue;
        if (!uniqueConfirmMap.has(em)) {
            uniqueConfirmMap.set(em, r);
        }
    }

    const pendingConfirmToSend = Array.from(uniqueConfirmMap.values()).filter(r => {
        return !confirmLog.sent || !confirmLog.sent[r.email.trim().toLowerCase()];
    });

    console.log(`\n--- PART 1: CONFIRMATION TICKETS (FREE + PAID WITH SS) ---`);
    console.log(`Total registrations to mark verified in Supabase: ${toVerifyIds.length}`);
    console.log(`Unique delegates pending Confirmation + PDF Ticket email: ${pendingConfirmToSend.length}`);

    // Build unique Tanishka Free Pass email targets (Category C: Paid without screenshot)
    const uniquePaidNoSSMap = new Map();
    for (const r of catPaidWithoutSS) {
        const em = cleanEmail(r.email);
        r.email = em;
        if (!em || !EMAIL_REGEX.test(em)) continue;
        if (!uniquePaidNoSSMap.has(em)) {
            uniquePaidNoSSMap.set(em, r);
        }
    }

    const pendingFreePassToSend = Array.from(uniquePaidNoSSMap.values()).filter(r => {
        const em = r.email.trim().toLowerCase();
        const alreadyGotFreePass = Boolean(freePassLog.sent && freePassLog.sent[em]);
        const alreadyGotConfirm = Boolean(confirmLog.sent && confirmLog.sent[em]);
        return !alreadyGotFreePass && !alreadyGotConfirm;
    });

    console.log(`\n--- PART 2: TANISHKA FREE PASS LINK (INCOMPLETE PAID WITHOUT SS) ---`);
    console.log(`Total incomplete paid delegates without screenshot: ${catPaidWithoutSS.length}`);
    console.log(`Unique delegates pending Tanishka Free Pass email: ${pendingFreePassToSend.length}`);

    if (isDryRun || !isRealSend) {
        console.log('\n======================================================');
        console.log('🔍 PREVIEW MODE COMPLETE (No data modified)');
        console.log('To execute verification and send emails live, run:');
        console.log('  node verify_and_dispatch_queues.js --send');
        console.log('======================================================\n');
        return;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // LIVE EXECUTION
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n========================================================================');
    console.log('                      STARTING LIVE EXECUTION                           ');
    console.log('========================================================================\n');

    // Step 1: Mark Free + Paid-with-SS as verified: true in Supabase
    console.log(`[DB UPDATE] Marking ${toVerifyIds.length} registrations as verified: true in Supabase...`);
    const verifiedDbCount = await markVerifiedInSupabase(toVerifyIds);
    console.log(`✓ Successfully updated ${verifiedDbCount} records to verified: true in Supabase!\n`);

    // Step 2: Dispatch Confirmation Emails with Boarding Pass PDF
    console.log(`[EMAIL DISPATCH 1] Sending Confirmation + Boarding Pass PDF to ${pendingConfirmToSend.length} delegates...`);
    let confirmSent = 0;
    let confirmFail = 0;

    for (let i = 0; i < pendingConfirmToSend.length; i++) {
        const r = pendingConfirmToSend[i];
        const em = r.email.trim().toLowerCase();
        const name = r.name || 'Delegate';
        r.verified = true;

        process.stdout.write(`  [${i + 1}/${pendingConfirmToSend.length}] ${r.id} (${name} <${em}>)... `);

        let sendRes = null;
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                const mailData = await buildConfirmationEmail(r);
                sendRes = await resend.emails.send({
                    from: FROM_EMAIL,
                    to: [em],
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
            if (!confirmLog.sent) confirmLog.sent = {};
            confirmLog.sent[em] = {
                ticketId: r.id,
                name: name,
                resendId: resendId,
                sentAt: new Date().toISOString()
            };
            confirmLog.totalSent = Object.keys(confirmLog.sent).length;
            saveLog(CONFIRMATION_LOG_FILE, confirmLog);
            confirmSent++;
        } else {
            console.log(`FAILED: ${JSON.stringify(sendRes?.error)}`);
            confirmFail++;
        }

        await sleep(350);
    }

    console.log(`\n✓ Part 1 complete: ${confirmSent} confirmation passes delivered (${confirmFail} failed).\n`);

    // Step 3: Dispatch Tanishka Free Pass email to incomplete paid delegates
    console.log(`[EMAIL DISPATCH 2] Sending Tanishka Free Pass email to ${pendingFreePassToSend.length} incomplete delegates...`);
    let freePassSent = 0;
    let freePassFail = 0;

    for (let i = 0; i < pendingFreePassToSend.length; i++) {
        const r = pendingFreePassToSend[i];
        const em = r.email.trim().toLowerCase();
        const name = r.name || 'Delegate';
        const subject = '🎟️ Special Complimentary Access: Claim Your Free Delegate Pass for Celebrate Cinema 2026!';
        const html = buildFreePassEmailHtml(name, r.college);
        const text = buildFreePassEmailText(name);

        process.stdout.write(`  [${i + 1}/${pendingFreePassToSend.length}] ${r.id} (${name} <${em}>)... `);

        let sendRes = null;
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                sendRes = await resend.emails.send({
                    from: FROM_EMAIL,
                    to: [em],
                    subject: subject,
                    html: html,
                    text: text
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
            if (!freePassLog.sent) freePassLog.sent = {};
            freePassLog.sent[em] = {
                ticketId: r.id,
                name: name,
                resendId: resendId,
                sentAt: new Date().toISOString()
            };
            freePassLog.totalSent = Object.keys(freePassLog.sent).length;
            saveLog(FREE_PASS_LOG_FILE, freePassLog);
            freePassSent++;
        } else {
            console.log(`FAILED: ${JSON.stringify(sendRes?.error)}`);
            freePassFail++;
        }

        await sleep(350);
    }

    console.log(`\n✓ Part 2 complete: ${freePassSent} Tanishka Free Pass links delivered (${freePassFail} failed).\n`);

    console.log('========================================================================');
    console.log('                      ALL QUEUES COMPLETED!                             ');
    console.log(`  • Database verified: ${verifiedDbCount} records`);
    console.log(`  • Confirmation tickets sent: ${confirmSent} (Failed: ${confirmFail})`);
    console.log(`  • Tanishka free pass links sent: ${freePassSent} (Failed: ${freePassFail})`);
    console.log('========================================================================\n');

})().catch(e => {
    console.error('Fatal execution error:', e);
    process.exit(1);
});
