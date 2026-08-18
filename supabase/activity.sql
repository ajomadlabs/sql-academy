-- ============================================================
--  Per-day activity, for the streak graph
-- ============================================================
--  The progress table recorded which problems were solved and the single
--  most recent study date. That is enough for a streak counter and not
--  enough to draw anything: a contribution graph needs to know what
--  happened on each day, which was never kept.
--
--  So the graph starts from the day this ships. Existing history cannot
--  be reconstructed, and inventing plausible squares would be worse than
--  an empty chart.
--
--  Shape: {"2026-08-19": 7, "2026-08-20": 3} — one count per calendar
--  day. Small enough to travel with the row it belongs to, which keeps
--  it inside the same row level security as everything else.
-- ============================================================

alter table public.progress
  add column if not exists activity jsonb not null default '{}'::jsonb;

comment on column public.progress.activity is
  'Per-day counts of problems solved and days completed. Drives the streak graph.';

select 'activity column ready' as result,
       (select count(*) from public.progress) as rows_present;
