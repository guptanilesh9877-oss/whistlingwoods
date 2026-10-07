const { generateTicketPdf } = require('./generate_ticket_pdf');

/**
 * Builds the official confirmation email HTML and PDF attachment for HSNC-COLLAB delegates.
 * - Prominently includes the 4 core mandatory guidelines:
 *   1) Carry ID Proof (Student / Govt ID)
 *   2) Do not carry sharp & flammable objects
 *   3) Mention at the registration counter that you are from HSNC-COLLAB (HSNC University) to avail your band
 *   4) If you are bringing companions/Friends/+1 make sure they filled the registration form
 * - Free complimentary shuttle bus schedule & pickup location (Goregaon East)
 * - NO personal phone numbers
 * - NO WhatsApp group link (per instruction: "just don't add whatsapp group link")
 * 
 * @param {Object} reg - Registration record { id, name, email, college, year, visitDate }
 * @returns {Promise<Object>} { subject, html, text, attachments }
 */
async function buildHsncConfirmationEmail(reg) {
    const name = (reg.name || 'Delegate').trim();
    const ticketId = (reg.id || 'HSN-PASS').trim();
    const college = (reg.college || 'HSNC University Delegation').trim();

    let visitDate = 'Both Days (08th & 09th October 2026)';
    if (reg.year && reg.year.includes('__VD__')) {
        visitDate = reg.year.split('__VD__')[1].trim();
    } else if (reg.visitDate) {
        visitDate = reg.visitDate.trim();
    }

    // PDF Boarding Pass Ticket with NO WhatsApp group link
    const pdfBuffer = await generateTicketPdf({
        ...reg,
        hideWhatsApp: true
    });

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
        <div style="max-width: 620px; margin: 0 auto; background: #140f21; border: 1px solid rgba(212, 168, 67, 0.4); border-radius: 14px; overflow: hidden; box-shadow: 0 12px 36px rgba(0,0,0,0.65);">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #24163f 0%, #110c1c 100%); padding: 34px 24px; text-align: center; border-bottom: 2px solid #d4a843;">
                <div style="display: inline-block; background: rgba(212, 168, 67, 0.15); color: #f7e7c5; border: 1px solid #d4a843; border-radius: 20px; padding: 5px 16px; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 12px;">
                    ✓ Registration Confirmed • Pass Attached
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
                    We are pleased to confirm your registration for <strong>Celebrate Cinema 2026 – The Academic Trek</strong> at <strong>Whistling Woods International</strong>!
                </p>
                <p style="margin: 0 0 20px;">
                    Your official Boarding Pass has been generated and attached to this email. Please review your pass details and the mandatory guidelines below:
                </p>

                <!-- Event Snapshot -->
                <div style="background: rgba(26, 20, 42, 0.7); border: 1px solid rgba(141, 106, 174, 0.25); border-radius: 8px; padding: 14px 18px; margin-bottom: 22px;">
                    <div style="font-size: 13.5px; color: #ffffff; margin-bottom: 6px;">
                        🎬 <strong>Event:</strong> Celebrate Cinema 2026 – The Academic Trek
                    </div>
                    <div style="font-size: 13.5px; color: #ffffff; margin-bottom: 6px;">
                        📅 <strong>Date:</strong> 08th &amp; 09th October 2026 (9:30 AM to 5:30 PM)
                    </div>
                    <div style="font-size: 13.5px; color: #ffffff;">
                        🏛️ <strong>Venue:</strong> Whistling Woods International, Film City Complex, Goregaon (East), Mumbai - 400065
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
                            <td style="padding: 5px 0; color: #a69bb5; font-weight: 600;">Visiting Date:</td>
                            <td style="padding: 5px 0; color: #22c55e; font-weight: 700;">${visitDate}</td>
                        </tr>
                        <tr>
                            <td style="padding: 5px 0; color: #a69bb5; font-weight: 600;">Delegation:</td>
                            <td style="padding: 5px 0; color: #f7e7c5; font-weight: 700;">HSNC-COLLAB</td>
                        </tr>
                        <tr>
                            <td style="padding: 5px 0; color: #a69bb5; font-weight: 600;">Status:</td>
                            <td style="padding: 5px 0; color: #4ade80; font-weight: 700;">✓ Verified &amp; Approved</td>
                        </tr>
                    </table>

                    <div style="background: rgba(34, 197, 94, 0.12); border: 1px solid rgba(34, 197, 94, 0.35); border-radius: 6px; padding: 10px 14px; font-size: 13px; color: #e4f7eb;">
                        📎 <strong>Attached:</strong> <code>${ticketId}-Boarding-Pass.pdf</code><br>
                        Please keep your attached PDF Boarding Pass downloaded on your phone or carry a printed copy for gate verification and QR scanning.
                    </div>
                </div>

                <!-- 2. MANDATORY GUIDELINES & INSTRUCTIONS (HIGHLIGHTED) -->
                <div style="background: linear-gradient(135deg, rgba(212, 168, 67, 0.18) 0%, rgba(33, 25, 56, 0.95) 100%); border: 1.5px solid #d4a843; border-radius: 10px; padding: 20px 22px; margin-bottom: 24px; box-shadow: 0 4px 16px rgba(0,0,0,0.35);">
                    <div style="font-size: 13.5px; font-weight: 800; color: #f7e7c5; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 14px;">
                        ⭐ 2. Mandatory Entry Instructions &amp; Guidelines:
                    </div>
                    
                    <div style="font-size: 13.5px; color: #f3eefb; line-height: 1.7;">
                        <!-- Point 1 -->
                        <div style="margin-bottom: 12px; padding: 8px 12px; background: rgba(0,0,0,0.25); border-left: 3px solid #4ade80; border-radius: 4px;">
                            <strong style="color: #4ade80;">1. Carry ID Proof:</strong><br>
                            Please carry your valid physical or digital College/Student ID card or government-issued photo ID (Aadhaar / Driving License / Voter ID) for entry verification.
                        </div>

                        <!-- Point 2 -->
                        <div style="margin-bottom: 12px; padding: 8px 12px; background: rgba(0,0,0,0.25); border-left: 3px solid #f87171; border-radius: 4px;">
                            <strong style="color: #f87171;">2. Prohibited Items:</strong><br>
                            Do not carry sharp objects (scissors, blades, knives) or flammable objects (lighters, matchboxes, aerosols). Security screening will be strictly enforced at the gate.
                        </div>

                        <!-- Point 3 (HSNC-COLLAB Band) -->
                        <div style="margin-bottom: 12px; padding: 10px 14px; background: rgba(147, 51, 234, 0.22); border: 1px solid #c084fc; border-left: 4px solid #d4a843; border-radius: 6px;">
                            <strong style="color: #fbbf24; font-size: 14px;">3. Wristband Collection (Important):</strong><br>
                            <span style="color: #ffffff; font-weight: 600;">Mention at the registration counter that you are from <span style="background: #eab308; color: #000000; padding: 2px 8px; border-radius: 4px; font-weight: 800; letter-spacing: 1px;">HSNC-COLLAB</span> to avail your official delegate entry band.</span>
                        </div>

                        <!-- Point 4 (Companions / +1) -->
                        <div style="padding: 8px 12px; background: rgba(0,0,0,0.25); border-left: 3px solid #60a5fa; border-radius: 4px;">
                            <strong style="color: #60a5fa;">4. Companions / Friends / +1:</strong><br>
                            If you are bringing companions, friends, or a +1, please ensure that they have also filled the registration form to obtain their individual Boarding Pass. Entry will only be granted with an individual verified pass.
                        </div>
                    </div>
                </div>

                <!-- 3. SHUTTLE BUS SERVICE -->
                <div style="background: linear-gradient(135deg, rgba(212, 168, 67, 0.12) 0%, rgba(33, 25, 56, 0.8) 100%); border: 1px solid #d4a843; border-radius: 8px; padding: 18px 20px; margin-bottom: 24px;">
                    <div style="font-size: 13px; font-weight: 700; color: #f7e7c5; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
                        🚌 3. Complimentary Shuttle Bus Service
                    </div>
                    <p style="margin: 0 0 12px; font-size: 13.5px; color: #d6cee3;">
                        Complimentary shuttle buses will be running continuously to transport delegates directly to the campus:
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
                                McDonald’s, approx. 200 metres from Goregaon Railway Station (East)
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 5px 0; color: #a69bb5; font-weight: 600; vertical-align: top;">Drop-off:</td>
                            <td style="padding: 5px 0; color: #ffffff;">
                                Whistling Woods International Main Reception Gates
                            </td>
                        </tr>
                    </table>
                </div>

                <p style="margin: 22px 0 6px; font-size: 14.5px;">We look forward to welcoming you for an incredible academic journey into cinema, media, and creative arts!</p>
                <p style="margin: 0 0 18px; font-size: 14.5px; color: #ffffff; font-weight: 700;">See you at Whistling Woods International!</p>

                <!-- Signoff -->
                <div style="border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 16px; margin-top: 18px; font-size: 13px; color: #b8acc9;">
                    Warm regards,<br>
                    <strong style="color: #ffffff; font-size: 14px;">Team Celebrate Cinema 2026</strong><br>
                    <span style="color: #d4a843;">Whistling Woods International</span>
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

    const text = `CELEBRATE CINEMA 2026 — OFFICIAL BOARDING PASS CONFIRMATION

Dear ${name},

We are pleased to confirm your registration for Celebrate Cinema 2026 – The Academic Trek at Whistling Woods International!

Attached to this email is your official Boarding Pass [${ticketId}-Boarding-Pass.pdf].
Please keep it downloaded on your phone or print a copy for QR code scanning at the gate.

--------------------------------------------------
EVENT & PASS DETAILS:
--------------------------------------------------
Ticket ID:     ${ticketId}
Delegate Name: ${name}
College:       ${college}
Visiting Date: ${visitDate}
Delegation:    HSNC-COLLAB
Status:        Verified & Approved
Event Dates:   08th & 09th October 2026 (9:30 AM to 5:30 PM)
Venue:         Whistling Woods International, Film City, Goregaon (East), Mumbai

--------------------------------------------------
MANDATORY ENTRY INSTRUCTIONS & GUIDELINES:
--------------------------------------------------
1. CARRY ID PROOF:
   Please carry your valid physical or digital Student/College ID or Government Photo ID (Aadhaar / Driving License / Voter ID) for verification.

2. PROHIBITED ITEMS:
   Do not carry sharp objects (scissors, blades, knives) or flammable objects (lighters, matchboxes, aerosols). Security screening will be strictly enforced at the gate.

3. WRISTBAND COLLECTION (IMPORTANT):
   Mention at the registration counter that you are from HSNC-COLLAB to avail your official delegate entry band.

4. COMPANIONS / FRIENDS / +1:
   If you are bringing companions, friends, or a +1, please ensure that they have also filled the registration form to obtain their individual Boarding Pass.

--------------------------------------------------
COMPLIMENTARY SHUTTLE BUS SERVICE:
--------------------------------------------------
- Service Starts: 7:30 AM onwards (every 20–30 minutes)
- Pickup: McDonald’s (approx. 200m from Goregaon Railway Station East)
- Drop-off: Whistling Woods International Main Reception Gates

We look forward to welcoming you to campus!

Warm regards,
Team Celebrate Cinema 2026
Whistling Woods International`;

    return {
        subject,
        html,
        text,
        attachments: [
            {
                filename: `${ticketId}-Boarding-Pass.pdf`,
                content: pdfBuffer.toString('base64')
            }
        ]
    };
}

module.exports = {
    buildHsncConfirmationEmail
};
