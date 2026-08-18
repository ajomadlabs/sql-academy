-- ============================================================
--  Lab, part 15 — settings and secrets are not the same table
-- ============================================================
--  Part 13 moved the daily cap into lab.secret and took the whole lab
--  down: "permission denied for table secret" on every call. lab.secret
--  holds the second session's password and is deliberately unreadable by
--  lab_runner, which is exactly the role lab_run executes as. Reading a
--  harmless number from the table built to be unreadable was never going
--  to work.
--
--  A setting is public to the lab and a secret is not, so they get
--  separate tables. lab.settings is readable by lab_runner; lab.secret
--  stays readable by nobody.
-- ============================================================

create table if not exists lab.settings (
  key   text primary key,
  value text not null
);

insert into lab.settings (key, value) values ('daily_cap', '400')
on conflict (key) do update set value = excluded.value;

revoke all on lab.settings from anon, authenticated, public;
grant select on lab.settings to lab_runner;

-- and take the cap back out of the secret table, where it never belonged
delete from lab.secret where key = 'daily_cap';

create or replace function public.lab_run(stmts text[])
returns json
language plpgsql
security definer
set search_path = lab_shared, lab_txn, public, pg_temp
as $$
declare
  uid        uuid := nullif(current_setting('request.jwt.claims', true)::json ->> 'sub', '')::uuid;
  used       int;
  cap        int;
  rec        record;
  rows_arr   json[] := '{}';
  n          int := 0;
  last_ix    int := array_length(stmts, 1);
  stmt       text;
  err        text := null;
  err_detail text := null;
  err_hint   text := null;
  started    timestamptz;
  elapsed_ms numeric := 0;
  ROW_CAP    constant int := 200;
begin
  if uid is null then
    return json_build_object('error', 'Sign in to use the remote database.');
  end if;
  if last_ix is null or last_ix = 0 then
    return json_build_object('error', 'Nothing to run.');
  end if;
  if last_ix > 20 then
    return json_build_object('error', 'That is more statements than the lab will run at once.');
  end if;

  -- from settings, not secrets: this role cannot read the latter
  select coalesce((select value::int from lab.settings where key = 'daily_cap'), 400) into cap;

  insert into lab.usage (user_id, on_day, calls)
       values (uid, current_date, 1)
  on conflict (user_id, on_day)
    do update set calls = lab.usage.calls + 1
    returning calls into used;

  if used > cap then
    return json_build_object('error',
      format('That is %s lab queries today, which is the daily limit. The database in your browser has no limit, and that is where every graded problem is checked.', cap));
  end if;

  set local statement_timeout = '15s';
  set local lock_timeout      = '8s';

  started := clock_timestamp();

  begin
    foreach stmt in array stmts loop
      n := n + 1;
      if btrim(stmt) = '' then continue; end if;

      if n = last_ix and stmt ~* '^\s*(select|with|explain|show|values|table)\y' then
        for rec in execute stmt loop
          exit when array_length(rows_arr, 1) >= ROW_CAP;
          rows_arr := rows_arr || to_json(rec);
        end loop;
      else
        execute stmt;
      end if;
    end loop;

    elapsed_ms := extract(epoch from clock_timestamp() - started) * 1000;
    raise exception using errcode = 'ZZ000', message = '__lab_rollback__';

  exception when others then
    if sqlerrm <> '__lab_rollback__' then
      err := sqlerrm;
      get stacked diagnostics err_detail = pg_exception_detail,
                              err_hint   = pg_exception_hint;
      elapsed_ms := extract(epoch from clock_timestamp() - started) * 1000;
    end if;
  end;

  if err is not null then
    return json_build_object('error', err,
                             'detail', nullif(err_detail, ''),
                             'hint',   nullif(err_hint, ''),
                             'ms', round(elapsed_ms));
  end if;

  return json_build_object(
    'rows',      coalesce(array_to_json(rows_arr), '[]'::json),
    'ms',        round(elapsed_ms),
    'truncated', coalesce(array_length(rows_arr, 1), 0) >= ROW_CAP,
    'remaining', cap - used
  );
end $$;

grant create on schema public to lab_runner;
alter function public.lab_run(text[]) owner to lab_runner;
revoke create on schema public from lab_runner;
revoke all on function public.lab_run(text[]) from public, anon;
grant execute on function public.lab_run(text[]) to authenticated;

select 'lab_run reads settings, not secrets' as result,
       (select value from lab.settings where key = 'daily_cap') as daily_cap,
       (select count(*) from lab.secret where key = 'daily_cap') as cap_removed_from_secrets;
