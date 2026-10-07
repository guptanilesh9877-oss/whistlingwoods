/**
 * CHECK DUPLICATES BETWEEN PROVIDED LIST AND SUPABASE DATABASE
 */

const fs = require('fs');
const path = require('path');

const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJueWxweGZqaHhwbWp3b2xzcWNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwOTgwMDEsImV4cCI6MjEwMzY3NDAwMX0.ms0YzXZ2Lb-VFpqEjD9BrAYzDp81ZklQwCwNnkyP6U8';
const SUPABASE_URL = 'https://rnylpxfjhxpmjwolsqcd.supabase.co';

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

function cleanPhone(ph) {
    const digits = String(ph || '').replace(/\D/g, '');
    if (digits.length >= 10) {
        return digits.slice(-10);
    }
    return digits;
}

function parseTSV(text) {
    const rows = [];
    let curRow = [];
    let curCell = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (c === '"') {
            inQuotes = !inQuotes;
        } else if (c === '\t' && !inQuotes) {
            curRow.push(curCell.trim());
            curCell = '';
        } else if ((c === '\r' || c === '\n') && !inQuotes) {
            if (c === '\r' && text[i+1] === '\n') {
                i++;
            }
            curRow.push(curCell.trim());
            if (curRow.some(cell => cell.length > 0)) {
                rows.push(curRow);
            }
            curRow = [];
            curCell = '';
        } else {
            curCell += c;
        }
    }
    if (curCell.length > 0) curRow.push(curCell.trim());
    if (curRow.some(cell => cell.length > 0)) rows.push(curRow);
    return rows;
}

async function fetchAllDatabaseRegistrations() {
    const list = [];
    console.log('📡 Fetching all database registrations from Supabase...');
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
        console.log(`   Fetched ${batch.length} (total so far: ${list.length})...`);
        if (batch.length < 1000) break;
    }
    return list;
}

async function run() {
    const rawContent = fs.readFileSync('scratch_input_list_full.txt', 'utf8');
    const startIdx = rawContent.indexOf('Email Address\tName');
    const endIdx = rawContent.indexOf('is duplicate data also there in this who are already registered ?');
    const tableText = rawContent.slice(startIdx, endIdx);

    const rawRows = parseTSV(tableText);
    console.log(`Parsed raw TSV rows: ${rawRows.length} (including header)`);

    const header = rawRows[0];
    const dataRows = rawRows.slice(1);

    const EMAIL_REGEX = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;

    const inputRecords = [];
    for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const rowLine = row.join('\t');
        const emailMatch = rowLine.match(EMAIL_REGEX);
        
        let email = '';
        let name = '';
        let phone = '';
        let college = '';
        let days = '';

        if (row[0] && row[0].includes('@')) {
            email = row[0];
            name = row[1] || '';
            phone = row[2] || '';
            college = row[4] || '';
            days = row[5] || '';
        } else if (emailMatch) {
            email = emailMatch[1];
            // Name was before email or after
            const emIdx = row.findIndex(c => c.includes('@'));
            if (emIdx > 0) {
                name = row[0] || '';
                phone = row[emIdx + 1] || '';
                college = row[emIdx + 3] || row[4] || '';
                days = row[emIdx + 4] || row[5] || '';
            } else {
                name = row[1] || '';
                phone = row[2] || '';
                college = row[4] || '';
                days = row[5] || '';
            }
        }

        const cleanedEmail = cleanEmail(email);
        const cleanedPhone = cleanPhone(phone);

        inputRecords.push({
            rowNumber: i + 2, // 1-based, accounting for header
            rawEmail: email,
            cleanEmail: cleanedEmail,
            rawPhone: phone,
            cleanPhone: cleanedPhone,
            name: name.trim(),
            college: college.trim(),
            days: days.trim()
        });
    }

    console.log(`\n======================================================`);
    console.log(`1. INPUT LIST INTERNAL AUDIT`);
    console.log(`======================================================`);
    console.log(`Total rows in provided list: ${inputRecords.length}`);

    // Check internal duplicates within the provided list
    const emailOccurrences = new Map();
    const phoneOccurrences = new Map();

    for (const rec of inputRecords) {
        if (rec.cleanEmail) {
            if (!emailOccurrences.has(rec.cleanEmail)) emailOccurrences.set(rec.cleanEmail, []);
            emailOccurrences.get(rec.cleanEmail).push(rec);
        }
        if (rec.cleanPhone && rec.cleanPhone.length === 10) {
            if (!phoneOccurrences.has(rec.cleanPhone)) phoneOccurrences.set(rec.cleanPhone, []);
            phoneOccurrences.get(rec.cleanPhone).push(rec);
        }
    }

    const internalEmailDupes = Array.from(emailOccurrences.entries()).filter(([em, list]) => list.length > 1);
    const internalPhoneDupes = Array.from(phoneOccurrences.entries()).filter(([ph, list]) => list.length > 1);

    console.log(`Unique emails in provided list: ${emailOccurrences.size}`);
    console.log(`Internal duplicate emails in list: ${internalEmailDupes.length} emails (accounting for ${internalEmailDupes.reduce((acc, [, l]) => acc + l.length, 0)} rows)`);
    console.log(`Unique 10-digit phones in provided list: ${phoneOccurrences.size}`);
    console.log(`Internal duplicate phones in list: ${internalPhoneDupes.length} phone numbers`);

    // Fetch database registrations
    const dbRegistrations = await fetchAllDatabaseRegistrations();
    console.log(`\n======================================================`);
    console.log(`2. SUPABASE DATABASE CROSS-CHECK`);
    console.log(`======================================================`);
    console.log(`Total database registrations: ${dbRegistrations.length}`);

    const dbByEmail = new Map();
    const dbByPhone = new Map();

    for (const r of dbRegistrations) {
        const em = cleanEmail(r.email);
        const ph = cleanPhone(r.phone);

        if (em) {
            if (!dbByEmail.has(em)) dbByEmail.set(em, []);
            dbByEmail.get(em).push(r);
        }
        if (ph && ph.length === 10) {
            if (!dbByPhone.has(ph)) dbByPhone.set(ph, []);
            dbByPhone.get(ph).push(r);
        }
    }

    // Now cross-check input against database
    const alreadyRegisteredByEmail = [];
    const alreadyRegisteredByPhoneOnly = [];
    const notRegisteredInDB = [];

    const matchedDbRecords = new Set();

    for (const rec of inputRecords) {
        const emailMatches = rec.cleanEmail ? dbByEmail.get(rec.cleanEmail) : null;
        const phoneMatches = (rec.cleanPhone && rec.cleanPhone.length === 10) ? dbByPhone.get(rec.cleanPhone) : null;

        if (emailMatches && emailMatches.length > 0) {
            emailMatches.forEach(m => matchedDbRecords.add(m.id));
            alreadyRegisteredByEmail.push({
                input: rec,
                dbMatches: emailMatches,
                matchType: 'EMAIL'
            });
        } else if (phoneMatches && phoneMatches.length > 0) {
            phoneMatches.forEach(m => matchedDbRecords.add(m.id));
            alreadyRegisteredByPhoneOnly.push({
                input: rec,
                dbMatches: phoneMatches,
                matchType: 'PHONE_ONLY'
            });
        } else {
            notRegisteredInDB.push(rec);
        }
    }

    console.log(`\n======================================================`);
    console.log(`RESULTS BREAKDOWN:`);
    console.log(`======================================================`);
    console.log(`Total rows evaluated: ${inputRecords.length}`);
    console.log(`↳ ALREADY REGISTERED in Database:`);
    console.log(`   - Matched by Email:        ${alreadyRegisteredByEmail.length} rows`);
    console.log(`   - Matched by Phone Only:   ${alreadyRegisteredByPhoneOnly.length} rows`);
    console.log(`   - TOTAL ALREADY REGISTERED: ${alreadyRegisteredByEmail.length + alreadyRegisteredByPhoneOnly.length} rows`);
    console.log(`↳ NOT REGISTERED in Database: ${notRegisteredInDB.length} rows (new attendees)`);

    // Check verification status among already registered
    let verifiedCount = 0;
    let unverifiedCount = 0;
    const allAlreadyRegistered = [...alreadyRegisteredByEmail, ...alreadyRegisteredByPhoneOnly];
    
    for (const item of allAlreadyRegistered) {
        const hasVerified = item.dbMatches.some(m => m.verified === true);
        if (hasVerified) verifiedCount++;
        else unverifiedCount++;
    }

    console.log(`\nAmong those ALREADY REGISTERED (${allAlreadyRegistered.length}):`);
    console.log(`   - Already Verified in DB:   ${verifiedCount}`);
    console.log(`   - Still Unverified in DB:  ${unverifiedCount}`);

    // Save full JSON report
    const report = {
        totalInputRows: inputRecords.length,
        uniqueEmailsInInput: emailOccurrences.size,
        internalDuplicates: {
            emails: internalEmailDupes.map(([email, instances]) => ({
                email,
                count: instances.length,
                rows: instances.map(x => ({ row: x.rowNumber, name: x.name, college: x.college, phone: x.cleanPhone }))
            })),
            phones: internalPhoneDupes.map(([phone, instances]) => ({
                phone,
                count: instances.length,
                names: instances.map(x => x.name),
                emails: instances.map(x => x.cleanEmail)
            }))
        },
        databaseMatches: {
            totalAlreadyRegistered: allAlreadyRegistered.length,
            matchedByEmailCount: alreadyRegisteredByEmail.length,
            matchedByPhoneOnlyCount: alreadyRegisteredByPhoneOnly.length,
            verifiedCount,
            unverifiedCount,
            alreadyRegisteredSample: allAlreadyRegistered.slice(0, 50).map(x => ({
                inputName: x.input.name,
                inputEmail: x.input.cleanEmail,
                inputPhone: x.input.cleanPhone,
                inputCollege: x.input.college,
                matchType: x.matchType,
                dbTicketId: x.dbMatches[0].id,
                dbName: x.dbMatches[0].name,
                dbEmail: x.dbMatches[0].email,
                dbPhone: x.dbMatches[0].phone,
                dbVerified: x.dbMatches[0].verified,
                dbCollege: x.dbMatches[0].college
            })),
            notRegisteredCount: notRegisteredInDB.length,
            notRegisteredSample: notRegisteredInDB.slice(0, 30).map(x => ({
                name: x.name,
                email: x.cleanEmail,
                phone: x.cleanPhone,
                college: x.college
            }))
        }
    };

    fs.writeFileSync('duplicate_analysis_report.json', JSON.stringify(report, null, 2));
    console.log(`\n✓ Full detailed report saved to duplicate_analysis_report.json`);
}

run().catch(console.error);
