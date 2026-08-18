-- ============================================================
--  Lab, part 9 — don't leave sessions lying around
-- ============================================================
--  PostgREST pools its connections, so the backend that ran your last
--  query is very likely the one that runs your next. dblink connections
--  belong to a backend, not to a request, which means a connection named
--  'other' can still be open on the next call -- and if the exercise
--  before it errored halfway through, that connection may be sitting in
--  an open transaction holding locks.
--
--  So opening a session closes any earlier one of the same name first.
--  Disconnecting rolls back whatever it was in the middle of, which is
--  what makes the deadlock exercise safe to run twice in a row.
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

  -- Close a leftover of the same name, rolling back anything it held.
  begin
    execute format('select %I.dblink_disconnect($1)', ext) using conn_name;
  exception when others then
    null;   -- nothing was open, which is the normal case
  end;

  -- The server's own address first: it is the one that authenticates with
  -- a password instead of being trusted, which is what dblink requires of
  -- a non-superuser.
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

select 'open_session now clears leftovers first' as result;
