-- ============================================================
--  SQL Academy — activity log
-- ============================================================
--  Run once in the Supabase SQL Editor, after schema.sql.
--
--  Replaces the `activity` jsonb blob on public.progress as the
--  source of truth for the contribution graph. The blob could only
--  ever hold counts-per-day written wholesale by whichever device
--  synced last, which meant two devices could not both be right and
--  nothing could be reconstructed once it drifted. This is the
--  history itself: one row per thing completed, written once.
-- ============================================================

create table if not exists public.activity_log (
    user_id    uuid        not null references auth.users(id) on delete cascade,
    kind       text        not null check (kind in ('p', 'd')),  -- problem | day
    ref        text        not null,                             -- 'p3_1' | '12'
    done_on    date,                                             -- null: see below
    created_at timestamptz not null default now(),

    -- The natural key IS the identity of the event: a given problem is
    -- first finished exactly once. Making it the primary key is what
    -- lets the client retry, replay an offline queue, or sync from two
    -- devices without ever double-counting -- every write is an upsert
    -- that does nothing the second time. Correctness here comes from
    -- the constraint, not from the client being careful.
    primary key (user_id, kind, ref)
);

-- done_on is the LOCAL date on the device that recorded it, not now().
-- The server runs UTC, so deriving the date here would file evening
-- work in India under the previous day and put a visible hole in the
-- graph. The client is the only party that knows the user's calendar.
--
-- null means "finished before the log existed": genuinely undated, not
-- unknown-so-guess. Those rows are counted, never drawn on a square.

-- A client-supplied date needs a bound, or one device with a wrong
-- clock writes a mark years out and stretches the graph to fit it.
-- The bound is split in two because a CHECK constraint may only
-- contain immutable expressions -- current_date is not one, and
-- Postgres rejects it here. So the constraint carries the fixed
-- sanity range, and the "not in the future" half rides on the insert
-- policy below, where stable functions are allowed. That is the better
-- home for it anyway: it is a security boundary, not a data type.
alter table public.activity_log drop constraint if exists activity_log_done_on_sane;
alter table public.activity_log add  constraint activity_log_done_on_sane
    check (done_on is null or done_on between date '2024-01-01' and date '2100-01-01');

create index if not exists activity_log_user_day
    on public.activity_log (user_id, done_on desc);

alter table public.activity_log enable row level security;

-- Supabase hands new tables TRUNCATE to both roles by default, and
-- TRUNCATE bypasses RLS entirely -- one signed-in user could empty
-- everyone's history. Strip it all back, then grant only what is used.
revoke all on public.activity_log from anon, authenticated;
grant select, insert on public.activity_log to authenticated;

-- No update and no delete, by omission and on purpose. The log is
-- append-only: that you finished something on a given day stays true
-- even if you later untick it, and history you can rewrite is not
-- history. Un-ticking is a progress concern, handled on public.progress.
drop policy if exists "read own activity"   on public.activity_log;
drop policy if exists "insert own activity" on public.activity_log;

create policy "read own activity" on public.activity_log
    for select using (auth.uid() = user_id);

create policy "insert own activity" on public.activity_log
    for insert with check (
        auth.uid() = user_id
        -- a day of slack: a device legitimately sits ahead of UTC
        and (done_on is null or done_on <= current_date + 1));

-- ---------- what the graph reads ----------
-- One call returns the whole card: a count per day, plus the undated
-- total. Aggregating in the database rather than shipping a row per
-- problem keeps the payload flat as someone's history grows.
create or replace function public.activity_summary(since date default null)
returns json
language sql
security invoker          -- runs as the caller, so RLS above applies
stable
set search_path = public, pg_catalog
as $$
  select json_build_object(
    'days', coalesce((
      select json_object_agg(to_char(done_on, 'YYYY-MM-DD'), json_build_object('p', p, 'd', d))
      from (
        select done_on,
               count(*) filter (where kind = 'p') as p,
               count(*) filter (where kind = 'd') as d
        from public.activity_log
        where user_id = auth.uid()
          and done_on is not null
          and (since is null or done_on >= since)
        group by done_on
      ) t
    ), '{}'::json),
    'undated', (
      select json_build_object(
               'p', count(*) filter (where kind = 'p'),
               'd', count(*) filter (where kind = 'd'))
      from public.activity_log
      where user_id = auth.uid() and done_on is null
    )
  );
$$;

-- Postgres grants EXECUTE on new functions to PUBLIC, which would hand
-- it to anon as well. Take it back before granting deliberately.
revoke all on function public.activity_summary(date) from public, anon;
grant execute on function public.activity_summary(date) to authenticated;

select 'activity_log ready' as status,
       (select count(*) from public.activity_log) as rows_present;
