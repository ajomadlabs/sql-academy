-- ============================================================
--  Lab, part 6 — does a second session actually work?
-- ============================================================
--  Run this only after 05 has committed. It has to be a separate script:
--  the second session authenticates as lab_session over a new connection,
--  and a new connection cannot see a role that the current transaction
--  has not committed yet.
--
--  Passwords are masked in the output, so the results are safe to share.
-- ============================================================

select inet_server_addr()                        as server_addr,
       current_setting('port')                   as port,
       current_setting('listen_addresses', true) as listen_addresses;

do $$
declare
  pw text; ext text; c text; det text; msg text; tries text[];
begin
  select value into pw from lab.secret where key = 'session_password';
  select n.nspname into ext from pg_extension e
    join pg_namespace n on n.oid = e.extnamespace where e.extname = 'dblink';

  tries := array[
    format('host=127.0.0.1 port=%s dbname=postgres user=lab_session password=%s', current_setting('port'), pw),
    format('host=localhost port=%s dbname=postgres user=lab_session password=%s', current_setting('port'), pw),
    format('host=%s port=%s dbname=postgres user=lab_session password=%s',
           coalesce(host(inet_server_addr()), '127.0.0.1'), current_setting('port'), pw),
    format('port=%s dbname=postgres user=lab_session password=%s', current_setting('port'), pw)
  ];

  create temp table if not exists diag (conninfo text, ok boolean, err text, detail text) on commit drop;

  foreach c in array tries loop
    begin
      execute format('select %I.dblink_connect(''d'', $1)', ext) using c;
      execute format('select %I.dblink_disconnect(''d'')', ext);
      insert into diag values (regexp_replace(c, 'password=\S+', 'password=***'), true, null, null);
    exception when others then
      get stacked diagnostics det = pg_exception_detail, msg = message_text;
      begin execute format('select %I.dblink_disconnect(''d'')', ext); exception when others then end;
      insert into diag values (regexp_replace(c, 'password=\S+', 'password=***'), false, msg,
                               left(coalesce(det, '(no detail)'), 200));
    end;
  end loop;
end $$;

select * from diag;
