const fs = require('fs');
const path = require('path');
const { Resend } = require('resend');

// Load .env
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

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Celebrate Cinema <confirmations@careerbeam.in>';
const WHATSAPP_URL = 'https://chat.whatsapp.com/DzA3LRSfW44Ap6viArkjI7';

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

const recipients = [
    { email: 'guptanilesh417@gmail.com', name: 'Nilesh Kumar Gupta', college: 'Event Coordinator' },
    { email: 'tarasha@vigorlaunchpad.com', name: 'Tarasha', college: 'Vigor LaunchPad' },
    { email: 'nilesh@vigorlaunchpad.com', name: 'Nilesh Kumar Gupta', college: 'Vigor LaunchPad' }
];

async function run() {
    const resend = new Resend(RESEND_API_KEY);
    const subject = '🚨 Action Required: Join Official WhatsApp Group — Celebrate Cinema 2026 (WWI)';

    console.log(`Sending template preview to ${recipients.length} addresses...`);

    for (const r of recipients) {
        const payload = {
            id: 'CCM-SAMPLE-PASS',
            name: r.name,
            email: r.email,
            college: r.college,
            verified: true
        };

        const res = await resend.emails.send({
            from: FROM_EMAIL,
            to: [r.email],
            subject,
            html: buildReminderEmailHtml(payload),
            text: buildReminderEmailText(payload)
        });

        if (res.error) {
            console.error(`❌ Failed to send to ${r.email}:`, res.error);
        } else {
            console.log(`✓ Successfully sent to ${r.email} | Resend ID: ${res.data?.id}`);
        }
    }
}

run().catch(console.error);
