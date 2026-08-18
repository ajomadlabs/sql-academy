# The remote lab

Module 4 asks you to measure what an index does to a query. The
in-browser database cannot show you that — with fifty thousand rows the
plan changes and the clock does not move. This is a real Postgres with
the full ~900k-row dataset, so a sequential scan costs something you can
read off the page.

## What a learner can reach

One function, `public.lab_run(text[])`. Nothing else. It:

- refuses anyone who is not signed in
- counts calls per person per day (400), so one learner cannot spend the
  whole compute budget
- runs as `lab_runner`, a NOLOGIN role that can see `lab` and
  `lab_shared` and nothing else — not `auth`, not `public`, not anyone's
  progress
- caps each call at 10s of statement time and 4s of lock wait
- **rolls back everything it did before returning**

That last point is what makes it affordable. A learner can `CREATE INDEX`
on the real `orders` table, read a genuine `EXPLAIN ANALYZE`, and nothing
survives the call — so one shared copy of the dataset serves everyone
rather than one copy each.

`lab_runner` owns the tables, because `CREATE INDEX` requires ownership
and is not a grantable privilege. That means a learner could also write
`DROP TABLE orders` — and it will roll back like everything else. This
was tested: after `drop table orders`, all rows were still there.

## Applying it

Run these in the Supabase SQL editor, in order:

1. `01-roles.sql` — schemas, the `lab_runner` role, grants
2. `02-dataset.sql` — structure and ~900k rows. **Generated** — rebuild
   with `node scripts/build-lab-sql.js`, never edit by hand. It builds
   the rows with `generate_series`, so it is a small script that does a
   lot of work; expect a minute or two. If the editor times out, run it
   in two halves, splitting at the `orders` insert — nothing here needs
   to be in one transaction.
3. `03-runner.sql` — the function, and the ownership change that drops
   its privileges

Then set `lab: true` in `assets/config.js` and redeploy. Until that flag
is on, the option is not offered anywhere in the UI.

## Checking it worked

As a signed-in user, in the browser console on the site:

```js
await Lab.run("explain analyze select count(*) from orders where placed_at >= timestamp '2024-03-01' and placed_at < timestamp '2024-03-02'")
```

You should get a plan back with a real timing, and `remaining` counting
down from 400.

To confirm the rollback, run this twice — it must succeed both times,
which it only can if the first one was undone:

```js
await Lab.run("create index ix_check on orders(placed_at); explain analyze select count(*) from orders where placed_at > timestamp '2024-03-01'")
```

## Where it is used

Problems are marked for the lab by the build, not by hand: any answer
containing `EXPLAIN` or `CREATE INDEX` is one where cost is the point.
That is currently 18 problems across days 26 and 30–35. Those get an
engine switch in the editor; everything else stays local, where it is
instant and can be graded.

Grading always uses the in-browser database. That is the one every
expected answer was produced against, and a query plan is not something
you can compare row by row anyway.
