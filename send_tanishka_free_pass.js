/**
 * CELEBRATE CINEMA 2026 — SEND TANISHKA FREE PASS LINK
 * 
 * Sends a personalized email with the Tanishka free pass delegation link
 * (https://whistlingwoods.careerbeam.in/c/tanishka) to delegates who started
 * registration but did not submit a payment screenshot.
 *
 * Usage:
 *   node send_tanishka_free_pass.js --dry
 *   node send_tanishka_free_pass.js --test=yourname@gmail.com
 *   node send_tanishka_free_pass.js --send
 *   node send_tanishka_free_pass.js --send --limit=10
 *   node send_tanishka_free_pass.js --send --source=csv
 */

const fs = require('fs');
const path = require('path');
const { Resend } = require('resend');

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
const LOG_FILE = path.join(__dirname, 'sent_free_pass_emails_log.json');

// CLI args
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry');
const isRealSend = args.includes('--send');
const testArg = args.find(a => a.startsWith('--test='));
const testEmail = testArg ? testArg.split('=')[1].trim() : null;
const limitArg = args.find(a => a.startsWith('--limit='));
const sendLimit = limitArg ? parseInt(limitArg.split('=')[1], 10) : Infinity;
const sourceArg = args.find(a => a.startsWith('--source='));
const source = sourceArg ? sourceArg.split('=')[1].trim().toLowerCase() : 'supabase';

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
    return email;
}

function buildEmailHtml(name, college) {
    const safeName = name ? name.trim() : 'Delegate';

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Free Delegate Pass Link — Celebrate Cinema 2026</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0914; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f3f0f7; -webkit-font-smoothing: antialiased;">
    <div style="padding: 24px 12px; background-color: #0b0914;">
        <div style="max-width: 620px; margin: 0 auto; background: #140f21; border: 1px solid rgba(212, 168, 67, 0.4); border-radius: 14px; overflow: hidden; box-shadow: 0 12px 36px rgba(0,0,0,0.65);">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #281442 0%, #110c1c 100%); padding: 34px 24px 28px; text-align: center; border-bottom: 2px solid #d4a843;">
                <div style="display: inline-block; background: rgba(212, 168, 67, 0.15); color: #f7e7c5; border: 1px solid #d4a843; border-radius: 20px; padding: 5px 16px; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 12px;">
                    🎁 100% Complimentary Delegation Pass
                </div>
                <h1 style="color: #ffffff; font-size: 24px; font-weight: 800; margin: 0 0 6px; letter-spacing: 0.5px; line-height: 1.3;">
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

                <!-- What's included -->
                <div style="background: rgba(19, 15, 33, 0.7); border: 1px solid rgba(141, 106, 174, 0.2); border-radius: 8px; padding: 14px 18px; margin-bottom: 22px;">
                    <div style="font-size: 13px; font-weight: 700; color: #d4a843; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
                        ✨ What Your Pass Includes:
                    </div>
                    <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #b8acc9; line-height: 1.6;">
                        <li>Masterclasses by Bollywood directors, actors, cinematographers &amp; sound engineers</li>
                        <li>Practical hands-on workshops in Filmmaking, Acting, Animation, VFX &amp; Screenwriting</li>
                        <li>Interactive guided studio tours inside Asia's top media &amp; film campus in Film City</li>
                        <li>Official Certificate of Academic Delegation from Whistling Woods International</li>
                    </ul>
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

                <!-- Coordinator Contact Info -->
                <div style="background: rgba(19, 15, 33, 0.9); border: 1px solid rgba(141, 106, 174, 0.3); border-radius: 8px; padding: 14px 18px; margin-bottom: 20px;">
                    <div style="font-size: 12.5px; font-weight: 700; color: #d4a843; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
                        📞 Student &amp; Delegation Coordinators:
                    </div>
                    <table style="width: 100%; border-collapse: collapse; font-size: 12.5px;">
                        <tr>
                            <td style="padding: 4px 0; color: #ffffff;">Nilesh Kumar Gupta:</td>
                            <td style="padding: 4px 0;"><a href="tel:+918699260386" style="color: #d4a843; text-decoration: none;">+91 86992 60386</a></td>
                        </tr>
                        <tr>
                            <td style="padding: 4px 0; color: #ffffff;">Satvik Satam:</td>
                            <td style="padding: 4px 0;"><a href="tel:+919136045359" style="color: #d4a843; text-decoration: none;">+91 91360 45359</a></td>
                        </tr>
                        <tr>
                            <td style="padding: 4px 0; color: #ffffff;">Sahil Mishra:</td>
                            <td style="padding: 4px 0;"><a href="tel:+916206686464" style="color: #d4a843; text-decoration: none;">+91 62066 86464</a></td>
                        </tr>
                    </table>
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

function buildEmailText(name) {
    const safeName = name ? name.trim() : 'Delegate';
    return `Dear ${safeName},

We noticed that you started your registration for Celebrate Cinema 2026 at Whistling Woods International, but did not complete the payment step or submit your payment screenshot.

Great news: You do not need to pay anything! As part of our special campus outreach partnership with Tanishka, we have arranged a 100% Free Delegate Pass exclusively for you.

👉 CLAIM YOUR FREE PASS HERE:
${FREE_PASS_URL}

(The ₹150 registration fee is completely waived. Click the link above, confirm your details, and receive your instant digital entry QR ticket for ₹0.)

📍 EVENT DETAILS:
• Dates: 08th & 09th October 2026 (Thursday & Friday)
• Timings: 09:00 AM – 06:00 PM
• Venue: Whistling Woods International, Film City Complex, Goregaon (East), Mumbai - 400065
• Pass Type: 100% Complimentary Academic Delegation Pass

📲 JOIN THE OFFICIAL WHATSAPP DELEGATE GROUP:
To receive live announcements, workshop bookings, and shuttle details:
${WHATSAPP_URL}

📞 STUDENT & DELEGATION COORDINATORS:
• Nilesh Kumar Gupta: +91 86992 60386
• Satvik Satam: +91 91360 45359
• Sahil Mishra: +91 62066 86464

We look forward to hosting you on campus at Film City!

Warm regards,
Team Celebrate Cinema 2026
Whistling Woods International & CareerBeam
Website: https://whistlingwoods.careerbeam.in
`;
}

async function loadRecipients() {
    let list = [];

    if (source === 'csv') {
        console.log('Loading recipients from paid_pending_screenshots.csv...');
        if (!fs.existsSync('paid_pending_screenshots.csv')) {
            throw new Error('paid_pending_screenshots.csv does not exist.');
        }
        const csvContent = fs.readFileSync('paid_pending_screenshots.csv', 'utf8');
        const csvLines = csvContent.split('\n').filter(Boolean);
        for (let i = 1; i < csvLines.length; i++) {
            const parts = csvLines[i].split(',');
            const id = (parts[0] || '').replace(/['"]/g, '').trim();
            const name = (parts[1] || '').replace(/['"]/g, '').trim();
            const email = (parts[2] || '').replace(/['"]/g, '').trim();
            const phone = (parts[3] || '').replace(/['"]/g, '').trim();
            const college = (parts[4] || '').replace(/['"]/g, '').trim();
            if (email && email.includes('@')) {
                list.push({ id, name, email: cleanEmail(email), phone, college });
            }
        }
    } else {
        console.log('Fetching live unverified registrations without screenshot from Supabase...');
        const pendingRes = await fetch(`${SUPABASE_URL}/rest/v1/registrations?id=like.CCM*&verified=eq.false&or=(payment_screenshot.is.null,payment_screenshot.eq.)&select=id,name,email,phone,college,timestamp&order=timestamp.desc`, {
            headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY }
        });
        if (!pendingRes.ok) throw new Error('Supabase fetch failed: ' + await pendingRes.text());
        list = await pendingRes.json();
    }

    console.log(`Fetched ${list.length} candidate records.`);

    // Deduplicate by clean lowercase email
    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
    const uniqueMap = new Map();
    for (const r of list) {
        const em = cleanEmail(r.email);
        r.email = em;
        if (!em || !EMAIL_REGEX.test(em)) continue;
        if (!uniqueMap.has(em)) {
            uniqueMap.set(em, r);
        }
    }

    let uniqueList = Array.from(uniqueMap.values());
    console.log(`Deduplicated to ${uniqueList.length} valid unique email recipients.`);

    // Cross-check against verified registrations in Supabase so we don't bother attendees who are already verified!
    console.log('Cross-referencing with verified database records to exclude already verified delegates...');
    const verifiedEmails = new Set();
    const emailsToCheck = uniqueList.map(r => r.email.trim().toLowerCase());
    for (let i = 0; i < emailsToCheck.length; i += 20) {
        const chunk = emailsToCheck.slice(i, i + 20);
        const filter = chunk.map(e => `email.eq.${encodeURIComponent(e)}`).join(',');
        const vRes = await fetch(`${SUPABASE_URL}/rest/v1/registrations?verified=eq.true&or=(${filter})&select=email`, {
            headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY }
        });
        if (vRes.ok) {
            const vData = await vRes.json();
            (vData || []).forEach(v => {
                if (v.email) verifiedEmails.add(cleanEmail(v.email));
            });
        }
    }

    const filtered = uniqueList.filter(r => !verifiedEmails.has(r.email.trim().toLowerCase()));
    console.log(`Excluded ${uniqueList.length - filtered.length} delegates who already have a verified pass.`);
    console.log(`Remaining truly unverified recipients to contact: ${filtered.length}`);

    return filtered;
}

(async () => {
    console.log('\n======================================================');
    console.log('   CELEBRATE CINEMA 2026 — TANISHKA FREE PASS SENDER  ');
    console.log('   Target: Unpaid / Missing Payment Screenshot Leads  ');
    console.log('   Free Link: ' + FREE_PASS_URL);
    console.log('======================================================\n');

    if (!RESEND_API_KEY && !isDryRun) {
        console.error('❌ ERROR: RESEND_API_KEY is not set in environment or .env!');
        process.exit(1);
    }

    const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;
    const sentLog = loadSentLog();

    // TEST MODE
    if (testEmail) {
        console.log(`🧪 TEST MODE: Sending 1 preview email to: ${testEmail}\n`);
        const sampleHtml = buildEmailHtml('Test Student', 'Test College');
        const sampleText = buildEmailText('Test Student');
        const subject = '🎟️ Special Complimentary Access: Claim Your Free Delegate Pass for Celebrate Cinema 2026!';

        if (isDryRun) {
            console.log('DRY RUN: Subject:', subject);
            console.log('DRY RUN: From:', FROM_EMAIL);
            console.log('DRY RUN: To:', testEmail);
            console.log('DRY RUN: HTML length:', sampleHtml.length);
            console.log('\n--- TEXT PREVIEW ---');
            console.log(sampleText);
            return;
        }

        const resp = await resend.emails.send({
            from: FROM_EMAIL,
            to: [testEmail],
            subject: subject,
            html: sampleHtml,
            text: sampleText
        });

        if (resp.error) {
            console.error('❌ Test email failed:', resp.error);
        } else {
            console.log(`✓ Test email delivered successfully! Resend Message ID: ${resp.data?.id}`);
        }
        return;
    }

    // Load recipients
    const recipients = await loadRecipients();

    // Exclude previously sent from sentLog
    const pending = recipients.filter(r => {
        const em = r.email.trim().toLowerCase();
        return !sentLog.sent[em];
    });

    console.log(`\n✓ Total unverified recipients: ${recipients.length}`);
    console.log(`✓ Already sent previously: ${recipients.length - pending.length}`);
    console.log(`✓ Pending to send now: ${pending.length}\n`);

    const targets = pending.slice(0, sendLimit);
    if (targets.length < pending.length) {
        console.log(`Notice: Limiting execution to first ${targets.length} recipients (--limit flag).\n`);
    }

    if (isDryRun || !isRealSend) {
        console.log('🔍 PREVIEW / DRY RUN MODE:');
        console.log(`Would dispatch emails to ${targets.length} recipients:\n`);
        targets.forEach((r, idx) => {
            console.log(`  ${idx + 1}. ${r.name || 'Delegate'} <${r.email}> (${r.college || 'No college'}) [${r.id}]`);
        });
        console.log('\nTo send for real, run with: node send_tanishka_free_pass.js --send');
        console.log('Or send a test email first with: node send_tanishka_free_pass.js --test=yourname@gmail.com');
        return;
    }

    // REAL SEND
    console.log(`🚀 Starting live dispatch to ${targets.length} recipients...\n`);
    let sentCount = 0;
    let failCount = 0;

    for (let i = 0; i < targets.length; i++) {
        const r = targets[i];
        const em = r.email.trim().toLowerCase();
        const name = r.name || 'Delegate';
        const subject = '🎟️ Special Complimentary Access: Claim Your Free Delegate Pass for Celebrate Cinema 2026!';
        const html = buildEmailHtml(name, r.college);
        const text = buildEmailText(name);

        process.stdout.write(`[${i + 1}/${targets.length}] Sending to ${em}... `);

        try {
            const resp = await resend.emails.send({
                from: FROM_EMAIL,
                to: [em],
                subject: subject,
                html: html,
                text: text
            });

            if (resp.error) {
                console.log(`FAILED: ${JSON.stringify(resp.error)}`);
                failCount++;
            } else {
                const resendId = resp.data?.id;
                console.log(`✓ OK (ID: ${resendId})`);
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

        // Delay 1000ms to stay within Resend rate limits
        if (i < targets.length - 1) {
            await sleep(1000);
        }
    }

    console.log('\n======================================================');
    console.log(`Execution complete. Successfully sent: ${sentCount} | Failed: ${failCount}`);
    console.log(`Log saved to: ${LOG_FILE}`);
    console.log('======================================================\n');
})();
