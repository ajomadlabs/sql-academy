-- ============================================================
--  Lab, part 5 — a second session
-- ============================================================
--  Three exercises need two connections at once: a non-repeatable read,
--  an isolation level that prevents it, and a real deadlock. A browser
--  cannot hold two Postgres sessions and PostgREST is stateless, so the
--  second session has to be opened by Postgres itself, with dblink.
--
--  dblink refuses to connect without a password, and a foreign server
--  would need USAGE on the foreign-data wrapper, which is superuser only
--  and cannot be granted here. So the password is generated below, kept
--  in a table nothing can read, and used by one function that opens the
--  connection for you.
--
--  That indirection is the point: a learner calls lab.open_session('a')
--  and gets a working second session without the password ever being
--  returned to them. Their SQL runs as lab_runner, which cannot read the
--  table -- only the function can, because it runs as its owner.
--
--  The deliberate hole in the safety model: what the second session
--  commits is COMMITTED. It is a separate connection, so the rollback
--  that protects lab_shared does not reach it. You cannot observe
--  another session's commit if it did not commit. That is exactly why
--  this gets its own two-row playground and is kept away from the real
--  dataset.
-- ============================================================

create extension if not exists dblink;
create schema if not exists lab_txn;

-- Two rows per learner: enough to hold a lock, move a balance, and
-- deadlock against yourself.
create table if not exists lab_txn.accounts (
  owner   uuid    not null,
  id      int     not null,
  balance numeric not null,
  primary key (owner, id)
);

-- Where the password lives. Owned by postgres, granted to nobody: the
-- lab role cannot read it even though the lab role is what learner SQL
-- executes as.
create table if not exists lab.secret (
  key   text primary key,
  value text not null
);
revoke all on lab.secret from public, anon, authenticated, lab_runner;

-- Who is asking. The second session has no idea -- it connects as
-- lab_session and carries none of your request context -- so exercises
-- have to say whose rows they mean.
create or replace function lab_txn.me() returns uuid
language sql stable
as $$ select nullif(current_setting('request.jwt.claims', true)::json ->> 'sub', '')::uuid $$;

-- Called by lab_run before each call and outside the rolled-back part.
-- It has to be outside: the second session's commits survive, so a reset
-- that rolled back with everything else would leave the playground
-- holding the previous exercise's leftovers.
create or replace function lab_txn.reset(p_owner uuid) returns void
language plpgsql security definer
set search_path = lab_txn, pg_temp
as $$
begin
  if p_owner is null then return; end if;
  delete from lab_txn.accounts where owner = p_owner;
  insert into lab_txn.accounts (owner, id, balance)
       values (p_owner, 1, 100), (p_owner, 2, 100);
end $$;

-- ---------- the second session's identity ----------
do $$
declare
  pw text := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
begin
  if exists (select 1 from pg_roles where rolname = 'lab_session') then
    execute format('alter role lab_session login password %L', pw);
  else
    execute format('create role lab_session login password %L', pw);
  end if;

  -- It may touch the playground and nothing else.
  execute 'revoke all on schema public from lab_session';
  execute 'grant usage on schema lab_txn to lab_session';
  execute 'grant select, insert, update, delete on lab_txn.accounts to lab_session';

  insert into lab.secret (key, value) values ('session_password', pw)
  on conflict (key) do update set value = excluded.value;
end $$;

-- The only way to reach that password: a function that spends it and
-- hands back a connection, never the string.
create or replace function lab.open_session(conn_name text)
returns text
language plpgsql
security definer
set search_path = lab, pg_temp
as $$
declare
  pw  text;
  ext text;
begin
  -- The name goes into a dblink call, so it is checked rather than trusted.
  if conn_name !~ '^[a-z][a-z0-9_]{0,20}$' then
    raise exception 'connection name must be a short plain identifier';
  end if;
  select value into pw from lab.secret where key = 'session_password';
  if pw is null then raise exception 'no second-session password configured'; end if;

  -- dblink is not necessarily in public -- Supabase keeps extensions in
  -- their own schema -- and this function pins its search_path, so the
  -- schema is looked up rather than assumed.
  select n.nspname into ext
  from pg_extension e join pg_namespace n on n.oid = e.extnamespace
  where e.extname = 'dblink';
  if ext is null then raise exception 'the dblink extension is not installed'; end if;

  execute format('select %I.dblink_connect($1, $2)', ext)
    using conn_name,
          format('host=127.0.0.1 port=5432 dbname=postgres user=lab_session password=%s', pw);
  return conn_name;
end $$;

alter function lab.open_session(text) owner to postgres;
revoke all on function lab.open_session(text) from public, anon;
grant execute on function lab.open_session(text) to lab_runner, authenticated;

grant usage on schema lab_txn to lab_runner;
grant select, insert, update, delete on lab_txn.accounts to lab_runner;
grant execute on function lab_txn.me() to lab_runner, authenticated;

-- Learner SQL calls dblink_exec and dblink directly, and lab_run pins its
-- own search_path too, so the extension's schema has to be on it. Altering
-- the setting avoids redefining the function here and letting the two
-- copies drift apart.
do $$
declare ext text;
begin
  select n.nspname into ext
  from pg_extension e join pg_namespace n on n.oid = e.extnamespace
  where e.extname = 'dblink';
  execute format('alter function public.lab_run(text[]) set search_path = lab_shared, lab_txn, %I, pg_temp', ext);
end $$;

-- The probe deliberately lives in 06, not here.
--
-- A second session authenticating as lab_session cannot see the role
-- until the transaction that created it has committed -- separate
-- connection, separate snapshot of the catalogue. Probing in this script
-- reports "could not establish connection" every time and, because the
-- editor runs a script as one transaction, the failure then rolls the
-- whole setup back. Run 06 afterwards instead.

select 'setup committed; now run 06-test-session.sql' as next_step,
       (select n.nspname from pg_extension e join pg_namespace n on n.oid = e.extnamespace
         where e.extname = 'dblink') as dblink_lives_in,
       (select count(*) from pg_roles where rolname = 'lab_session') as session_role,
       (select array_to_string(proconfig, ', ') from pg_proc where proname = 'lab_run') as lab_run_search_path;
