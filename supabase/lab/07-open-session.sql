-- ============================================================
--  Lab, part 7 — teach open_session how to connect
-- ============================================================
--  The probe settled it: 127.0.0.1 and localhost are refused with
--  "Non-superusers may only connect using credentials they provide".
--  On the loopback address pg_hba trusts the connection, so no password
--  is actually used, and dblink refuses that for a non-superuser -- the
--  whole point of the rule is that the credentials must be ones the
--  caller supplied. Connecting to the server's own address forces real
--  password authentication, which is allowed.
--
--  That address belongs to the instance and can change, so it is read
--  from inet_server_addr() at connect time rather than written down.
--  The loopback forms stay in the list as fallbacks in case an instance
--  is configured the other way round.
-- ============================================================

create or replace function lab.open_session(conn_name text)
returns text
language plpgsql
security definer
set search_path = lab, public, pg_temp
as $$
declare
  pw    text;
  ext   text;
  hosts text[];
  h     text;
  ok    boolean := false;
  last  text;
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

  -- The server's own address first: it is the one that authenticates
  -- with a password rather than being trusted.
  hosts := array[host(inet_server_addr()), '127.0.0.1', 'localhost'];

  foreach h in array hosts loop
    continue when h is null;
    begin
      execute format('select %I.dblink_connect($1, $2)', ext)
        using conn_name,
              format('host=%s port=%s dbname=%s user=lab_session password=%s',
                     h, current_setting('port'), current_database(), pw);
      ok := true;
      exit;
    exception when others then
      last := sqlerrm;
    end;
  end loop;

  if not ok then
    raise exception 'could not open a second session (last error: %)', last;
  end if;
  return conn_name;
end $$;

alter function lab.open_session(text) owner to postgres;
revoke all on function lab.open_session(text) from public, anon;
grant execute on function lab.open_session(text) to lab_runner, authenticated;

-- Safe to test here: lab_session was committed by part 5, so a new
-- connection can actually see it.
do $$
declare who text; bal numeric;
begin
  perform lab.open_session('t1');
  select a into who from dblink('t1', 'select current_user') as t(a text);

  -- and prove the second session is genuinely separate: it commits, and
  -- this session sees the commit.
  perform lab_txn.reset('00000000-0000-0000-0000-000000000001'::uuid);
  perform dblink_exec('t1',
    'update lab_txn.accounts set balance = 777
      where owner = ''00000000-0000-0000-0000-000000000001'' and id = 1');
  select balance into bal from lab_txn.accounts
   where owner = '00000000-0000-0000-0000-000000000001' and id = 1;

  perform dblink_disconnect('t1');
  raise notice 'connected as %, balance now %', who, bal;
exception when others then
  begin perform dblink_disconnect('t1'); exception when others then end;
  raise;
end $$;

select 'second session works' as result,
       (select balance from lab_txn.accounts
         where owner = '00000000-0000-0000-0000-000000000001' and id = 1) as balance_after_other_session;
