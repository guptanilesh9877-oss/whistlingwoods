const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

/**
 * Generates an official Celebrate Cinema 2026 PDF Boarding Pass.
 * @param {Object} reg - Registration data { id, name, college, year, visitDate, timestamp }
 * @returns {Promise<Buffer>}
 */
async function generateTicketPdf(reg) {
    return new Promise(async (resolve, reject) => {
        try {
            // Standard A4 portrait: 595.28 x 841.89 pt
            const doc = new PDFDocument({
                size: 'A4',
                margins: { top: 36, bottom: 36, left: 36, right: 36 }
            });

            const buffers = [];
            doc.on('data', b => buffers.push(b));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', err => reject(err));

            const W = doc.page.width;
            const H = doc.page.height;
            const margin = 36;
            const cardW = W - margin * 2; // 523.28

            // ── BACKGROUND BASE ──
            // Dark luxury theme #12101e
            doc.rect(0, 0, W, H).fill('#0f0c1b');

            // Top luxury gold/purple accent bar
            doc.rect(0, 0, W, 8).fill('#d4a843');
            doc.rect(0, 8, W, 3).fill('#8d6aae');

            // ── MAIN PASS CARD ──
            const cardX = margin;
            const cardY = 30;
            const cardH = 750;

            // Card body background with subtle border
            doc.roundedRect(cardX, cardY, cardW, cardH, 12)
               .fillAndStroke('#171326', '#d4a843');

            // ── HEADER SECTION ──
            // Top banner area inside card
            doc.save();
            doc.roundedRect(cardX, cardY, cardW, 110, 12).clip();
            doc.rect(cardX, cardY, cardW, 110).fill('#211938');
            doc.restore();

            // Logos if present
            const assetsDir = path.join(__dirname, 'assets');
            const wwiLogoPath = path.join(assetsDir, 'wwi-logo.png');
            const ccLogoPath = path.join(assetsDir, 'cc26-logo.png');
            const careerbeamLogoPath = path.join(assetsDir, 'careerbeam-logo.png');

            if (fs.existsSync(wwiLogoPath)) {
                try {
                    doc.image(wwiLogoPath, cardX + 18, cardY + 16, { width: 110 });
                } catch(e) {}
            }

            if (fs.existsSync(ccLogoPath)) {
                try {
                    doc.image(ccLogoPath, cardX + cardW - 75, cardY + 14, { width: 55 });
                } catch(e) {}
            }

            // Title & Subtitle inside header
            doc.font('Helvetica-Bold')
               .fontSize(18)
               .fillColor('#ffffff')
               .text('CELEBRATE CINEMA 2026', cardX + 135, cardY + 22, { align: 'center', width: cardW - 220 });

            doc.font('Helvetica')
               .fontSize(9)
               .fillColor('#d4a843')
               .text('13th EDITION • ASIA\'S LARGEST FILM & MEDIA CONCLAVE', cardX + 135, cardY + 46, { align: 'center', width: cardW - 220 });

            doc.font('Helvetica')
               .fontSize(8.5)
               .fillColor('#b8acc9')
               .text('Whistling Woods International • Film City, Mumbai', cardX + 135, cardY + 62, { align: 'center', width: cardW - 220 });

            // Delegation badge pill
            doc.roundedRect(cardX + cardW / 2 - 100, cardY + 82, 200, 18, 9)
               .fillAndStroke('#2d214c', '#d4a843');
            doc.font('Helvetica-Bold')
               .fontSize(8)
               .fillColor('#f7e7c5')
               .text('★ OFFICIAL DELEGATE BOARDING PASS ★', cardX + cardW / 2 - 100, cardY + 87, { align: 'center', width: 200 });

            // ── TEAR-OFF / PERFORATION LINE ──
            const ripY = cardY + 120;
            doc.save();
            doc.lineWidth(1)
               .strokeColor('#5a4478')
               .dash(4, { space: 4 })
               .moveTo(cardX + 10, ripY)
               .lineTo(cardX + cardW - 10, ripY)
               .stroke();
            doc.restore();

            // ── DELEGATE DETAILS & QR CODE GRID ──
            const contentY = ripY + 20;

            // Generate high-res QR code image as PNG buffer
            const qrText = 'WWI-CC26:' + (reg.id || '').trim();
            const qrPngBuffer = await QRCode.toBuffer(qrText, {
                width: 320,
                margin: 2,
                color: { dark: '#0f0c1b', light: '#ffffff' }
            });

            // Right Column: QR Code Box
            const qrBoxW = 160;
            const qrBoxH = 205;
            const qrBoxX = cardX + cardW - qrBoxW - 20;
            const qrBoxY = contentY;

            doc.roundedRect(qrBoxX, qrBoxY, qrBoxW, qrBoxH, 8)
               .fillAndStroke('#1d1730', '#8d6aae');

            doc.font('Helvetica-Bold')
               .fontSize(8.5)
               .fillColor('#f7e7c5')
               .text('ENTRY SCANNER CODE', qrBoxX, qrBoxY + 10, { align: 'center', width: qrBoxW });

            // QR Image in white inner box
            doc.roundedRect(qrBoxX + 15, qrBoxY + 26, 130, 130, 6).fill('#ffffff');
            doc.image(qrPngBuffer, qrBoxX + 20, qrBoxY + 31, { width: 120, height: 120 });

            // Ticket ID badge below QR
            doc.roundedRect(qrBoxX + 15, qrBoxY + 164, 130, 28, 4)
               .fillAndStroke('#0f0c1b', '#d4a843');
            doc.font('Helvetica-Bold')
               .fontSize(11)
               .fillColor('#ffffff')
               .text(reg.id || 'WWI-TICKET', qrBoxX + 15, qrBoxY + 172, { align: 'center', width: 130 });

            // Left Column: Delegate Details
            const infoX = cardX + 22;
            const infoW = qrBoxX - infoX - 15;
            let currentInfoY = contentY;

            function renderField(label, value, isHighlight = false) {
                doc.font('Helvetica-Bold')
                   .fontSize(8)
                   .fillColor('#8d7ea4')
                   .text(label.toUpperCase(), infoX, currentInfoY);
                currentInfoY += 12;

                doc.font(isHighlight ? 'Helvetica-Bold' : 'Helvetica')
                   .fontSize(isHighlight ? 14 : 11)
                   .fillColor(isHighlight ? '#ffffff' : '#f7e7c5')
                   .text(value || 'N/A', infoX, currentInfoY, { width: infoW, lineBreak: true });

                const textH = doc.heightOfString(value || 'N/A', { width: infoW });
                currentInfoY += textH + 10;
            }

            renderField('Delegate Name', reg.name, true);
            renderField('College / Institution', reg.college);
            renderField('Academic Year & Stream', reg.year);

            // Visit Date & Verification pill
            const visitDate = (reg.year && reg.year.includes('__VD__'))
                ? reg.year.split('__VD__')[1]
                : (reg.visitDate || 'Both Days (08th & 09th October 2026)');

            renderField('Authorized Visit Date', visitDate);

            // ── VERIFIED STATUS BANNER ──
            const statusY = Math.max(currentInfoY + 5, qrBoxY + qrBoxH + 15);
            doc.roundedRect(cardX + 20, statusY, cardW - 40, 36, 6)
               .fillAndStroke('#132a1e', '#22c55e');

            doc.font('Helvetica-Bold')
               .fontSize(11)
               .fillColor('#4ade80')
               .text('✓ OFFICIAL VERIFIED PASS — ENTRY APPROVED', cardX + 20, statusY + 11, {
                   align: 'center',
                   width: cardW - 40
               });

            // ── EVENT SCHEDULE & VENUE DETAILS ──
            const scheduleY = statusY + 48;
            doc.roundedRect(cardX + 20, scheduleY, cardW - 40, 115, 8)
               .fillAndStroke('#1c172d', '#5a4478');

            doc.font('Helvetica-Bold')
               .fontSize(9.5)
               .fillColor('#d4a843')
               .text('EVENT SCHEDULE & ACCESS DETAILS', cardX + 32, scheduleY + 12);

            const col1X = cardX + 32;
            const col2X = cardX + 270;
            const schedTextY = scheduleY + 32;

            doc.font('Helvetica-Bold').fontSize(8).fillColor('#a882c8').text('DATES:', col1X, schedTextY);
            doc.font('Helvetica').fontSize(8.5).fillColor('#ffffff').text('08th & 09th October 2026 (09:30 AM onwards)', col1X + 45, schedTextY);

            doc.font('Helvetica-Bold').fontSize(8).fillColor('#a882c8').text('VENUE:', col1X, schedTextY + 18);
            doc.font('Helvetica').fontSize(8.5).fillColor('#ffffff').text('Whistling Woods International, Film City Complex,', col1X + 45, schedTextY + 18);
            doc.font('Helvetica').fontSize(8.5).fillColor('#ffffff').text('Goregaon (East), Mumbai - 400065', col1X + 45, schedTextY + 30);

            doc.font('Helvetica-Bold').fontSize(8).fillColor('#a882c8').text('INCLUDES:', col2X, schedTextY);
            doc.font('Helvetica').fontSize(8).fillColor('#ffffff').text('• Masterclasses with top Film Industry Icons', col2X + 55, schedTextY);
            doc.font('Helvetica').fontSize(8).fillColor('#ffffff').text('• Celebrity Panel Discussions & Live Workshops', col2X + 55, schedTextY + 14);
            doc.font('Helvetica').fontSize(8).fillColor('#ffffff').text('• Sound & Foley Stages, VR & Animation Demos', col2X + 55, schedTextY + 28);
            doc.font('Helvetica').fontSize(8).fillColor('#ffffff').text('• Guided Campus Film City Set Walkthrough', col2X + 55, schedTextY + 42);

            // ── IMPORTANT INSTRUCTIONS / SECURITY GUIDELINES ──
            const rulesY = scheduleY + 125;
            doc.roundedRect(cardX + 20, rulesY, cardW - 40, 110, 8)
               .fillAndStroke('#191428', '#382a52');

            doc.font('Helvetica-Bold')
               .fontSize(9)
               .fillColor('#f7e7c5')
               .text('IMPORTANT SECURITY & GATE ENTRY INSTRUCTIONS:', cardX + 32, rulesY + 12);

            const rules = [
                '1. Bring a physical or digital copy of this pass + your valid College/Student ID Card for gate verification.',
                '2. Shuttle Bus Service: Starts 7:30 AM (every 20-30 mins) from McDonald\'s, ~200m from Goregaon Station.',
                '3. Please reach the venue on your registered date. Entry is permitted ONLY for verified delegates.',
                (reg.hideWhatsApp || (reg.id && String(reg.id).startsWith('NAG-')))
                    ? '4. Follow event crew instructions and adhere to campus decorum throughout your visit.'
                    : '4. Join the official WhatsApp Community for live schedules, stage timings & shuttle bus updates.'
            ];

            let ruleY = rulesY + 30;
            rules.forEach(r => {
                doc.font('Helvetica').fontSize(7.8).fillColor('#c5bace').text(r, cardX + 32, ruleY, { width: cardW - 64 });
                ruleY += 17;
            });

            // ── FOOTER BAR ──
            const footerY = cardY + cardH - 45;
            doc.rect(cardX, footerY, cardW, 45).fill('#130f21');

            if (fs.existsSync(careerbeamLogoPath)) {
                try {
                    doc.image(careerbeamLogoPath, cardX + 20, footerY + 8, { height: 28 });
                } catch(e) {}
            }

            doc.font('Helvetica')
               .fontSize(7.5)
               .fillColor('#8d7ea4')
               .text('Celebrate Cinema 2026 Academic Trek • Powered by CareerBeam (careerbeam.in)', cardX + 110, footerY + 13);

            doc.font('Helvetica')
               .fontSize(7)
               .fillColor('#6a5d7c')
               .text('For queries, contact support@careerbeam.in or the campus delegation ambassador.', cardX + 110, footerY + 26);

            doc.font('Helvetica-Bold')
               .fontSize(7.5)
               .fillColor('#d4a843')
               .text('NON-TRANSFERABLE', cardX + cardW - 120, footerY + 18, { align: 'right', width: 100 });

            doc.end();
        } catch(err) {
            reject(err);
        }
    });
}

module.exports = { generateTicketPdf };

// CLI test
if (require.main === module) {
    (async () => {
        const testReg = {
            id: 'ROT-199824',
            name: 'Manikal Pal',
            college: 'Sydenham College of Commerce and Economics',
            year: 'SY B.Com (Accounts & Finance)',
            visitDate: 'Both Days (08th & 09th Oct 2026)',
            timestamp: new Date().toISOString()
        };
        const outPath = path.join(__dirname, 'test_boarding_pass.pdf');
        const buf = await generateTicketPdf(testReg);
        fs.writeFileSync(outPath, buf);
        console.log('Test PDF generated successfully! Bytes:', buf.length, 'Path:', outPath);
    })().catch(console.error);
}
