/**
 * CELEBRATE CINEMA 2026 — IMPORT HSNC-COLLAB REGISTRATIONS
 * 
 * Imports delegates from "HSNC University × Celebrate Cinema 2026 (Responses)-Vigor reference.xlsx" into Supabase:
 * - Ticket ID prefix: HSN-XXXXXX
 * - Referred By: HSNC-COLLAB
 * - Coupon / Txn ID: FREE-HSNC
 * - Verified: true (100% complimentary academic delegation pass)
 * 
 * Usage:
 *   node import_hsnc_registrations.js
 */

const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

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

function cleanEmail(em) {
    let email = String(em || '').trim().toLowerCase();
    email = email.replace(/@gamil\.com$/, '@gmail.com');
    email = email.replace(/@g-mail\.com$/, '@gmail.com');
    email = email.replace(/@gnail\.com$/, '@gmail.com');
    email = email.replace(/@gamail\.com$/, '@gmail.com');
    email = email.replace(/@gmail\.co$/, '@gmail.com');
    email = email.replace(/\.comp$/, '.com');
    return email;
}

function cleanPhone(p) {
    const digits = String(p || '').replace(/\D/g, '');
    return digits.length >= 10 ? digits.slice(-10) : digits;
}

function parseVisitDate(raw) {
    const s = String(raw || '').toLowerCase();
    if (s.includes('day 2') || s.includes('09') || s.includes('second')) return '09th October 2026 (Day 2)';
    if (s.includes('day 1') || s.includes('08') || s.includes('first')) return '08th October 2026 (Day 1)';
    return 'Both Days (08th & 09th Oct)';
}

async function main() {
    const excelFile = path.join(__dirname, 'HSNC University × Celebrate Cinema 2026 (Responses)-Vigor reference.xlsx');
    if (!fs.existsSync(excelFile)) {
        console.error(`File not found: ${excelFile}`);
        process.exit(1);
    }

    console.log('\n======================================================');
    console.log('   IMPORTING HSNC-COLLAB REGISTRATIONS INTO SUPABASE   ');
    console.log('======================================================\n');
    console.log(`Reading: ${excelFile}`);

    const wb = xlsx.readFile(excelFile);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rawRows = xlsx.utils.sheet_to_json(sheet);
    console.log(`✓ Loaded ${rawRows.length} rows from Excel.\n`);

    // Prepare records
    const usedIds = new Set();
    const records = [];

    rawRows.forEach((row, idx) => {
        const name = (row['Your Full Name'] || 'HSNC Delegate').trim();
        const email = cleanEmail(row['Email address']);
        const phone = cleanPhone(row['Mobile Number']);
        const college = (row['Name Of Your Educational Institute (Example- HSNCU- DM Harish Law School) (If not available type N/A)'] || 'HSNC University').trim();
        const visitDate = parseVisitDate(row['How many days will you attend']);
        const age = row['Your Age'] ? `Age ${row['Your Age']}` : 'Student Delegate';
        const yearWithVd = `${age}__VD__${visitDate}`;

        // Generate unique 6-digit ticket ID
        let num;
        let ticketId;
        do {
            num = Math.floor(100000 + Math.random() * 900000);
            ticketId = `HSN-${num}`;
        } while (usedIds.has(ticketId));
        usedIds.add(ticketId);

        // Referral code
        const refPrefix = name.replace(/[^a-zA-Z]/g, '').substring(0, 4).toUpperCase() || 'HSNC';
        const referralCode = refPrefix + Math.floor(1000 + Math.random() * 9000);

        records.push({
            id: ticketId,
            name: name,
            email: email,
            phone: phone,
            college: college,
            year: yearWithVd,
            referral_code: referralCode,
            referred_by: 'HSNC-COLLAB',
            coupon_used: 'FREE-HSNC',
            base_price: 0,
            early_bird_discount: 0,
            coupon_discount: 0,
            final_price: 0,
            transaction_id: 'FREE-HSNC',
            payment_screenshot: '',
            verified: true,
            attended: false,
            attended_at: null,
            timestamp: new Date().toISOString()
        });
    });

    console.log(`Generated ${records.length} database records with HSN-XXXXXX ticket IDs.`);

    // Save backup JSON
    const backupPath = path.join(__dirname, 'hsnc_imported_registrations.json');
    fs.writeFileSync(backupPath, JSON.stringify(records, null, 2));
    console.log(`✓ Saved local backup to: ${backupPath}`);

    // Insert in batches of 100 into Supabase
    const BATCH_SIZE = 100;
    let totalInserted = 0;

    for (let i = 0; i < records.length; i += BATCH_SIZE) {
        const batch = records.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(records.length / BATCH_SIZE);

        console.log(`Uploading batch ${batchNum}/${totalBatches} (${batch.length} records)...`);

        const res = await fetch(`${SUPABASE_URL}/rest/v1/registrations`, {
            method: 'POST',
            headers: {
                apikey: SUPABASE_KEY,
                Authorization: `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'resolution=merge-duplicates'
            },
            body: JSON.stringify(batch)
        });

        if (!res.ok) {
            const err = await res.text();
            console.error(`❌ Batch ${batchNum} failed (${res.status}): ${err}`);
            process.exit(1);
        }

        totalInserted += batch.length;
        console.log(`✓ Batch ${batchNum} successfully saved in Supabase.`);
    }

    console.log('\n======================================================');
    console.log(`🎉 ALL ${totalInserted} HSNC-COLLAB REGISTRATIONS UPLOADED SUCCESSFULLY!`);
    console.log('======================================================\n');
}

main().catch(err => {
    console.error('Fatal import error:', err);
    process.exit(1);
});
