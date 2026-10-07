const { generateTicketPdf } = require('./generate_ticket_pdf');

/**
 * Builds the official confirmation email HTML and PDF attachment for a verified delegate.
 * Incorporates shuttle bus details, event coordinators, WhatsApp community, and ticket info.
 * @param {Object} reg - Registration record
 * @returns {Promise<Object>} { subject, html, text, attachments }
 */
async function buildConfirmationEmail(reg) {
    const name = (reg.name || 'Delegate').trim();
    const ticketId = (reg.id || 'WWI-PASS').trim();
    const college = (reg.college || 'Partner College Delegation').trim();

    let visitDate = 'Both Days (08th & 09th October 2026)';
    if (reg.year && reg.year.includes('__VD__')) {
        visitDate = reg.year.split('__VD__')[1].trim();
    } else if (reg.visitDate) {
        visitDate = reg.visitDate.trim();
    }

    const pdfBuffer = await generateTicketPdf(reg);

    const subject = `Your Official Boarding Pass & Event Guide — Celebrate Cinema 2026 [${ticketId}]`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0914; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f3f0f7; -webkit-font-smoothing: antialiased;">
    <div style="padding: 24px 12px; background-color: #0b0914;">
        <div style="max-width: 620px; margin: 0 auto; background: #140f21; border: 1px solid rgba(212, 168, 67, 0.35); border-radius: 14px; overflow: hidden; box-shadow: 0 12px 36px rgba(0,0,0,0.6);">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #24163f 0%, #110c1c 100%); padding: 34px 24px; text-align: center; border-bottom: 2px solid #d4a843;">
                <div style="display: inline-block; background: rgba(212, 168, 67, 0.15); color: #f7e7c5; border: 1px solid #d4a843; border-radius: 20px; padding: 5px 16px; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 12px;">
                    ✓ Registration Confirmed • Ticket Attached
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
                <p style="margin: 0 0 18px;">
                    We’re excited to welcome you to <strong>Celebrate Cinema 2026 – The Academic Trek</strong> at <strong>Whistling Woods International</strong>!
                </p>
                <p style="margin: 0 0 20px;">
                    This is a quick reminder regarding your registration. Please keep the following details handy:
                </p>

                <!-- Event Snapshot -->
                <div style="background: rgba(26, 20, 42, 0.7); border: 1px solid rgba(141, 106, 174, 0.25); border-radius: 8px; padding: 14px 18px; margin-bottom: 22px;">
                    <div style="font-size: 13.5px; color: #ffffff; margin-bottom: 4px;">
                        🎬 <strong>Event:</strong> Celebrate Cinema 2026 – The Academic Trek
                    </div>
                    <div style="font-size: 13.5px; color: #ffffff; margin-bottom: 4px;">
                        📅 <strong>Date:</strong> 8th &amp; 9th October 2026
                    </div>
                    <div style="font-size: 13.5px; color: #ffffff;">
                        🏛️ <strong>Venue:</strong> Whistling Woods International, Film City, Goregaon East, Mumbai
                    </div>
                </div>

                <!-- 1. ENTRY TICKET BOX -->
                <div style="background: linear-gradient(135deg, rgba(141, 106, 174, 0.18) 0%, rgba(212, 168, 67, 0.12) 100%); border: 1px solid rgba(212, 168, 67, 0.45); border-left: 5px solid #d4a843; border-radius: 8px; padding: 18px 20px; margin-bottom: 24px;">
                    <div style="font-size: 12px; font-weight: 700; color: #d4a843; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px;">
                        🎟️ 1. Your Entry Ticket &amp; Boarding Pass
                    </div>
                    <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 12px;">
                        <tr>
                            <td style="padding: 5px 0; color: #a69bb5; width: 38%; font-weight: 600;">Ticket ID:</td>
                            <td style="padding: 5px 0; color: #ffffff; font-weight: 800; font-family: monospace; font-size: 15px;">${ticketId}</td>
                        </tr>
                        <tr>
                            <td style="padding: 5px 0; color: #a69bb5; font-weight: 600;">Delegate Name:</td>
                            <td style="padding: 5px 0; color: #ffffff; font-weight: 600;">${name}</td>
                        </tr>
                        <tr>
                            <td style="padding: 5px 0; color: #a69bb5; font-weight: 600;">College / Inst.:</td>
                            <td style="padding: 5px 0; color: #ffffff;">${college}</td>
                        </tr>
                        <tr>
                            <td style="padding: 5px 0; color: #a69bb5; font-weight: 600;">Registered Date:</td>
                            <td style="padding: 5px 0; color: #22c55e; font-weight: 700;">${visitDate}</td>
                        </tr>
                        <tr>
                            <td style="padding: 5px 0; color: #a69bb5; font-weight: 600;">Status:</td>
                            <td style="padding: 5px 0; color: #4ade80; font-weight: 700;">✓ Verified &amp; Approved</td>
                        </tr>
                    </table>

                    <div style="background: rgba(34, 197, 94, 0.12); border: 1px solid rgba(34, 197, 94, 0.35); border-radius: 6px; padding: 10px 14px; font-size: 13px; color: #e4f7eb;">
                        📎 <strong>Attached:</strong> <code>${ticketId}-Boarding-Pass.pdf</code><br>
                        Please keep your attached PDF ticket handy and carry/show it at the venue gate for entry verification.
                    </div>
                </div>

                <!-- 2. SHUTTLE BUS SERVICE -->
                <div style="background: linear-gradient(135deg, rgba(212, 168, 67, 0.12) 0%, rgba(33, 25, 56, 0.8) 100%); border: 1px solid #d4a843; border-radius: 8px; padding: 18px 20px; margin-bottom: 24px;">
                    <div style="font-size: 13px; font-weight: 700; color: #f7e7c5; margin-bottom: 8px;">
                        🚌 2. Shuttle Bus Service
                    </div>
                    <p style="margin: 0 0 12px; font-size: 13.5px; color: #d6cee3;">
                        To make your commute to the venue convenient, a shuttle bus service will be available:
                    </p>
                    <table style="width: 100%; border-collapse: collapse; font-size: 13.5px;">
                        <tr>
                            <td style="padding: 5px 0; color: #a69bb5; width: 36%; font-weight: 600;">Service Starts:</td>
                            <td style="padding: 5px 0; color: #ffffff; font-weight: 700;">7:30 AM onwards</td>
                        </tr>
                        <tr>
                            <td style="padding: 5px 0; color: #a69bb5; font-weight: 600;">Frequency:</td>
                            <td style="padding: 5px 0; color: #ffffff; font-weight: 700;">Every 20–30 minutes</td>
                        </tr>
                        <tr>
                            <td style="padding: 5px 0; color: #a69bb5; font-weight: 600; vertical-align: top;">Pickup Point:</td>
                            <td style="padding: 5px 0; color: #f7e7c5; font-weight: 600;">
                                McDonald’s, approximately 200 metres from Goregaon Railway Station
                            </td>
                        </tr>
                    </table>
                </div>

                <!-- 3. IMPORTANT INSTRUCTIONS -->
                <div style="background: rgba(26, 20, 42, 0.6); border: 1px solid rgba(141, 106, 174, 0.25); border-radius: 8px; padding: 16px 20px; margin-bottom: 24px;">
                    <div style="font-size: 13px; font-weight: 700; color: #f7e7c5; margin-bottom: 8px;">
                        ⚠️ 3. Important Guidelines
                    </div>
                    <ul style="margin: 0; padding-left: 18px; font-size: 13.5px; color: #c8bed6; line-height: 1.6;">
                        <li>Please carry a valid college/student ID card.</li>
                        <li>Keep your entry ticket available for verification at the venue.</li>
                        <li>Please reach the venue as per your registered date (${visitDate}).</li>
                        <li>Entry will be subject to registration and ticket verification at the venue.</li>
                    </ul>
                </div>

                <!-- 4 & 5. CONTACTS / COORDINATORS -->
                <div style="background: rgba(19, 15, 33, 0.9); border: 1px solid rgba(141, 106, 174, 0.35); border-radius: 8px; padding: 18px 20px; margin-bottom: 24px;">
                    <div style="font-size: 13px; font-weight: 700; color: #d4a843; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
                        📞 4. Event Coordinators
                    </div>
                    <p style="margin: 0 0 12px; font-size: 13px; color: #a69bb5;">
                        For any queries related to your registration, entry, travel, or event experience:
                    </p>
                    <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 16px;">
                        <tr>
                            <td style="padding: 6px 0; color: #ffffff; font-weight: 600; width: 50%;">Nilesh Kumar Gupta</td>
                            <td style="padding: 6px 0;"><a href="tel:+918699260386" style="color: #d4a843; text-decoration: none; font-weight: 600;">+91 86992 60386</a></td>
                        </tr>
                        <tr>
                            <td style="padding: 6px 0; color: #ffffff; font-weight: 600;">Satvik Satam</td>
                            <td style="padding: 6px 0;"><a href="tel:+919136045359" style="color: #d4a843; text-decoration: none; font-weight: 600;">+91 91360 45359</a></td>
                        </tr>
                        <tr>
                            <td style="padding: 6px 0; color: #ffffff; font-weight: 600;">Sahil Mishra</td>
                            <td style="padding: 6px 0;"><a href="tel:+916206686464" style="color: #d4a843; text-decoration: none; font-weight: 600;">+91 62066 86464</a></td>
                        </tr>
                        <tr>
                            <td style="padding: 6px 0; color: #ffffff; font-weight: 600;">Muwaaz Shaikh</td>
                            <td style="padding: 6px 0;"><a href="tel:+917738926238" style="color: #d4a843; text-decoration: none; font-weight: 600;">+91 77389 26238</a></td>
                        </tr>
                    </table>

                    <div style="border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 12px;">
                        <div style="font-size: 13px; font-weight: 700; color: #d4a843; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
                            👔 5. Event Manager &amp; Technical Support
                        </div>
                        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                            <tr>
                                <td style="padding: 5px 0; color: #a69bb5; width: 45%;">Event Manager (Escalations):</td>
                                <td style="padding: 5px 0; color: #ffffff; font-weight: 600;">Karan Singh — <a href="tel:+919324880694" style="color: #d4a843; text-decoration: none;">+91 93248 80694</a></td>
                            </tr>
                            <tr>
                                <td style="padding: 5px 0; color: #a69bb5;">Technical &amp; Ticket Queries:</td>
                                <td style="padding: 5px 0; color: #ffffff; font-weight: 600;">Nilesh Kumar Gupta — <a href="tel:+918699260386" style="color: #d4a843; text-decoration: none;">+91 86992 60386</a></td>
                            </tr>
                        </table>
                    </div>
                </div>

                <!-- WHATSAPP COMMUNITY CTA -->
                <div style="text-align: center; margin: 26px 0 24px; background: rgba(37, 211, 102, 0.1); border: 1px dashed rgba(37, 211, 102, 0.45); border-radius: 10px; padding: 22px 18px;">
                    <h3 style="color: #ffffff; margin: 0 0 8px; font-size: 16.5px;">
                        📲 Official WhatsApp Group (Important)
                    </h3>
                    <p style="margin: 0 0 16px; font-size: 13px; color: #c4a8e2; line-height: 1.5;">
                        Please join our official WhatsApp community group to receive live schedules, speaker timings, workshop slot allocations, and entry/transport instructions:
                    </p>
                    <a href="https://chat.whatsapp.com/DzA3LRSfW44Ap6viArkjI7" target="_blank" style="display: inline-block; background: #25D366; color: #ffffff !important; text-decoration: none; font-weight: 700; font-size: 14.5px; padding: 13px 28px; border-radius: 25px; box-shadow: 0 4px 14px rgba(37, 211, 102, 0.35);">
                        👉 Click Here to Join WhatsApp Group
                    </a>
                    <div style="margin-top: 10px; font-size: 12px; color: #a69bb5;">
                        Link: <a href="https://chat.whatsapp.com/DzA3LRSfW44Ap6viArkjI7" style="color: #25D366; text-decoration: underline;">https://chat.whatsapp.com/DzA3LRSfW44Ap6viArkjI7</a>
                    </div>
                </div>

                <p style="margin: 22px 0 6px; font-size: 14.5px;">We look forward to seeing you at Celebrate Cinema 2026.</p>
                <p style="margin: 0 0 18px; font-size: 14.5px; color: #ffffff; font-weight: 700;">See you at Whistling Woods International!</p>

                <!-- Signoff -->
                <div style="border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 16px; margin-top: 16px; font-size: 13.5px; color: #b8acc9;">
                    Regards,<br>
                    <strong style="color: #ffffff;">Team Career Beam</strong><br>
                    <span style="color: #d4a843;">Vigor LaunchPad</span>
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

    const text = `Dear ${name},

We’re excited to welcome you to Celebrate Cinema 2026 – The Academic Trek at Whistling Woods International.

This is a quick reminder regarding your registration. Please keep the following details handy:

Event: Celebrate Cinema 2026 – The Academic Trek
Date: 8th & 9th October 2026
Venue: Whistling Woods International, Film City, Goregaon East, Mumbai

1. Your Entry Ticket
Your entry ticket is attached to this email (${ticketId}-Boarding-Pass.pdf).
- Ticket ID: ${ticketId}
- Delegate: ${name}
- College: ${college}
- Registered Date: ${visitDate}
- Status: Verified & Approved
Please keep it handy and carry/show it at the venue for entry verification.

2. Shuttle Bus Service
To make your commute to the venue convenient, a shuttle bus service will be available:
- Service starts: 7:30 AM onwards
- Frequency: Buses will be available every 20–30 minutes
- Pickup Point: McDonald’s, approximately 200 metres from Goregaon Station

3. Important Guidelines
- Please carry a valid college/student ID card.
- Keep your entry ticket available for verification at the venue.
- Please reach the venue as per your registered date (${visitDate}).
- Entry will be subject to registration and ticket verification at the venue.

4. Event Coordinators
For any queries related to your registration, entry, travel or event experience, please contact our Event Coordinators:
- Nilesh Kumar Gupta: +91 86992 60386
- Satvik Satam: +91 91360 45359
- Sahil Mishra: +91 62066 86464
- Muwaaz Shaikh: +91 77389 26238

5. Event Manager & Technical Support
- Event Manager (Escalations): Karan Singh (+91 9324880694)
- Technical Issues & Tickets: Nilesh Kumar Gupta (+91 86992 60386)

Official WhatsApp Group (Important):
Please join our official WhatsApp community group to receive live schedules, speaker timings, workshop slot allocations, and entry/transport instructions:
https://chat.whatsapp.com/DzA3LRSfW44Ap6viArkjI7

We look forward to seeing you at Celebrate Cinema 2026.
See you at Whistling Woods International!

Regards,
Team Career Beam
Vigor LaunchPad`;

    return {
        subject,
        html,
        text,
        attachments: [
            {
                filename: `${ticketId}-Boarding-Pass.pdf`,
                content: pdfBuffer
            }
        ]
    };
}

module.exports = { buildConfirmationEmail };
