-- ============================================================
--  SQL Academy — Supabase schema
-- ============================================================
--  Run this once in the Supabase SQL Editor.
--
--  SECURITY NOTE, read before deploying:
--  The anon key shipped in the front end is PUBLIC by design. It is
--  safe ONLY because every table below has Row Level Security on and
--  a policy restricting access to auth.uid(). If you add a table
--  later, enable RLS on it in the same commit. A table without RLS
--  is readable and writable by anyone who visits the site.
-- ============================================================

-- ---------- progress: exactly one row per user ----------
-- Progress is small (a few hundred booleans), so it lives in two
-- jsonb blobs rather than a row per problem. That makes sync a
-- single upsert and keeps read cost at one row.
create table if not exists public.progress (
    user_id      uuid primary key references auth.users(id) on delete cascade,
    days         jsonb       not null default '{}'::jsonb,   -- {"1":true,...}
    problems     jsonb       not null default '{}'::jsonb,   -- {"p1_0":true,...}
    streak       int         not null default 0,
    best_streak  int         not null default 0,
    last_studied date,
    xp           int         not null default 0,
    display_name text,
    updated_at   timestamptz not null default now()
);

alter table public.progress enable row level security;

-- ---------- table-level privileges ----------
-- RLS filters WHICH ROWS a role may touch; it does not grant access to
-- the table in the first place. Both are required. Tables created from
-- the SQL editor do not inherit the dashboard's automatic grants, so
-- without this a signed-in user gets "permission denied" and sync fails
-- silently. anon is deliberately granted nothing.
-- Supabase's default privileges hand new tables TRUNCATE, TRIGGER and
-- REFERENCES to both roles. TRUNCATE is the dangerous one: it BYPASSES
-- RLS entirely, so any signed-in user holding it could empty the whole
-- table. Strip everything back, then grant only what is needed.
revoke all on public.progress from anon, authenticated;
grant select, insert, update on public.progress to authenticated;

-- A user may only ever touch their own row.
drop policy if exists "read own progress"   on public.progress;
drop policy if exists "insert own progress" on public.progress;
drop policy if exists "update own progress" on public.progress;

create policy "read own progress"   on public.progress
    for select using (auth.uid() = user_id);

create policy "insert own progress" on public.progress
    for insert with check (auth.uid() = user_id);

create policy "update own progress" on public.progress
    for update using (auth.uid() = user_id)
             with check (auth.uid() = user_id);

-- No delete policy: nothing should be deleting progress rows from the
-- client. Cascade from auth.users handles account deletion.

-- ---------- keep updated_at honest ----------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
    new.updated_at = now();
    return new;
end $$;

drop trigger if exists progress_touch on public.progress;
create trigger progress_touch
    before update on public.progress
    for each row execute function public.touch_updated_at();

-- ---------- create the row automatically on signup ----------
-- Without this the client has to handle "row does not exist yet".
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
    insert into public.progress (user_id, display_name)
    values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
    on conflict (user_id) do nothing;
    return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- ============================================================
--  Verification — this is the LAST statement, so its output is
--  what the SQL editor will show you. Expect exactly 3 rows,
--  all with rls_enabled = true.
-- ============================================================
select p.policyname,
       p.cmd,
       c.relrowsecurity as rls_enabled
from   pg_policies p
join   pg_class c on c.relname = p.tablename
where  p.tablename = 'progress';
