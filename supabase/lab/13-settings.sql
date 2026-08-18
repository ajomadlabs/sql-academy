-- ============================================================
--  Lab, part 13 — the daily cap is a setting, not a guess
-- ============================================================
--  400 queries a day was a number picked out of the air and then
--  compiled into the function, so changing it meant redeploying SQL.
--  It lives beside the other lab settings now and can be changed with
--  an update.
--
--  What it is actually for: one person cannot turn a shared database
--  into their own compute budget. It is not a paywall -- the in-browser
--  database has no limit at all, and it is where all the graded work
--  happens. This only covers the remote lab.
-- ============================================================

insert into lab.secret (key, value) values ('daily_cap', '400')
on conflict (key) do update set value = excluded.value;

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

  select coalesce((select value::int from lab.secret where key = 'daily_cap'), 400) into cap;

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

select 'daily cap is a setting now' as result,
       (select value from lab.secret where key = 'daily_cap') as daily_cap;
