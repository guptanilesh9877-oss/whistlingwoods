const fs = require('fs');
const path = require('path');
const { rawTsv } = require('./nagesh_new_batch_raw');

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
    if (s.includes('second')) return '09th October 2026 (Day 2)';
    if (s.includes('first')) return '08th October 2026 (Day 1)';
    return 'Both Days (08th & 09th Oct)';
}

async function run() {
    const lines = rawTsv.trim().split('\n');
    const header = lines[0].split('\t');
    const rows = lines.slice(1);

    console.log(`Parsed ${rows.length} rows from raw TSV data.`);

    const parsedRecords = [];
    rows.forEach((line, idx) => {
        const cols = line.split('\t').map(c => c.trim());
        if (cols.length < 9) {
            console.warn(`Line ${idx + 1} has insufficient columns (${cols.length})`);
            return;
        }

        const [timestamp, emailRaw, name, age, gender, visitDateRaw, location, phoneRaw, college] = cols;
        const email = cleanEmail(emailRaw);
        const phone = cleanPhone(phoneRaw);
        const visitDate = parseVisitDate(visitDateRaw);

        parsedRecords.push({
            timestamp,
            email,
            name,
            age,
            gender,
            visitDate,
            location,
            phone,
            college
        });
    });

    console.log(`Valid records extracted: ${parsedRecords.length}`);

    // Check existing in Supabase
    const emails = parsedRecords.map(r => r.email);
    const existingMap = new Map();

    for (let i = 0; i < emails.length; i += 20) {
        const slice = emails.slice(i, i + 20);
        const filter = slice.map(e => `email.eq.${encodeURIComponent(e)}`).join(',');
        const res = await fetch(`${SUPABASE_URL}/rest/v1/registrations?or=(${filter})&select=id,name,email,referred_by`, {
            headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
        });
        if (res.ok) {
            const data = await res.json();
            data.forEach(d => existingMap.set(d.email.toLowerCase(), d));
        }
    }

    console.log(`\nExisting in Supabase: ${existingMap.size} of ${parsedRecords.length}`);
    parsedRecords.forEach(r => {
        if (existingMap.has(r.email)) {
            const ex = existingMap.get(r.email);
            console.log(`  - Match: ${r.email} => existing id: ${ex.id}, ref: ${ex.referred_by}`);
        }
    });
}

run().catch(console.error);
