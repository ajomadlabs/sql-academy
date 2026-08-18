-- ============================================================
--  Probe: can this instance do a second session at all?
-- ============================================================
--  The concurrency exercises need two connections at once. A browser
--  cannot hold them and PostgREST is stateless, so the only way is for
--  Postgres to open a second session to itself with dblink.
--
--  Whether that works depends on the instance: the extension has to be
--  available, and it has to be able to connect back. This finds out
--  before anything is built on top of it. It creates nothing except the
--  extension, and closes whatever it opens.
-- ============================================================

create extension if not exists dblink;

-- Try the ways of connecting back, and report what each one says rather
-- than stopping at the first failure.
do $$
declare
  attempts text[] := array[
    'dbname=postgres',
    'host=/var/run/postgresql dbname=postgres',
    'host=localhost dbname=postgres',
    'host=127.0.0.1 port=5432 dbname=postgres'
  ];
  c text;
  ok boolean;
  msg text;
begin
  create temp table if not exists dblink_probe (conninfo text, worked boolean, detail text) on commit drop;
  foreach c in array attempts loop
    begin
      perform dblink_connect('probe', c);
      select (dblink('probe', 'select 1')::text) is not null into ok;
      perform dblink_disconnect('probe');
      insert into dblink_probe values (c, true, 'connected');
    exception when others then
      msg := sqlerrm;
      begin perform dblink_disconnect('probe'); exception when others then end;
      insert into dblink_probe values (c, false, left(msg, 90));
    end;
  end loop;
end $$;

select (select count(*) from pg_extension where extname = 'dblink') as dblink_installed,
       current_setting('port') as db_port,
       current_user as running_as;

select * from dblink_probe;
