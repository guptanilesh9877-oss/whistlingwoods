/**
 * CELEBRATE CINEMA 2026 — WHATSAPP GROUP REMINDER EMAIL DISPATCHER
 * 
 * Sends an urgent reminder email to ALL registered students (both verified & unverified)
 * instructing them to join the official WhatsApp Community group for Celebrate Cinema 2026.
 *
 * Usage:
 *   node send_whatsapp_reminder.js --dry
 *   node send_whatsapp_reminder.js --test=yourname@gmail.com
 *   node send_whatsapp_reminder.js --send
 *   node send_whatsapp_reminder.js --send --limit=100
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
const LOG_FILE = path.join(__dirname, 'sent_whatsapp_reminder_log.json');

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

function buildReminderEmailHtml(recipient) {
    const name = (recipient.name || '').trim() || 'Delegate';
    const college = (recipient.college || '').trim() || 'Delegate Institution';
    const isVerified = recipient.verified === true;
    const ticketId = recipient.id || 'REGISTERED';

    const statusBadge = isVerified
        ? `<span style="display: inline-block; background: rgba(34, 197, 94, 0.18); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.4); border-radius: 4px; padding: 3px 10px; font-weight: 700; font-size: 12px;">✓ Verified Pass Confirmed</span>`
        : `<span style="display: inline-block; background: rgba(234, 179, 8, 0.18); color: #facc15; border: 1px solid rgba(234, 179, 8, 0.4); border-radius: 4px; padding: 3px 10px; font-weight: 700; font-size: 12px;">⚡ Registered • Join Group for Fast-Track Entry</span>`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Urgent Reminder: Join Official Delegate WhatsApp Group — Celebrate Cinema 2026</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0914; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f3f0f7; -webkit-font-smoothing: antialiased;">
    <div style="padding: 24px 12px; background-color: #0b0914;">
        <div style="max-width: 620px; margin: 0 auto; background: #140f21; border: 1px solid rgba(212, 168, 67, 0.4); border-radius: 14px; overflow: hidden; box-shadow: 0 12px 36px rgba(0,0,0,0.65);">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #24163f 0%, #110c1c 100%); padding: 32px 24px 26px; text-align: center; border-bottom: 2px solid #d4a843;">
                <div style="display: inline-block; background: rgba(212, 168, 67, 0.18); color: #f7e7c5; border: 1px solid #d4a843; border-radius: 20px; padding: 5px 16px; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 12px;">
                    🚨 OFFICIAL DELEGATE UPDATE • JOIN WHATSAPP COMMUNITY
                </div>
                <h1 style="color: #ffffff; font-size: 24px; font-weight: 800; margin: 0 0 6px; letter-spacing: 0.5px; line-height: 1.3;">
                    Celebrate Cinema 2026
                </h1>
                <p style="color: #d4a843; font-size: 14px; font-weight: 600; margin: 0; letter-spacing: 0.5px;">
                    The Academic Trek at Whistling Woods International
                </p>
            </div>

            <!-- Main Content -->
            <div style="padding: 28px 24px; line-height: 1.6; color: #d6cee3; font-size: 14.5px;">
                <p style="margin: 0 0 14px; font-size: 16px;">Dear <strong style="color: #ffffff;">${name}</strong>,</p>
                <p style="margin: 0 0 16px;">
                    We are gearing up to welcome you to <strong>Celebrate Cinema 2026 – The Academic Trek</strong> at <strong>Whistling Woods International (Film City, Goregaon, Mumbai)</strong> on <strong>8th &amp; 9th October 2026</strong>!
                </p>
                <p style="margin: 0 0 22px;">
                    To make sure your arrival is smooth, your entry gate pass is coordinated seamlessly, and you don’t miss live schedule changes, workshop token drops, and celebrity masterclass announcements, <strong>it is mandatory for all delegates to join the official WhatsApp Community group</strong>.
                </p>

                <!-- BIG WHATSAPP CALL TO ACTION (TOP PRIORITY) -->
                <div style="background: linear-gradient(135deg, rgba(37, 211, 102, 0.15) 0%, rgba(20, 15, 33, 0.95) 100%); border: 2px solid #25D366; border-radius: 12px; padding: 24px 20px; text-align: center; margin-bottom: 26px; box-shadow: 0 6px 20px rgba(37, 211, 102, 0.2);">
                    <div style="display: inline-block; background: #25D366; color: #0b0914; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; padding: 3px 12px; border-radius: 12px; margin-bottom: 10px;">
                        Immediate Action Required
                    </div>
                    <h2 style="color: #ffffff; font-size: 18px; font-weight: 800; margin: 0 0 8px;">
                        📲 Official Celebrate Cinema 2026 WhatsApp Group
                    </h2>
                    <p style="color: #d6cee3; font-size: 13.5px; margin: 0 0 18px; line-height: 1.5;">
                        Join thousands of student delegates and our on-ground coordination team for live announcements, gate pass clearance, and shuttle bus updates:
                    </p>
                    <a href="${WHATSAPP_URL}" target="_blank" style="display: inline-block; background: #25D366; color: #ffffff !important; text-decoration: none; font-weight: 800; font-size: 15px; padding: 14px 32px; border-radius: 30px; box-shadow: 0 4px 18px rgba(37, 211, 102, 0.45); letter-spacing: 0.3px;">
                        👉 Click Here to Join WhatsApp Group
                    </a>
                    <div style="margin-top: 14px; font-size: 12px; color: #a69bb5;">
                        Direct link: <a href="${WHATSAPP_URL}" target="_blank" style="color: #25D366; text-decoration: underline; word-break: break-all;">${WHATSAPP_URL}</a>
                    </div>
                </div>

                <!-- Registration Snapshot -->
                <div style="background: rgba(26, 20, 42, 0.7); border: 1px solid rgba(141, 106, 174, 0.3); border-radius: 8px; padding: 16px 20px; margin-bottom: 24px;">
                    <div style="font-size: 12px; font-weight: 700; color: #d4a843; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px;">
                        📋 Delegate Registration Summary
                    </div>
                    <table style="width: 100%; border-collapse: collapse; font-size: 13.5px;">
                        <tr>
                            <td style="padding: 5px 0; color: #a69bb5; width: 35%; font-weight: 600;">Delegate Name:</td>
                            <td style="padding: 5px 0; color: #ffffff; font-weight: 700;">${name}</td>
                        </tr>
                        <tr>
                            <td style="padding: 5px 0; color: #a69bb5; font-weight: 600;">Ticket / Reg ID:</td>
                            <td style="padding: 5px 0; color: #ffffff; font-family: monospace; font-weight: 700;">${ticketId}</td>
                        </tr>
                        <tr>
                            <td style="padding: 5px 0; color: #a69bb5; font-weight: 600;">College / Inst.:</td>
                            <td style="padding: 5px 0; color: #ffffff;">${college}</td>
                        </tr>
                        <tr>
                            <td style="padding: 5px 0; color: #a69bb5; font-weight: 600;">Pass Status:</td>
                            <td style="padding: 5px 0;">${statusBadge}</td>
                        </tr>
                    </table>
                </div>

                <!-- Shuttle Bus Information -->
                <div style="background: linear-gradient(135deg, rgba(212, 168, 67, 0.12) 0%, rgba(33, 25, 56, 0.8) 100%); border: 1px solid #d4a843; border-radius: 8px; padding: 18px 20px; margin-bottom: 24px;">
                    <div style="font-size: 13px; font-weight: 700; color: #f7e7c5; margin-bottom: 8px;">
                        🚌 Complimentary Shuttle Bus Service
                    </div>
                    <p style="margin: 0 0 12px; font-size: 13.5px; color: #d6cee3;">
                        Complimentary AC shuttle buses are arranged for delegates traveling via local trains or metro:
                    </p>
                    <table style="width: 100%; border-collapse: collapse; font-size: 13.5px;">
                        <tr>
                            <td style="padding: 5px 0; color: #a69bb5; width: 36%; font-weight: 600;">Service Starts:</td>
                            <td style="padding: 5px 0; color: #ffffff; font-weight: 700;">7:30 AM onwards (both days)</td>
                        </tr>
                        <tr>
                            <td style="padding: 5px 0; color: #a69bb5; font-weight: 600;">Frequency:</td>
                            <td style="padding: 5px 0; color: #ffffff; font-weight: 700;">Every 20–30 minutes</td>
                        </tr>
                        <tr>
                            <td style="padding: 5px 0; color: #a69bb5; font-weight: 600; vertical-align: top;">Pickup Point:</td>
                            <td style="padding: 5px 0; color: #f7e7c5; font-weight: 600;">
                                Outside McDonald’s (~200 metres from Goregaon Railway Station East)
                            </td>
                        </tr>
                    </table>
                </div>

                <!-- Important Venue Guidelines -->
                <div style="background: rgba(26, 20, 42, 0.6); border: 1px solid rgba(141, 106, 174, 0.25); border-radius: 8px; padding: 16px 20px; margin-bottom: 24px;">
                    <div style="font-size: 13px; font-weight: 700; color: #f7e7c5; margin-bottom: 8px;">
                        ⚠️ Important Guidelines for Entry
                    </div>
                    <ul style="margin: 0; padding-left: 18px; font-size: 13.5px; color: #c8bed6; line-height: 1.6;">
                        <li><strong>College ID:</strong> Please carry your valid physical college/student ID card (mandatory for Film City security).</li>
                        <li><strong>Ticket / QR Pass:</strong> Keep your digital boarding pass or registration confirmation handy on your phone.</li>
                        <li><strong>Timings:</strong> Campus gates open at 8:30 AM. Arrive early for smooth security clearance and priority seating.</li>
                        <li><strong>Coordination:</strong> Any questions on arrival will be answered instantly inside the official WhatsApp community group.</li>
                    </ul>
                </div>

                <!-- Event Coordinators -->
                <div style="background: rgba(19, 15, 33, 0.9); border: 1px solid rgba(141, 106, 174, 0.35); border-radius: 8px; padding: 18px 20px; margin-bottom: 24px;">
                    <div style="font-size: 13px; font-weight: 700; color: #d4a843; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
                        📞 On-Ground Event Coordinators &amp; Helpline
                    </div>
                    <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 12px;">
                        <tr>
                            <td style="padding: 5px 0; color: #ffffff; font-weight: 600; width: 50%;">Nilesh Kumar Gupta</td>
                            <td style="padding: 5px 0;"><a href="tel:+918699260386" style="color: #d4a843; text-decoration: none; font-weight: 600;">+91 86992 60386</a></td>
                        </tr>
                        <tr>
                            <td style="padding: 5px 0; color: #ffffff; font-weight: 600;">Satvik Satam</td>
                            <td style="padding: 5px 0;"><a href="tel:+919136045359" style="color: #d4a843; text-decoration: none; font-weight: 600;">+91 91360 45359</a></td>
                        </tr>
                        <tr>
                            <td style="padding: 5px 0; color: #ffffff; font-weight: 600;">Sahil Mishra</td>
                            <td style="padding: 5px 0;"><a href="tel:+916206686464" style="color: #d4a843; text-decoration: none; font-weight: 600;">+91 62066 86464</a></td>
                        </tr>
                        <tr>
                            <td style="padding: 5px 0; color: #ffffff; font-weight: 600;">Muwaaz Shaikh</td>
                            <td style="padding: 5px 0;"><a href="tel:+917738926238" style="color: #d4a843; text-decoration: none; font-weight: 600;">+91 77389 26238</a></td>
                        </tr>
                        <tr>
                            <td style="padding: 5px 0; color: #ffffff; font-weight: 600;">Karan Singh (Event Manager)</td>
                            <td style="padding: 5px 0;"><a href="tel:+919324880694" style="color: #d4a843; text-decoration: none; font-weight: 600;">+91 93248 80694</a></td>
                        </tr>
                    </table>
                </div>

                <!-- Final Reminder Callout -->
                <p style="margin: 20px 0 6px; font-size: 14.5px;">We look forward to hosting you at Whistling Woods International!</p>
                <p style="margin: 0 0 18px; font-size: 14.5px; color: #ffffff; font-weight: 700;">Join the WhatsApp group now and see you on campus!</p>

                <!-- Signoff -->
                <div style="border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 16px; margin-top: 16px; font-size: 13.5px; color: #b8acc9;">
                    Warm regards,<br>
                    <strong style="color: #ffffff;">Team Celebrate Cinema 2026</strong><br>
                    <span style="color: #d4a843;">CareerBeam • Whistling Woods International</span>
                </div>
            </div>

            <!-- Footer -->
            <div style="background: #0b0914; padding: 18px 24px; text-align: center; font-size: 11.5px; color: #736882; border-top: 1px solid rgba(255, 255, 255, 0.06);">
                <p style="margin: 0 0 4px;">Whistling Woods International, Film City Complex, Goregaon (East), Mumbai - 400065</p>
                <p style="margin: 0;">Powered by CareerBeam (<a href="https://careerbeam.in" style="color: #d4a843; text-decoration: none;">careerbeam.in</a>)</p>
            </div>
        </div>
    </div>
</body>
</html>`;
}

function buildReminderEmailText(recipient) {
    const name = (recipient.name || '').trim() || 'Delegate';
    return `Hello ${name},

Celebrate Cinema 2026 – The Academic Trek is taking place on 8th & 9th October 2026 at Whistling Woods International, Film City, Goregaon, Mumbai!

Please join the Official Delegate WhatsApp Group immediately for gate entry assistance, shuttle bus coordination, and live masterclass schedules:
👉 Join WhatsApp Group: ${WHATSAPP_URL}

EVENT DETAILS:
- Date: 8th & 9th October 2026
- Venue: Whistling Woods International, Film City, Goregaon East, Mumbai
- Free Shuttle Bus: Starts 7:30 AM outside McDonald's (~200m from Goregaon Railway Station East)
- Please carry your College/Student ID card for security verification at Film City gate.

HELPLINE COORDINATORS:
- Nilesh Kumar Gupta: +91 86992 60386
- Satvik Satam: +91 91360 45359
- Sahil Mishra: +91 62066 86464
- Muwaaz Shaikh: +91 77389 26238
- Karan Singh (Event Manager): +91 93248 80694

See you at Whistling Woods International!
Team Celebrate Cinema 2026`;
}

async function fetchAllRegistrations() {
    const list = [];
    console.log('📡 Fetching all registrations from Supabase...');
    for (let off = 0; ; off += 1000) {
        const url = `${SUPABASE_URL}/rest/v1/registrations?select=id,name,email,phone,college,verified,timestamp&id=neq.CONFIG_COLLEGES&order=timestamp.asc&limit=1000&offset=${off}`;
        const res = await fetch(url, {
            headers: {
                apikey: SUPABASE_KEY,
                Authorization: `Bearer ${SUPABASE_KEY}`
            }
        });
        if (!res.ok) throw new Error(`Supabase query error (${res.status}): ${await res.text()}`);
        const batch = await res.json();
        list.push(...batch);
        console.log(`   Fetched chunk of ${batch.length} (total so far: ${list.length})...`);
        if (batch.length < 1000) break;
    }
    return list;
}

(async () => {
    console.log('\n===============================================================');
    console.log('   CELEBRATE CINEMA 2026 — WHATSAPP GROUP REMINDER SENDER     ');
    console.log('   Audience: ALL Verified & Unverified Registered Students    ');
    console.log('   Domain: careerbeam.in | Powered by Resend                  ');
    console.log('===============================================================\n');

    if (!isDryRun && !RESEND_API_KEY) {
        console.error('❌ ERROR: RESEND_API_KEY is not set in environment or .env!');
        process.exit(1);
    }

    const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;
    const sentLog = loadSentLog();

    // 1. Single test email mode
    if (testEmail) {
        console.log(`🧪 Running single test dispatch to: ${testEmail}...`);
        const sampleRecipient = {
            id: 'TEST-DELEGATE',
            name: 'Test Delegate',
            email: testEmail,
            college: 'Test College of Arts & Media',
            verified: true
        };
        const html = buildReminderEmailHtml(sampleRecipient);
        const text = buildReminderEmailText(sampleRecipient);
        const subject = '🚨 Action Required: Join Official WhatsApp Group — Celebrate Cinema 2026 (WWI)';

        const res = await resend.emails.send({
            from: FROM_EMAIL,
            to: [testEmail],
            subject,
            html,
            text
        });

        if (res.error) {
            console.error('❌ Test email failed:', res.error);
        } else {
            console.log('✓ Test email sent successfully! Resend ID:', res.data?.id);
        }
        return;
    }

    // 2. Fetch and deduplicate all registrations
    const rawList = await fetchAllRegistrations();
    console.log(`✓ Fetched ${rawList.length} total registration records.`);

    const emailMap = new Map();
    let invalidCount = 0;

    for (const reg of rawList) {
        let email = cleanEmail(reg.email);
        if (!isValidEmail(email)) {
            invalidCount++;
            continue;
        }

        if (!emailMap.has(email)) {
            emailMap.set(email, { ...reg, email });
        } else {
            const existing = emailMap.get(email);
            // If new record is verified and existing is not, prioritize verified
            if (reg.verified && !existing.verified) {
                emailMap.set(email, { ...reg, email });
            }
        }
    }

    const allUniqueTargets = Array.from(emailMap.values());
    console.log(`✓ Skipped invalid/empty email strings: ${invalidCount}`);
    console.log(`✓ Total unique student emails: ${allUniqueTargets.length}`);

    let verifiedCount = 0;
    let unverifiedCount = 0;
    for (const r of allUniqueTargets) {
        if (r.verified) verifiedCount++;
        else unverifiedCount++;
    }
    console.log(`   - Verified students:   ${verifiedCount}`);
    console.log(`   - Unverified students: ${unverifiedCount}`);

    // 3. Filter out those who already received the WhatsApp reminder
    const pendingList = allUniqueTargets.filter(r => !sentLog.sent[r.email]);
    const alreadySentCount = allUniqueTargets.length - pendingList.length;

    console.log(`✓ Already logged in ${path.basename(LOG_FILE)}: ${alreadySentCount}`);
    console.log(`✓ Pending to receive reminder: ${pendingList.length}`);

    const targets = pendingList.slice(0, sendLimit);
    if (targets.length < pendingList.length) {
        console.log(`ℹ️ Limiting dispatch to first ${targets.length} recipients (--limit flag).`);
    }

    if (isDryRun || !isRealSend) {
        console.log('\n===============================================================');
        console.log('                     [DRY RUN SUMMARY]                         ');
        console.log('===============================================================');
        console.log(`- Sender From: ${FROM_EMAIL}`);
        console.log(`- WhatsApp Group URL: ${WHATSAPP_URL}`);
        console.log(`- Total Unique Audience: ${allUniqueTargets.length}`);
        console.log(`- Already Sent: ${alreadySentCount}`);
        console.log(`- Targets to be emailed now: ${targets.length}`);
        console.log('\nSample 5 recipients queued:');
        targets.slice(0, 5).forEach((r, idx) => {
            console.log(`  ${idx + 1}. [${r.verified ? 'VERIFIED' : 'UNVERIFIED'}] ${r.name || 'N/A'} <${r.email}> [${r.id}] - ${r.college || 'N/A'}`);
        });
        console.log('\nPreview Email Subject: 🚨 Action Required: Join Official WhatsApp Group — Celebrate Cinema 2026 (WWI)');
        console.log('\nTo execute live dispatch, run:');
        console.log('  node send_whatsapp_reminder.js --send');
        console.log('To send a test preview email first, run:');
        console.log('  node send_whatsapp_reminder.js --test=yourname@gmail.com');
        console.log('===============================================================\n');
        return;
    }

    // 4. Batch Dispatch Execution
    console.log(`\n🚀 Starting LIVE dispatch of ${targets.length} reminder emails...`);
    console.log(`   Batch size: ${BATCH_SIZE} emails per API call`);

    let totalSuccess = 0;
    let totalFailed = 0;

    const subject = '🚨 Action Required: Join Official WhatsApp Group — Celebrate Cinema 2026 (WWI)';

    // Process in batches
    for (let i = 0; i < targets.length; i += BATCH_SIZE) {
        const batchSlice = targets.slice(i, i + BATCH_SIZE);
        const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(targets.length / BATCH_SIZE);

        console.log(`\n📦 Sending Batch ${batchNumber}/${totalBatches} (${batchSlice.length} recipients)...`);

        const batchPayload = batchSlice.map(r => ({
            from: FROM_EMAIL,
            to: [r.email],
            subject,
            html: buildReminderEmailHtml(r),
            text: buildReminderEmailText(r)
        }));

        let attempts = 0;
        let batchSuccess = false;
        let responseData = null;

        while (attempts < 3 && !batchSuccess) {
            attempts++;
            try {
                const res = await resend.batch.send(batchPayload);

                if (res.error) {
                    if (res.error.statusCode === 429 || res.error.name === 'rate_limit_exceeded') {
                        console.warn(`   ⚠️ Rate limit hit. Pausing 3s before retry ${attempts}/3...`);
                        await sleep(3000);
                        continue;
                    }
                    console.error(`   ❌ Batch error (${res.error.message || JSON.stringify(res.error)})`);
                    break;
                }

                responseData = res.data;
                batchSuccess = true;
            } catch (err) {
                console.warn(`   ⚠️ Network exception on batch ${batchNumber} (attempt ${attempts}/3): ${err.message}`);
                await sleep(2000);
            }
        }

        if (batchSuccess && responseData) {
            const results = Array.isArray(responseData) ? responseData : (responseData.data || []);
            batchSlice.forEach((r, idx) => {
                const resendId = results[idx]?.id || 'BATCH_SENT';
                sentLog.sent[r.email] = {
                    ticketId: r.id,
                    name: r.name,
                    verified: r.verified === true,
                    college: r.college,
                    resendId,
                    sentAt: new Date().toISOString()
                };
            });
            saveSentLog(sentLog);
            totalSuccess += batchSlice.length;
            console.log(`   ✓ Batch ${batchNumber} delivered successfully (${batchSlice.length} emails). Logged total: ${sentLog.totalSent}`);
        } else {
            console.warn(`   ⚠️ Batch ${batchNumber} failed as a bulk payload. Falling back to individual fallback delivery for this batch...`);
            // Individual fallback
            for (let j = 0; j < batchSlice.length; j++) {
                const r = batchSlice[j];
                try {
                    const singleRes = await resend.emails.send({
                        from: FROM_EMAIL,
                        to: [r.email],
                        subject,
                        html: buildReminderEmailHtml(r),
                        text: buildReminderEmailText(r)
                    });

                    if (singleRes.error) {
                        console.error(`      ❌ [${j + 1}/${batchSlice.length}] Failed to ${r.email}:`, singleRes.error.message);
                        totalFailed++;
                    } else {
                        sentLog.sent[r.email] = {
                            ticketId: r.id,
                            name: r.name,
                            verified: r.verified === true,
                            college: r.college,
                            resendId: singleRes.data?.id,
                            sentAt: new Date().toISOString()
                        };
                        saveSentLog(sentLog);
                        totalSuccess++;
                        console.log(`      ✓ [${j + 1}/${batchSlice.length}] Sent to ${r.email}`);
                    }
                } catch (singleErr) {
                    console.error(`      ❌ Exception sending to ${r.email}:`, singleErr.message);
                    totalFailed++;
                }
                await sleep(350);
            }
        }

        // Pacing pause between batches (1000ms keeps us well within Resend's 10 req/s rate limit)
        if (i + BATCH_SIZE < targets.length) {
            await sleep(1000);
        }
    }

    console.log('\n===============================================================');
    console.log('🎉 DISPATCH COMPLETE!');
    console.log(`- Successfully Sent: ${totalSuccess}`);
    console.log(`- Failed:            ${totalFailed}`);
    console.log(`- Total in Log:      ${sentLog.totalSent}`);
    console.log('===============================================================\n');

})().catch(e => {
    console.error('Fatal execution error:', e);
    process.exit(1);
});
