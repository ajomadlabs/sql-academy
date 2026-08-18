-- ============================================================
--  Lab, part 14 — fix how the second session is told who it is
-- ============================================================
--  Part 12 closed the playground leak and broke all three concurrency
--  exercises: it told the second session who opened it with
--  "select set_config(...)", passed through dblink_exec, which refuses
--  any statement that returns a value -- and set_config returns the
--  value it set. Every exercise died with "statement returning results
--  not allowed".
--
--  SET does the same job and returns nothing. Session-scoped rather than
--  transaction-scoped on purpose: the exercises open and roll back
--  transactions on that connection, and the identity has to outlive them.
-- ============================================================

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
    -- SET, not select set_config(): dblink_exec refuses anything that
    -- returns a value, and set_config returns the value it set. Passing
    -- it there fails with "statement returning results not allowed" and
    -- takes every concurrency exercise down with it.
    execute format('select %I.dblink_exec($1, $2)', ext)
      using conn_name,
            format('set request.jwt.claims = %L', claims);
  end if;

  return conn_name;
end $$;

alter function lab.open_session(text) owner to postgres;
revoke all on function lab.open_session(text) from public, anon;
grant execute on function lab.open_session(text) to lab_runner, authenticated;


-- Prove it end to end: the second session must be able to see and change
-- the caller's rows, and only the caller's.
do $$
declare me uuid := '00000000-0000-0000-0000-000000000001'; bal numeric; seen int;
begin
  perform set_config('request.jwt.claims', format('{"sub":"%s"}', me), true);
  perform lab_txn.reset_me();
  perform lab.open_session('checkme');

  select a into seen from dblink('checkme', 'select count(*) from lab_txn.accounts') as t(a int);
  perform dblink_exec('checkme',
    format('update lab_txn.accounts set balance = 321 where owner = %L and id = 1', me));
  select balance into bal from lab_txn.accounts where owner = me and id = 1;
  perform dblink_disconnect('checkme');

  raise notice 'second session saw % rows and set balance to %', seen, bal;
exception when others then
  begin perform dblink_disconnect('checkme'); exception when others then end;
  raise;
end $$;

select 'second session identified correctly' as result,
       (select count(*) from lab_txn.accounts
         where owner = '00000000-0000-0000-0000-000000000001') as own_rows,
       (select balance from lab_txn.accounts
         where owner = '00000000-0000-0000-0000-000000000001' and id = 1) as balance_set_by_other_session;
