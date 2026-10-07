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

    const freeTanishka = list.filter(r => {
        const t = (r.transaction_id || '').toUpperCase();
        const c = (r.coupon_used || '').toUpperCase();
        const ref = (r.referred_by || '').toUpperCase();
        return t === 'FREE-TANISHKA' || c === 'FREE-TANISHKA' || ref === 'COLLEGE:TANISHKA' || ref.includes('TANISHKA');
    });

    console.log('Total FREE-TANISHKA / TANISHKA link registrations:', freeTanishka.length);
    const nonCollege = freeTanishka.filter(r => r.referred_by !== 'college:tanishka');
    console.log('Non-college:tanishka referred_by count:', nonCollege.length);
    nonCollege.forEach(r => {
        console.log(`ID: ${r.id} | Name: ${r.name} | RefBy: '${r.referred_by}' | Txn: '${r.transaction_id}' | Coupon: '${r.coupon_used}'`);
    });
}
check().catch(console.error);
