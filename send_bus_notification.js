/**
 * CELEBRATE CINEMA 2026 — BUS & SHUTTLE INFORMATION EMAIL DISPATCHER
 * 
 * Sends official campus shuttle timings & pickup point instructions to ALL registered delegates
 * (including standard registrations, FPHR / Nagesh delegation, and HSNC delegation).
 * 
 * Content:
 * - Pickup Point: McDonald’s, Bata, Goregaon East (near Goregaon Railway Station)
 * - Morning Shuttle: Reach by 7:15 AM, first bus leaves at 7:30 AM sharp. Operates 7:30 AM – 1:00 PM.
 * - Return Shuttle: Operates 4:30 PM – 6:00 PM. 6:00 PM is the last bus.
 * - WhatsApp Community Link: https://chat.whatsapp.com/DzA3LRSfW44Ap6viArkjI7
 * 
 * Usage:
 *   node send_bus_notification.js --dry
 *   node send_bus_notification.js --test=yourname@gmail.com
 *   node send_bus_notification.js --send
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
} catch (e) {}

const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJueWxweGZqaHhwbWp3b2xzcWNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwOTgwMDEsImV4cCI6MjEwMzY3NDAwMX0.ms0YzXZ2Lb-VFpqEjD9BrAYzDp81ZklQwCwNnkyP6U8';
const SUPABASE_URL = 'https://rnylpxfjhxpmjwolsqcd.supabase.co';
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Celebrate Cinema <confirmations@careerbeam.in>';
const WHATSAPP_URL = 'https://chat.whatsapp.com/DzA3LRSfW44Ap6viArkjI7';
const LOG_FILE = path.join(__dirname, 'sent_bus_notification_log.json');

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
        } catch (e) {}
    }
    return { sent: {}, totalSent: 0, lastUpdated: null };
}

function saveSentLog(log) {
    log.lastUpdated = new Date().toISOString();
    log.totalSent = Object.keys(log.sent).length;
    fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2));
}

function cleanEmail(em) {
    let email = String(em || '').trim().toLowerCase();
    email = email.replace(/@gamil\.com$/, '@gmail.com');
    email = email.replace(/@g-mail\.com$/, '@gmail.com');
    email = email.replace(/@gnail\.com$/, '@gmail.com');
    email = email.replace(/@gamail\.com$/, '@gmail.com');
    email = email.replace(/@gmail\.co$/, '@gmail.com');
    email = email.replace(/@gmail$/, '@gmail.com');
    email = email.replace(/@gmail\.comt$/, '@gmail.com');
    email = email.replace(/\.@gmail\.com$/, '@gmail.com');
    email = email.replace(/@92gmail\.com$/, '92@gmail.com');
    return email;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

function isValidEmail(em) {
    if (!em || !EMAIL_REGEX.test(em)) return false;
    if (em.includes('test@') || em.includes('@example.com') || em.includes('dummy')) return false;
    return true;
}

function buildBusEmailHtml(recipient) {
    const name = (recipient.name || '').trim() || 'Delegate';
    const ticketId = recipient.id || 'CC26-PASS';

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Important Bus Information – Celebrate Cinema 2026</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0914; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f3f0f7; -webkit-font-smoothing: antialiased;">
    <div style="padding: 24px 12px; background-color: #0b0914;">
        <div style="max-width: 620px; margin: 0 auto; background: #140f21; border: 1px solid rgba(212, 168, 67, 0.4); border-radius: 14px; overflow: hidden; box-shadow: 0 12px 36px rgba(0,0,0,0.65);">
            
            <!-- Header Banner -->
            <div style="background: linear-gradient(135deg, #24163f 0%, #110c1c 100%); padding: 34px 24px 28px; text-align: center; border-bottom: 2px solid #d4a843;">
                <div style="display: inline-block; background: rgba(212, 168, 67, 0.18); color: #f7e7c5; border: 1px solid #d4a843; border-radius: 20px; padding: 4px 16px; font-size: 11.5px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 12px;">
                    🚌 Official Campus Transport Advisory
                </div>
                <h1 style="color: #ffffff; font-size: 24px; font-weight: 900; margin: 0 0 6px; letter-spacing: 0.5px; line-height: 1.3;">
                    Important Bus Information
                </h1>
                <p style="color: #d4a843; font-size: 14.5px; font-weight: 700; margin: 0; letter-spacing: 0.5px;">
                    Celebrate Cinema 2026 • Whistling Woods International
                </p>
            </div>

            <!-- Body Content -->
            <div style="padding: 28px 24px; line-height: 1.6; color: #d6cee3; font-size: 14.5px;">
                <p style="margin: 0 0 16px; font-size: 16px;">
                    Dear <strong style="color: #ffffff;">${name}</strong>,
                </p>

                <p style="margin: 0 0 20px;">
                    Please find below the official schedule and pickup point coordinates for the <strong>Free Campus Shuttle Bus Service</strong> operating between <strong>Goregaon Railway Station</strong> and <strong>Whistling Woods International (Film City)</strong> today.
                </p>

                <!-- Pickup Point Box -->
                <div style="background: linear-gradient(135deg, rgba(212, 168, 67, 0.15) 0%, rgba(141, 106, 174, 0.15) 100%); border-left: 4px solid #d4a843; border-radius: 8px; padding: 18px 20px; margin-bottom: 22px;">
                    <div style="font-size: 12px; font-weight: 800; color: #d4a843; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">
                        📍 Pickup Point Location
                    </div>
                    <div style="font-size: 16.5px; font-weight: 800; color: #ffffff; line-height: 1.4;">
                        McDonald’s / Bata, Goregaon East
                    </div>
                    <div style="font-size: 13.5px; color: #f3e8ff; margin-top: 4px;">
                        (Just 2 minutes walk from Goregaon Railway Station East exit)
                    </div>
                </div>

                <!-- Shuttle Timing Details Table -->
                <div style="background: rgba(26, 20, 42, 0.7); border: 1px solid rgba(141, 106, 174, 0.25); border-radius: 10px; padding: 20px; margin-bottom: 24px;">
                    <div style="font-size: 14px; font-weight: 800; color: #ffffff; margin-bottom: 14px; display: flex; align-items: center; gap: 8px;">
                        ⏰ Shuttle Bus Timings &amp; Departure Schedule
                    </div>

                    <!-- Morning Section -->
                    <div style="margin-bottom: 16px; padding-bottom: 14px; border-bottom: 1px dashed rgba(255, 255, 255, 0.1);">
                        <div style="font-size: 13.5px; font-weight: 800; color: #4ade80; margin-bottom: 6px;">
                            🌅 Morning Shuttle (To Campus):
                        </div>
                        <ul style="margin: 0; padding-left: 20px; font-size: 13.5px; color: #e9d5ff; line-height: 1.65;">
                            <li>Students should reach the pickup point by <strong>7:15 AM</strong>.</li>
                            <li>The first bus will leave at <strong>7:30 AM sharp</strong>.</li>
                            <li>Buses will operate continuously from <strong>7:30 AM to 1:00 PM</strong>.</li>
                        </ul>
                    </div>

                    <!-- Return Section -->
                    <div>
                        <div style="font-size: 13.5px; font-weight: 800; color: #f59e0b; margin-bottom: 6px;">
                            🔄 Return Shuttle (Back to Station):
                        </div>
                        <ul style="margin: 0; padding-left: 20px; font-size: 13.5px; color: #e9d5ff; line-height: 1.65;">
                            <li>Return buses will operate from <strong>4:30 PM to 6:00 PM</strong>.</li>
                            <li><strong>6:00 PM will be the last bus</strong> leaving from the campus.</li>
                        </ul>
                    </div>
                </div>

                <!-- Warning Advisory -->
                <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.35); border-radius: 8px; padding: 14px 18px; margin-bottom: 24px; font-size: 13.5px; color: #fca5a5;">
                    ⚠️ <strong>Important Advisory:</strong> Please make sure you reach the pickup point on time and plan your travel accordingly to ensure smooth boarding.
                </div>

                <!-- WhatsApp Community CTA Button -->
                <div style="background: rgba(37, 211, 102, 0.12); border: 2px dashed #25D366; border-radius: 12px; padding: 22px 18px; text-align: center; margin: 26px 0;">
                    <div style="font-size: 17px; font-weight: 800; color: #ffffff; margin-bottom: 6px;">
                        📲 Need Real-Time Shuttle Updates?
                    </div>
                    <p style="font-size: 13.5px; color: #a7f3d0; margin: 0 0 16px; line-height: 1.5;">
                        Join our official WhatsApp group for live bus departure alerts, queue updates, and helpdesk support:
                    </p>
                    <a href="${WHATSAPP_URL}" target="_blank" style="display: inline-block; background: #25D366; color: #ffffff !important; text-decoration: none; font-weight: 800; font-size: 14.5px; padding: 13px 32px; border-radius: 30px; box-shadow: 0 6px 18px rgba(37, 211, 102, 0.4); text-transform: uppercase; letter-spacing: 0.5px;">
                        👉 Click Here to Join WhatsApp Group
                    </a>
                    <div style="margin-top: 12px; font-size: 12px; color: #6ee7b7;">
                        Direct Link: <a href="${WHATSAPP_URL}" style="color: #25D366; text-decoration: underline;">${WHATSAPP_URL}</a>
                    </div>
                </div>

                <!-- Gate Entry Reminder -->
                <div style="background: rgba(139, 92, 246, 0.1); border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 10px; padding: 16px 20px; margin-bottom: 24px;">
                    <div style="font-size: 13.5px; font-weight: 700; color: #c4b5fd; margin-bottom: 6px;">
                        🎟️ Gate Entry Check-in Reminder:
                    </div>
                    <p style="margin: 0; font-size: 13px; color: #e9d5ff; line-height: 1.55;">
                        Your Registration Pass ID is <strong style="color: #4ade80;">${ticketId}</strong>. When you reach Whistling Woods International, simply show your digital Boarding Pass or QR code on your phone at Gate 1 or Gate 2 for immediate entry.
                    </p>
                </div>

                <p style="margin: 0 0 18px; font-size: 15px; color: #ffffff; font-weight: 700;">
                    We look forward to hosting you for an unforgettable Day 2 at Whistling Woods International! 🎬✨
                </p>

                <!-- Signoff -->
                <div style="border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 16px; font-size: 13px; color: #b8acc9;">
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

function buildBusEmailText(recipient) {
    const name = (recipient.name || '').trim() || 'Delegate';
    const ticketId = recipient.id || 'CC26-PASS';

    return `Dear ${name},

IMPORTANT BUS INFORMATION – CELEBRATE CINEMA 2026 🚌

📍 PICKUP POINT:
McDonald’s / Bata, Goregaon East (near Goregaon Railway Station East exit)

⏰ MORNING SHUTTLE:
• Students should reach the pickup point by 7:15 AM.
• The first bus will leave at 7:30 AM sharp.
• Buses will operate continuously from 7:30 AM to 1:00 PM.

🔄 RETURN SHUTTLE:
• Return buses will operate from 4:30 PM to 6:00 PM.
• 6:00 PM will be the last bus leaving from the campus.

Please make sure you reach the pickup point on time and plan your travel accordingly.

📲 JOIN OFFICIAL WHATSAPP COMMUNITY FOR REAL-TIME BUS UPDATES:
${WHATSAPP_URL}

Your Pass ID: ${ticketId}
Show this pass on your phone at Gate 1 or Gate 2 for instant entry.

See you on campus at Film City!

Warm regards,
Team Celebrate Cinema 2026
Whistling Woods International & CareerBeam`;
}

async function fetchAllRecipients() {
    console.log('Fetching all registered delegates from Supabase (including Nagesh & HSNC)...');
    const fields = 'id,name,email,college,verified,attended,referred_by';
    const PAGE_SIZE = 1000;
    let from = 0;
    let allRecords = [];

    while (true) {
        const url = `${SUPABASE_URL}/rest/v1/registrations?id=not.eq.CONFIG_COLLEGES&select=${fields}&order=timestamp.asc&offset=${from}&limit=${PAGE_SIZE}`;
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
        if (!data || data.length === 0) break;
        allRecords.push(...data);
        if (data.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
    }

    console.log(`✓ Fetched ${allRecords.length} total records from Supabase.`);
    return allRecords;
}

(async () => {
    console.log('\n================================================================');
    console.log('   CELEBRATE CINEMA 2026 — BUS SCHEDULE & ADVISORY EMAIL BLAST   ');
    console.log('   Audience: ALL Registered (Standard + Nagesh/FPHR + HSNC)      ');
    console.log('   Subject: Important Bus Information – Celebrate Cinema 2026 🚌  ');
    console.log('================================================================\n');

    if (!RESEND_API_KEY && !isDryRun) {
        console.error('❌ ERROR: RESEND_API_KEY is not set in environment or .env!');
        process.exit(1);
    }

    const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;
    const sentLog = loadSentLog();

    // TEST MODE
    if (testEmail) {
        console.log(`🧪 TEST MODE ACTIVATED`);
        console.log(`Sending sample Bus Info email to: ${testEmail}`);
        const sampleRecipient = {
            id: 'WWI-BUS-TEST',
            name: 'Test Delegate',
            email: testEmail,
            college: 'Whistling Woods International'
        };

        const html = buildBusEmailHtml(sampleRecipient);
        const text = buildBusEmailText(sampleRecipient);
        const subject = 'Important Bus Information – Celebrate Cinema 2026 🚌';

        if (isDryRun) {
            console.log('DRY RUN: Subject:', subject);
            console.log('DRY RUN: From:', FROM_EMAIL);
            console.log('DRY RUN: To:', testEmail);
            console.log('DRY RUN: Pickup Point: McDonald’s, Bata, Goregaon East');
            return;
        }

        try {
            const resp = await resend.emails.send({
                from: FROM_EMAIL,
                to: testEmail,
                subject: subject,
                html: html,
                text: text
            });
            console.log('✓ Test email sent successfully! Response ID:', resp.data?.id || resp);
        } catch (e) {
            console.error('❌ Error sending test email:', e.message);
        }
        return;
    }

    // 1. Fetch all records
    const rawList = await fetchAllRecipients();

    // 2. Clean, deduplicate by email
    const emailToReg = new Map();
    for (const r of rawList) {
        const em = cleanEmail(r.email);
        r.email = em;
        if (!isValidEmail(em)) continue;
        if (!emailToReg.has(em)) {
            emailToReg.set(em, r);
        }
    }

    const uniqueList = Array.from(emailToReg.values());
    console.log(`✓ Deduplicated to ${uniqueList.length} unique recipient emails.`);

    // 3. Filter out anyone already in sent_bus_notification_log.json
    const pendingList = uniqueList.filter(r => {
        const em = r.email.trim().toLowerCase();
        return !sentLog.sent || !sentLog.sent[em];
    });

    const alreadySentCount = uniqueList.length - pendingList.length;
    console.log(`✓ Already received Bus notification previously: ${alreadySentCount}`);
    console.log(`✓ Pending to receive Bus notification now: ${pendingList.length}\n`);

    if (isDryRun) {
        console.log(`🔎 DRY RUN SUMMARY:`);
        console.log(`  - Total valid unique delegates: ${uniqueList.length}`);
        console.log(`  - Already sent: ${alreadySentCount}`);
        console.log(`  - Will receive Bus notification: ${pendingList.length}`);
        console.log(`  - First 5 recipients sample:`);
        pendingList.slice(0, 5).forEach((r, idx) => {
            console.log(`    ${idx + 1}. [${r.id}] ${r.name} <${r.email}> (${r.college || 'General'})`);
        });
        console.log('\nTo execute live blast, run:');
        console.log('  node send_bus_notification.js --send');
        return;
    }

    if (!isRealSend) {
        console.log('⚠️ Please specify --send to trigger actual email dispatch, or --dry for preview.');
        return;
    }

    // Execute live sending
    const targetList = pendingList.slice(0, sendLimit);
    console.log(`🚀 Starting dispatch of Bus Information email to ${targetList.length} delegates...`);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < targetList.length; i++) {
        const r = targetList[i];
        const em = r.email.trim().toLowerCase();

        try {
            const html = buildBusEmailHtml(r);
            const text = buildBusEmailText(r);
            const subject = 'Important Bus Information – Celebrate Cinema 2026 🚌';

            const resp = await resend.emails.send({
                from: FROM_EMAIL,
                to: em,
                subject: subject,
                html: html,
                text: text
            });

            if (resp.error) {
                console.error(`[${i + 1}/${targetList.length}] ❌ ${r.id} (${em}): ${resp.error.message}`);
                failCount++;
            } else {
                console.log(`[${i + 1}/${targetList.length}] ✓ OK: ${r.id} (${em}) -> ${resp.data?.id}`);
                sentLog.sent[em] = {
                    id: r.id,
                    name: r.name,
                    timestamp: new Date().toISOString(),
                    resendId: resp.data?.id
                };
                successCount++;
            }
        } catch (e) {
            console.error(`[${i + 1}/${targetList.length}] ❌ Exception ${r.id} (${em}): ${e.message}`);
            failCount++;
        }

        // Save log every 10 emails
        if ((i + 1) % 10 === 0) {
            saveSentLog(sentLog);
        }

        // Rate limit: ~130ms spacing (< 8 req/sec safely below Resend 10 req/s limit)
        await sleep(130);
    }

    saveSentLog(sentLog);
    console.log('\n================================================================');
    console.log(`🎉 BUS INFORMATION DISPATCH COMPLETE!`);
    console.log(`  - Successfully sent: ${successCount}`);
    console.log(`  - Failed: ${failCount}`);
    console.log(`  - Total recorded in log: ${Object.keys(sentLog.sent).length}`);
    console.log('================================================================\n');
})();
