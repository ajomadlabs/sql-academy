-- ============================================================
--  Lab, part 1 of 3 — roles and schemas
--  Run this in the Supabase SQL editor, then 02, then 03.
-- ============================================================
--
--  What this is for: Module 4 teaches you to measure what an index
--  does to a query. The in-browser database is too small to show it,
--  and the concurrency exercises need two sessions, which a browser
--  cannot hold. Both need a real Postgres. This is that.
--
--  The safety model, in one line: learners never touch this database
--  directly -- they call one function, which drops to a role that can
--  see nothing but the lab, and undoes everything they did.
-- ============================================================

create schema if not exists lab;         -- the runner and its bookkeeping
create schema if not exists lab_shared;  -- the full practice dataset

-- The role every learner statement actually executes as. NOLOGIN on
-- purpose: nothing ever connects as it. It becomes the owner of the
-- runner function, and a security-definer function runs as its owner --
-- which is how the privileges get dropped. (SET ROLE cannot be used for
-- this: Postgres forbids it inside a security-definer function.)
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'lab_runner') then
    create role lab_runner nologin;
  end if;
end $$;

-- Start from nothing. Anything this role can reach below is deliberate.
revoke all on schema public       from lab_runner;
revoke all on all tables in schema public from lab_runner;
revoke all on schema information_schema from lab_runner;

-- It may read the dataset, and create indexes on it -- which is the whole
-- point of the performance exercises. Everything it creates is rolled
-- back, so CREATE here does not mean anything survives.
grant usage, create on schema lab_shared to lab_runner;
grant select on all tables in schema lab_shared to lab_runner;
alter default privileges in schema lab_shared
  grant select on tables to lab_runner;

-- Handing tables and functions to lab_runner later requires being a
-- member of it. On Supabase the SQL editor runs as postgres, which is
-- privileged but not a superuser, so without this the ownership steps
-- fail with "must be able to SET ROLE".
grant lab_runner to current_user;

-- The runner writes here, so its owner needs to reach it.
grant usage on schema lab to lab_runner;

-- Nothing in public should be reachable from the lab, including by way
-- of privileges granted to PUBLIC rather than to a named role.
revoke all on public.progress from public;

-- Bookkeeping, so one person cannot turn the shared database into their
-- own compute budget.
create table if not exists lab.usage (
  user_id  uuid not null,
  on_day   date not null default current_date,
  calls    int  not null default 0,
  primary key (user_id, on_day)
);
alter table lab.usage enable row level security;
alter table lab.usage force row level security;
revoke all on lab.usage from anon, authenticated;
grant select, insert, update on lab.usage to lab_runner;

-- A policy is not optional here. Row level security with no policy denies
-- everything, including the runner's own bookkeeping insert. And it has to
-- be scoped to the caller rather than simply permissive: a learner's SQL
-- also executes as lab_runner, so a blanket policy would let anyone read
-- everybody else's usage rows. FORCE makes it apply to the owner too.
--
-- Tampering with your own row is possible and pointless: it happens inside
-- the block that gets rolled back, while the counting above does not.
drop policy if exists usage_own_row on lab.usage;
create policy usage_own_row on lab.usage
  for all to lab_runner
  using      (user_id = nullif(current_setting('request.jwt.claims', true)::json ->> 'sub', '')::uuid)
  with check (user_id = nullif(current_setting('request.jwt.claims', true)::json ->> 'sub', '')::uuid);

comment on schema lab is
  'Runner for the remote practice database. Learners reach it only through lab.run().';
