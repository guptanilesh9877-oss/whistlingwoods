const { Resend } = require('resend');
const { buildConfirmationEmail } = require('../mail_builder');
const { buildNageshConfirmationEmail } = require('../mail_builder_nagesh');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://rnylpxfjhxpmjwolsqcd.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJueWxweGZqaHhwbWp3b2xzcWNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwOTgwMDEsImV4cCI6MjEwMzY3NDAwMX0.ms0YzXZ2Lb-VFpqEjD9BrAYzDp81ZklQwCwNnkyP6U8';
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Celebrate Cinema <confirmations@careerbeam.in>';

module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
    );

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed. Use POST.' });
    }

    if (!RESEND_API_KEY) {
        return res.status(500).json({ 
            error: 'RESEND_API_KEY environment variable is not configured on Vercel.' 
        });
    }

    try {
        const { id, email } = req.body || {};
        if (!id && !email) {
            return res.status(400).json({ error: 'Missing required field: id or email.' });
        }

        // Fetch registration record from Supabase
        const filter = id ? `id=eq.${encodeURIComponent(id)}` : `email=eq.${encodeURIComponent(email)}`;
        const supaRes = await fetch(`${SUPABASE_URL}/rest/v1/registrations?${filter}&limit=1`, {
            headers: {
                apikey: SUPABASE_KEY,
                Authorization: `Bearer ${SUPABASE_KEY}`
            }
        });

        if (!supaRes.ok) {
            return res.status(500).json({ error: 'Failed to query Supabase: ' + (await supaRes.text()) });
        }

        const data = await supaRes.json();
        if (!Array.isArray(data) || data.length === 0) {
            return res.status(404).json({ error: 'Registration not found in database.' });
        }

        const reg = data[0];

        // Ensure registration is verified
        if (!reg.verified) {
            return res.status(403).json({ 
                error: 'Registration is not yet verified. Ticket emails are only sent to verified delegates.' 
            });
        }

        // Build personalized email and PDF attachment
        const isNagesh = String(reg.id || '').toUpperCase().startsWith('NAG-') ||
                         String(reg.referred_by || '').toUpperCase().includes('NAGESH');
        const mailData = isNagesh ? await buildNageshConfirmationEmail(reg) : await buildConfirmationEmail(reg);

        const resend = new Resend(RESEND_API_KEY);
        const sendResult = await resend.emails.send({
            from: FROM_EMAIL,
            to: [reg.email],
            subject: mailData.subject,
            html: mailData.html,
            text: mailData.text,
            attachments: mailData.attachments
        });

        return res.status(200).json({
            success: true,
            message: `Ticket email sent to ${reg.email}`,
            ticketId: reg.id,
            resendId: sendResult.data?.id
        });
    } catch(err) {
        console.error('send-ticket error:', err);
        return res.status(500).json({ error: err.message || 'Internal server error' });
    }
};
