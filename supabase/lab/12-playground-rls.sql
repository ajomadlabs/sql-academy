-- ============================================================
--  Lab, part 12 — the playground is not shared
-- ============================================================
--  A learner could read every row in lab_txn.accounts, not just their
--  own -- other people's uuids and balances -- and with insert, update
--  and delete granted, could interfere with someone else's exercise.
--  Their own statements roll back, but the second session's do not,
--  which is exactly where the damage would be permanent.
--
--  Row level security fixes it, with one wrinkle: the second session
--  connects as lab_session and carries none of the request context, so
--  a policy keyed on the JWT would block the very session the exercises
--  depend on. So open_session tells the second session who opened it,
--  and the policy then applies equally on both sides.
-- ============================================================

alter table lab_txn.accounts enable row level security;
alter table lab_txn.accounts force row level security;

drop policy if exists accounts_own_rows on lab_txn.accounts;
create policy accounts_own_rows on lab_txn.accounts
  for all to lab_runner, lab_session
  using      (owner = nullif(current_setting('request.jwt.claims', true)::json ->> 'sub', '')::uuid)
  with check (owner = nullif(current_setting('request.jwt.claims', true)::json ->> 'sub', '')::uuid);

-- The reset runs through a connection of its own, so it is subject to
-- the same policy and needs the same context.
create or replace function lab.open_session(conn_name text)
returns text
language plpgsql
security definer
set search_path = lab, public, pg_temp
as $$
declare
  pw     text;
  ext    text;
  hosts  text[];
  h      text;
  ok     boolean := false;
  last   text;
  claims text := current_setting('request.jwt.claims', true);
begin
  if conn_name !~ '^[a-z][a-z0-9_]{0,20}$' then
    raise exception 'connection name must be a short plain identifier';
  end if;

  select value into pw from lab.secret where key = 'session_password';
  if pw is null then raise exception 'no second-session password configured'; end if;

  select n.nspname into ext
  from pg_extension e join pg_namespace n on n.oid = e.extnamespace
  where e.extname = 'dblink';
  if ext is null then raise exception 'the dblink extension is not installed'; end if;

  begin
    execute format('select %I.dblink_disconnect($1)', ext) using conn_name;
  exception when others then null;
  end;

  hosts := array[(select value from lab.secret where key = 'session_host'),
                 host(inet_server_addr()),
                 '127.0.0.1'];

  foreach h in array hosts loop
    continue when h is null or h = '';
    begin
      execute format('select %I.dblink_connect($1, $2)', ext)
        using conn_name,
              format('host=%s port=%s dbname=%s user=lab_session password=%s sslmode=prefer',
                     h, current_setting('port'), current_database(), pw);
      ok := true;
      exit;
    exception when others then
      last := format('%s: %s', h, sqlerrm);
    end;
  end loop;

  if not ok then
    raise exception 'could not open a second session (%)', last;
  end if;

  -- Tell it who opened it, so the policy sees the same person on both
  -- sides. Without this the second session owns nothing and can do
  -- nothing, which would break every concurrency exercise.
  if claims is not null and claims <> '' then
    execute format('select %I.dblink_exec($1, $2)', ext)
      using conn_name,
            format('select set_config(%L, %L, false)', 'request.jwt.claims', claims);
  end if;

  return conn_name;
end $$;

alter function lab.open_session(text) owner to postgres;
revoke all on function lab.open_session(text) from public, anon;
grant execute on function lab.open_session(text) to lab_runner, authenticated;

select 'playground rows are now private to their owner' as result;
