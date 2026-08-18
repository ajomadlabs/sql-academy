/* Generates supabase/lab/02-dataset.sql from the practice schema and the
   full seed, so the remote lab and the local Docker database are never
   two different datasets that drifted apart. The only change is where
   the tables land: search_path puts them in lab_shared instead of public. */
const fs = require('fs');

const schema = fs.readFileSync('practice/01-schema.sql', 'utf8');
const seed   = fs.readFileSync('practice/02-seed.sql', 'utf8');

const header = `-- ============================================================
--  Lab, part 2 of 3 — the dataset  (GENERATED, do not edit)
--  Regenerate with: node scripts/build-lab-sql.js
-- ============================================================
--
--  Built from practice/01-schema.sql and practice/02-seed.sql so the
--  remote lab and the local database cannot drift apart.
--
--  This builds roughly 900k rows with generate_series, so it is a small
--  script that does a lot of work -- expect it to take a minute or two.
--  If the SQL editor times out, run it in the two halves marked below.
-- ============================================================

set search_path = lab_shared, public;

`;

// The schema file drops tables first; inside lab_shared that is what we want.
const body = header
  + '-- ---------- structure ----------\n' + schema + '\n\n'
  + '-- ---------- data ----------\n'
  + '-- If the editor times out, stop after the orders insert and run the rest\n'
  + '-- as a second statement; nothing here depends on being in one transaction.\n'
  + seed + '\n\n'
  + `-- The learner role can only read what exists at the time it is granted.
grant select on all tables in schema lab_shared to lab_runner;

-- CREATE INDEX requires owning the table -- it is not a privilege that can
-- be granted -- and building an index is the entire point of Module 4. So
-- lab_runner owns the dataset.
--
-- That sounds alarming and is not, for one reason: lab_runner is only ever
-- reached through lab_run(), which rolls back everything it did before it
-- returns. Ownership lets a learner CREATE INDEX, and also DROP TABLE, but
-- neither one outlives the call. Nothing else in the project can log in as
-- this role, and it has no rights outside these two schemas.
do $$
declare r record;
begin
  for r in select tablename from pg_tables where schemaname = 'lab_shared'
  loop
    execute format('alter table lab_shared.%I owner to lab_runner', r.tablename);
  end loop;
end $$;

-- Deliberately no indexes beyond the primary keys: Module 4 is where you
-- add them yourself and measure the difference. Starting indexed would
-- remove the entire lesson.
analyze;
`;

fs.writeFileSync('supabase/lab/02-dataset.sql', body);
const rows = [...seed.matchAll(/generate_series\(1,\s*([0-9]+)\)/g)].map(m => +m[1]);
console.log('wrote supabase/lab/02-dataset.sql');
console.log('  generates about', rows.reduce((a, b) => a + b, 0).toLocaleString(), 'base rows',
            '(order_items and payments multiply that)');
