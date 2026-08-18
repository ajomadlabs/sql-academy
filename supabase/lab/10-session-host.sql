-- ============================================================
--  Lab, part 10 — a host that works from PostgREST too
-- ============================================================
--  The second session worked from the SQL editor and failed from the
--  site, with "password or GSSAPI delegated credentials required".
--
--  The reason is that open_session was deriving the host from
--  inet_server_addr(), which reports the address of the server for the
--  current connection. The SQL editor connects over TCP, so it returns a
--  real address. PostgREST connects over a Unix socket, so it returns
--  NULL -- and the only candidates left were 127.0.0.1 and localhost,
--  which pg_hba trusts. dblink refuses a trusted connection for a
--  non-superuser, because the rule is that the credentials must be ones
--  the caller actually supplied.
--
--  So the host is written down instead of derived: the project's own
--  database endpoint, which always authenticates with a password. It is
--  kept beside the password rather than compiled into the function, so
--  changing it later is an update rather than a redeploy.
-- ============================================================

insert into lab.secret (key, value)
values ('session_host', 'db.bdmjcqqpcwroekajjeeu.supabase.co')
on conflict (key) do update set value = excluded.value;

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

  -- Close a leftover of the same name, rolling back anything it held.
  begin
    execute format('select %I.dblink_disconnect($1)', ext) using conn_name;
  exception when others then null;
  end;

  -- The stored endpoint first. inet_server_addr() stays as a fallback for
  -- callers that do have a TCP connection, and loopback last -- it only
  -- works where pg_hba asks for a password.
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
  return conn_name;
end $$;

alter function lab.open_session(text) owner to postgres;
revoke all on function lab.open_session(text) from public, anon;
grant execute on function lab.open_session(text) to lab_runner, authenticated;

-- Prove the stored endpoint is reachable from inside the database.
do $$
declare who text;
begin
  perform lab.open_session('hostcheck');
  select a into who from dblink('hostcheck', 'select current_user') as t(a text);
  perform dblink_disconnect('hostcheck');
  raise notice 'reached the database as %', who;
exception when others then
  begin perform dblink_disconnect('hostcheck'); exception when others then end;
  raise;
end $$;

select 'stored endpoint works' as result,
       (select value from lab.secret where key = 'session_host') as session_host;
