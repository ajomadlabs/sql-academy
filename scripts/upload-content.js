/* Pushes the lessons into the database.

   Run:  SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/upload-content.js

   The key is read from the environment and never written down. It is the
   service key, so it bypasses row level security -- which is the point,
   since the table is readable only by signed-in users and this is not a
   signed-in user. It must never end up in the repo or in a browser. */
const fs = require('fs');

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;
if (!url || !key) {
  console.error('set SUPABASE_URL and SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const content = JSON.parse(fs.readFileSync('build/content.json', 'utf8'));

(async () => {
  // Upserted in batches: one request per lesson is 48 round trips, and one
  // request with all of them is a payload big enough to be refused.
  const SIZE = 8;
  let done = 0;
  for (let i = 0; i < content.length; i += SIZE) {
    const batch = content.slice(i, i + SIZE);
    const res = await fetch(`${url}/rest/v1/content?on_conflict=day`, {
      method: 'POST',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates,return=minimal'
      },
      body: JSON.stringify(batch.map(c => ({ day: c.day, body: c.body, sol: c.sol })))
    });
    if (!res.ok) {
      console.error(`batch at day ${batch[0].day} failed: ${res.status} ${await res.text()}`);
      process.exit(1);
    }
    done += batch.length;
    process.stdout.write(`\r  uploaded ${done}/${content.length} lessons`);
  }
  console.log('\n  done');
})();
