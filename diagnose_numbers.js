const fs = require('fs');
const path = require('path');

const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJueWxweGZqaHhwbWp3b2xzcWNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwOTgwMDEsImV4cCI6MjEwMzY3NDAwMX0.ms0YzXZ2Lb-VFpqEjD9BrAYzDp81ZklQwCwNnkyP6U8';
const SUPABASE_URL = 'https://rnylpxfjhxpmjwolsqcd.supabase.co';

async function main() {
  const cfgUrl = `${SUPABASE_URL}/rest/v1/registrations?id=eq.CONFIG_COLLEGES&select=*`;
  const cfgRes = await fetch(cfgUrl, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } });
  const cfgData = await cfgRes.json();
  const collegeJson = cfgData[0].payment_screenshot;

  const mockLocalStorage = {
    _data: { 'wwi_cc26_colleges': collegeJson },
    getItem: function(k) { return this._data[k] || null; },
    setItem: function(k, v) { this._data[k] = String(v); }
  };
  global.window = { localStorage: mockLocalStorage };
  global.localStorage = mockLocalStorage;

  const dataJs = fs.readFileSync(path.join(__dirname, 'data.js'), 'utf8');
  eval(dataJs);

  const ds = global.dataStore || window.dataStore;
  await ds.syncFromSupabase();

  const regs = ds.getRegistrations();
  const partnerColleges = ds.getCollegePartners();

  // Trace getTeamReferralStats
  console.log('Partner colleges count:', partnerColleges.length);
  partnerColleges.forEach(c => {
    console.log(`College: ${c.slug} | referralCodes: ${JSON.stringify(c.referralCodes)}`);
  });

}

main().catch(console.error);
