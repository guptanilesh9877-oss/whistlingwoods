const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJueWxweGZqaHhwbWp3b2xzcWNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwOTgwMDEsImV4cCI6MjEwMzY3NDAwMX0.ms0YzXZ2Lb-VFpqEjD9BrAYzDp81ZklQwCwNnkyP6U8';
const SUPABASE_URL = 'https://rnylpxfjhxpmjwolsqcd.supabase.co';

async function check() {
    let list = [];
    for (let off = 0; ; off += 1000) {
        const url = `${SUPABASE_URL}/rest/v1/registrations?select=id,name,email,phone,college,verified,timestamp,referral_code,referred_by,coupon_used,transaction_id,final_price&id=neq.CONFIG_COLLEGES&order=timestamp.desc&limit=1000&offset=${off}`;
        const res = await fetch(url, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } });
        const batch = await res.json();
        list.push(...batch);
        if (batch.length < 1000) break;
    }
    console.log('Total fetched:', list.length);

    const tanishkaRegs = list.filter(r => {
        const str = JSON.stringify(r).toUpperCase();
        return str.includes('TANISHKA');
    });

    console.log('Total Tanishka matches:', tanishkaRegs.length);
    tanishkaRegs.forEach((r, idx) => {
        console.log(`[${idx+1}] ID: ${r.id} | Name: ${r.name} | Email: ${r.email} | Phone: ${r.phone}`);
        console.log(`     RefBy: '${r.referred_by}' | RefCode: '${r.referral_code}' | Coupon: '${r.coupon_used}' | TxnId: '${r.transaction_id}' | Price: ${r.final_price} | Verified: ${r.verified} | Time: ${r.timestamp}\n`);
    });
}
check().catch(console.error);
