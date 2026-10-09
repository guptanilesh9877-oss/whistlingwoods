/**
 * CELEBRATE CINEMA 2026 — DAY 2 INVITATION & TOMORROW REMINDER EMAIL DISPATCHER
 * 
 * Sends an energetic Day 2 invitation & recap email to all registered delegates:
 * "Today was BANG ON! 🔥 Join Us Tomorrow for Day 2 at Celebrate Cinema 2026"
 * 
 * Features:
 * - Highlights Day 1 mega-success (1,400+ delegates on campus).
 * - Invites everyone to attend Day 2 (Friday, 9th October, gates open 8:30 AM).
 * - Prominent WhatsApp Community link (https://chat.whatsapp.com/DzA3LRSfW44Ap6viArkjI7).
 * - Shuttle bus guidelines and entry pass instructions.
 * - Persistent logging in sent_tomorrow_reminder_log.json to prevent double sends.
 * 
 * Usage:
 *   node send_tomorrow_reminder.js --dry
 *   node send_tomorrow_reminder.js --test=yourname@gmail.com
 *   node send_tomorrow_reminder.js --send
 *   node send_tomorrow_reminder.js --send --limit=100
 */

const fs = require('fs');
const path = require('path');
const { Resend } = require('resend');

// Load environment variables from .env
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
const LOG_FILE = path.join(__dirname, 'sent_tomorrow_reminder_log.json');

// CLI Arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry');
const isRealSend = args.includes('--send');
const testArg = args.find(a => a.startsWith('--test='));
const testEmail = testArg ? testArg.split('=')[1].trim() : null;
const limitArg = args.find(a => a.startsWith('--limit='));
const sendLimit = limitArg ? parseInt(limitArg.split('=')[1], 10) : Infinity;
const batchSizeArg = args.find(a => a.startsWith('--batch='));
const BATCH_SIZE = batchSizeArg ? parseInt(batchSizeArg.split('=')[1], 10) : 50;

const sleep = ms => new Promise(res => setTimeout(res, ms));

function loadSentLog() {
    if (fs.existsSync(LOG_FILE)) {
        try {
            return JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
        } catch (e) {
            console.warn('⚠️ Could not parse existing log file, initializing fresh log.');
        }
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

function buildTomorrowReminderEmailHtml(recipient) {
    const name = (recipient.name || '').trim() || 'Delegate';
    const college = (recipient.college || '').trim() || 'Institution Delegate';
    const ticketId = recipient.id || 'CC26-PASS';

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Day 1 Was BANG ON! 🔥 Join Us Tomorrow for Day 2 at Celebrate Cinema 2026</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0914; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f3f0f7; -webkit-font-smoothing: antialiased;">
    <div style="padding: 24px 12px; background-color: #0b0914;">
        <div style="max-width: 620px; margin: 0 auto; background: #140f21; border: 1px solid rgba(212, 168, 67, 0.4); border-radius: 14px; overflow: hidden; box-shadow: 0 12px 36px rgba(0,0,0,0.65);">
            
            <!-- Header Banner -->
            <div style="background: linear-gradient(135deg, #281446 0%, #110c1c 100%); padding: 36px 24px 28px; text-align: center; border-bottom: 2px solid #d4a843;">
                <div style="display: inline-block; background: rgba(239, 68, 68, 0.18); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.45); border-radius: 20px; padding: 4px 16px; font-size: 11.5px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 14px;">
                    🔥 DAY 1 WAS BANG ON! • SEE YOU TOMORROW
                </div>
                <h1 style="color: #ffffff; font-size: 25px; font-weight: 900; margin: 0 0 6px; letter-spacing: 0.5px; line-height: 1.25;">
                    Celebrate Cinema 2026
                </h1>
                <p style="color: #d4a843; font-size: 14.5px; font-weight: 700; margin: 0; letter-spacing: 0.5px;">
                    The Academic Trek at Whistling Woods International
                </p>
            </div>

            <!-- Body Content -->
            <div style="padding: 28px 24px; line-height: 1.6; color: #d6cee3; font-size: 14.5px;">
                <p style="margin: 0 0 16px; font-size: 16px;">
                    Dear <strong style="color: #ffffff;">${name}</strong>,
                </p>

                <!-- Bang On Banner Callout -->
                <div style="background: linear-gradient(135deg, rgba(212, 168, 67, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%); border-left: 4px solid #d4a843; border-radius: 8px; padding: 18px 20px; margin-bottom: 22px;">
                    <div style="font-size: 17px; font-weight: 800; color: #ffffff; margin-bottom: 6px;">
                        🎬 Today was Absolutely BANG ON!
                    </div>
                    <p style="margin: 0; font-size: 14px; color: #f3e8ff; line-height: 1.55;">
                        Over <strong>1,400+ delegates</strong> gathered at Film City today for film sets, camera workshops, live music labs, VR/animation demos, and celebrity interactions! The energy on campus was electrifying!
                    </p>
                </div>

                <p style="margin: 0 0 16px;">
                    Whether you attended Day 1 or are planning to visit tomorrow — <strong>Day 2 (Friday, 9th October) is going to be even bigger and more exciting!</strong>
                </p>

                <!-- WhatsApp Community CTA Button (High Visibility) -->
                <div style="background: rgba(37, 211, 102, 0.12); border: 2px dashed #25D366; border-radius: 12px; padding: 22px 18px; text-align: center; margin: 26px 0;">
                    <div style="font-size: 17px; font-weight: 800; color: #ffffff; margin-bottom: 6px;">
                        📲 Join the Official WhatsApp Delegate Community
                    </div>
                    <p style="font-size: 13.5px; color: #a7f3d0; margin: 0 0 16px; line-height: 1.5;">
                        Get live notifications for tomorrow’s celebrity schedule, masterclass seat reservations, campus map, and shuttle bus timings:
                    </p>
                    <a href="${WHATSAPP_URL}" target="_blank" style="display: inline-block; background: #25D366; color: #ffffff !important; text-decoration: none; font-weight: 800; font-size: 15px; padding: 14px 34px; border-radius: 30px; box-shadow: 0 6px 18px rgba(37, 211, 102, 0.4); text-transform: uppercase; letter-spacing: 0.5px;">
                        👉 Click Here to Join WhatsApp Group
                    </a>
                    <div style="margin-top: 12px; font-size: 12px; color: #6ee7b7;">
                        Direct Link: <a href="${WHATSAPP_URL}" style="color: #25D366; text-decoration: underline;">${WHATSAPP_URL}</a>
                    </div>
                </div>

                <!-- Event Snapshot for Tomorrow -->
                <div style="background: rgba(26, 20, 42, 0.7); border: 1px solid rgba(141, 106, 174, 0.25); border-radius: 10px; padding: 18px 20px; margin-bottom: 24px;">
                    <div style="font-size: 13.5px; font-weight: 800; color: #d4a843; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
                        📍 Tomorrow's Details & Campus Schedule
                    </div>
                    <table style="width: 100%; border-collapse: collapse; font-size: 13.5px;">
                        <tr>
                            <td style="padding: 6px 0; color: #a69bb5; width: 28%;">📅 Date:</td>
                            <td style="padding: 6px 0; color: #ffffff; font-weight: 700;">Tomorrow, Friday, 09th October 2026</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px 0; color: #a69bb5;">⏰ Timings:</td>
                            <td style="padding: 6px 0; color: #ffffff; font-weight: 700;">Gates open at 8:30 AM • Sessions: 9:00 AM – 6:00 PM</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px 0; color: #a69bb5;">🏛️ Venue:</td>
                            <td style="padding: 6px 0; color: #ffffff; font-weight: 700;">Whistling Woods International, Film City, Goregaon (East), Mumbai</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px 0; color: #a69bb5;">🎟️ Pass ID:</td>
                            <td style="padding: 6px 0; color: #4ade80; font-weight: 700;">${ticketId}</td>
                        </tr>
                    </table>
                </div>

                <!-- How to Enter -->
                <div style="background: rgba(139, 92, 246, 0.1); border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 10px; padding: 16px 20px; margin-bottom: 24px;">
                    <div style="font-size: 14px; font-weight: 700; color: #c4b5fd; margin-bottom: 8px;">
                        🎫 How to Enter at the Gates:
                    </div>
                    <ol style="margin: 0; padding-left: 20px; font-size: 13.5px; color: #e9d5ff; line-height: 1.6;">
                        <li>Reach <strong>Whistling Woods International</strong> (Film City Complex, Goregaon East).</li>
                        <li>Head to <strong>Registration Gate 1 or Gate 2</strong>.</li>
                        <li>Show your <strong>Pass ID (${ticketId})</strong> or your Boarding Pass email on your phone.</li>
                        <li>Collect your official wristband and enter the festival!</li>
                    </ol>
                </div>

                <!-- Shuttle Bus Info -->
                <div style="background: rgba(255, 255, 255, 0.04); border-radius: 8px; padding: 14px 18px; margin-bottom: 24px; font-size: 13px; color: #b8acc9;">
                    <strong style="color: #ffffff;">🚌 Free Campus Shuttle Bus Service:</strong><br>
                    Dedicated shuttles are operating throughout the day between <strong>Goregaon Railway Station (East)</strong> and the Whistling Woods campus. Look for the "Celebrate Cinema 2026" boards!
                </div>

                <p style="margin: 0 0 16px; font-size: 14.5px;">
                    Get ready for another unforgettable day of cinema, creativity, and career insights.
                </p>

                <p style="margin: 0 0 20px; font-size: 15px; color: #ffffff; font-weight: 700;">
                    See you tomorrow morning at Whistling Woods International! 🎬✨
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
                <p style="margin: 0;">Need assistance? WhatsApp Community: <a href="${WHATSAPP_URL}" style="color: #25D366; text-decoration: none;">Join Here</a></p>
            </div>
        </div>
    </div>
</body>
</html>`;
}

function buildTomorrowReminderEmailText(recipient) {
    const name = (recipient.name || '').trim() || 'Delegate';
    const ticketId = recipient.id || 'CC26-PASS';

    return `Dear ${name},

DAY 1 WAS ABSOLUTELY BANG ON! 🔥
Over 1,400+ delegates gathered at Whistling Woods International today for film sets, sound labs, VR exhibitions, and celebrity masterclasses!

JOIN US TOMORROW FOR DAY 2 (FRIDAY, 09TH OCTOBER 2026):
Gates Open: 8:30 AM
Sessions: 9:00 AM – 6:00 PM
Venue: Whistling Woods International, Film City, Goregaon (East), Mumbai
Pass ID: ${ticketId}

👉 JOIN THE OFFICIAL WHATSAPP COMMUNITY:
${WHATSAPP_URL}
(Get real-time celebrity schedule drops, workshop bookings, and shuttle coordinates!)

FREE SHUTTLE BUS SERVICE:
Operating between Goregaon Railway Station (East) and Whistling Woods International throughout the day.

See you tomorrow morning at Film City!

Warm regards,
Team Celebrate Cinema 2026
Whistling Woods International & CareerBeam`;
}

async function fetchAllRegisteredDelegates() {
    console.log('Fetching all registered delegates from Supabase...');
    const fields = 'id,name,email,college,verified,attended';
    const PAGE_SIZE = 1000;
    let from = 0;
    let allRecords = [];

    while (true) {
        const to = from + PAGE_SIZE - 1;
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

    console.log(`✓ Fetched ${allRecords.length} total registration records from Supabase.`);
    return allRecords;
}

(async () => {
    console.log('\n================================================================');
    console.log('   CELEBRATE CINEMA 2026 — DAY 2 INVITATION & TOMORROW REMINDER ');
    console.log('   Subject: Day 1 was BANG ON! See you TOMORROW for Day 2       ');
    console.log('   Includes: WhatsApp Group Link + Shuttle + Gate Entry Guide    ');
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
        console.log(`Sending sample Day 2 reminder email to: ${testEmail}`);
        const sampleRecipient = {
            id: 'WWI-DAY2-TEST',
            name: 'Test Delegate',
            email: testEmail,
            college: 'Whistling Woods International'
        };

        const html = buildTomorrowReminderEmailHtml(sampleRecipient);
        const text = buildTomorrowReminderEmailText(sampleRecipient);
        const subject = '🔥 Day 1 was BANG ON! See you TOMORROW for Day 2 at Celebrate Cinema 2026 | Whistling Woods';

        if (isDryRun) {
            console.log('DRY RUN: Subject:', subject);
            console.log('DRY RUN: From:', FROM_EMAIL);
            console.log('DRY RUN: To:', testEmail);
            console.log('DRY RUN: WhatsApp Link:', WHATSAPP_URL);
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

    // 1. Fetch all registered delegates
    const rawList = await fetchAllRegisteredDelegates();

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
    console.log(`✓ Deduplicated to ${uniqueList.length} valid unique delegate emails.`);

    // 3. Filter out anyone already in sent_tomorrow_reminder_log.json
    const pendingList = uniqueList.filter(r => {
        const em = r.email.trim().toLowerCase();
        return !sentLog.sent || !sentLog.sent[em];
    });

    const alreadySentCount = uniqueList.length - pendingList.length;
    console.log(`✓ Already received Day 2 reminder previously: ${alreadySentCount}`);
    console.log(`✓ Pending to receive Day 2 reminder now: ${pendingList.length}\n`);

    if (isDryRun) {
        console.log(`🔎 DRY RUN SUMMARY:`);
        console.log(`  - Total valid unique delegates: ${uniqueList.length}`);
        console.log(`  - Already sent: ${alreadySentCount}`);
        console.log(`  - Will receive Day 2 reminder: ${pendingList.length}`);
        console.log(`  - First 5 recipients sample:`);
        pendingList.slice(0, 5).forEach((r, idx) => {
            console.log(`    ${idx + 1}. [${r.id}] ${r.name} <${r.email}> (${r.college})`);
        });
        console.log('\nTo execute live blast, run:');
        console.log('  node send_tomorrow_reminder.js --send');
        console.log('Or with a limit:');
        console.log('  node send_tomorrow_reminder.js --send --limit=100');
        return;
    }

    if (!isRealSend) {
        console.log('⚠️ Please specify --send to trigger actual email dispatch, or --dry for preview.');
        return;
    }

    // Execute live sending in controlled batches
    const targetList = pendingList.slice(0, sendLimit);
    console.log(`🚀 Starting dispatch of Day 2 reminder to ${targetList.length} delegates...`);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < targetList.length; i++) {
        const r = targetList[i];
        const em = r.email.trim().toLowerCase();

        try {
            const html = buildTomorrowReminderEmailHtml(r);
            const text = buildTomorrowReminderEmailText(r);
            const subject = '🔥 Day 1 was BANG ON! See you TOMORROW for Day 2 at Celebrate Cinema 2026 | Whistling Woods';

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

        // Rate limit spacing: ~120ms delay (safely within Resend 10 req/s limit)
        await sleep(130);
    }

    saveSentLog(sentLog);
    console.log('\n================================================================');
    console.log(`🎉 DISPATCH COMPLETE!`);
    console.log(`  - Successfully sent: ${successCount}`);
    console.log(`  - Failed: ${failCount}`);
    console.log(`  - Total recorded in log: ${Object.keys(sentLog.sent).length}`);
    console.log('================================================================\n');
})();
