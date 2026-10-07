/**
 * CELEBRATE CINEMA 2026 — SEND PREVIEW TICKETS TO NAGESH & NILESH
 * 
 * Sends sample preview confirmation email with attached PDF Boarding Pass to:
 * - nageshkumsr@vigorlaunchpad.com
 * - nilesh@vigorlaunchpad.com
 * (and nageshkumar@vigorlaunchpad.com to ensure delivery if typo)
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

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Celebrate Cinema <confirmations@careerbeam.in>';

if (!RESEND_API_KEY) {
    console.error('❌ RESEND_API_KEY is not configured in .env');
    process.exit(1);
}

const resend = new Resend(RESEND_API_KEY);

const PREVIEW_RECIPIENTS = [
    { name: 'Nagesh Kumar', email: 'nageshkumsr@vigorlaunchpad.com' },
    { name: 'Nagesh Kumar', email: 'nageshkumar@vigorlaunchpad.com' }, // Safety fallback in case nageshkumsr was a typo
    { name: 'Nilesh Gupta', email: 'nilesh@vigorlaunchpad.com' }
];

async function sendPreviews() {
    console.log('\n======================================================');
    console.log('   CELEBRATE CINEMA 2026 — NAGESH EMAIL PREVIEW SENDER');
    console.log('======================================================\n');
    console.log(`From: ${FROM_EMAIL}`);
    console.log(`Recipients: ${PREVIEW_RECIPIENTS.map(r => r.email).join(', ')}\n`);

    for (const recipient of PREVIEW_RECIPIENTS) {
        console.log(`Preparing ticket preview for ${recipient.name} <${recipient.email}>...`);

        const sampleReg = {
            id: 'NAG-PREVIEW-01',
            name: recipient.name,
            email: recipient.email,
            college: 'Guru Nanak Khalsa College (Delegation)',
            year: '3rd Year (Media & Cinema)',
            visitDate: 'Both Days (08th & 09th October 2026)'
        };

        const mailData = await buildNageshConfirmationEmail(sampleReg, { includeWhatsApp: false });
        console.log(`✓ Boarding Pass PDF generated (${(mailData.attachments[0].content.length / 1024).toFixed(1)} KB)`);

        try {
            const resp = await resend.emails.send({
                from: FROM_EMAIL,
                to: [recipient.email],
                subject: `[PREVIEW TICKET] ${mailData.subject}`,
                html: mailData.html,
                text: mailData.text,
                attachments: mailData.attachments
            });

            if (resp.error) {
                console.error(`❌ Failed to send to ${recipient.email}:`, resp.error);
            } else {
                console.log(`✅ SUCCESS: Preview sent to ${recipient.email}! Resend ID: ${resp.data?.id}`);
            }
        } catch (err) {
            console.error(`❌ Exception sending to ${recipient.email}:`, err.message);
        }
    }

    console.log('\n======================================================');
    console.log('Preview dispatch complete.');
    console.log('======================================================\n');
}

sendPreviews().catch(console.error);
