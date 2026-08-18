-- ============================================================
--  Lab, part 11 — return the interesting half of an error
-- ============================================================
--  "deadlock detected" on its own teaches nothing. Postgres puts the
--  useful part in DETAIL and HINT: which processes were waiting, on
--  which locks, and what to do about it. sqlerrm does not include them,
--  so the runner was throwing away exactly the part the exercise exists
--  to show you.
-- ============================================================

create or replace function public.lab_run(stmts text[])
returns json
language plpgsql
security definer
set search_path = lab_shared, lab_txn, public, pg_temp
as $$
declare
  uid        uuid := nullif(current_setting('request.jwt.claims', true)::json ->> 'sub', '')::uuid;
  used       int;
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
  DAY_CAP    constant int := 400;
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

  insert into lab.usage (user_id, on_day, calls)
       values (uid, current_date, 1)
  on conflict (user_id, on_day)
    do update set calls = lab.usage.calls + 1
    returning calls into used;

  if used > DAY_CAP then
    return json_build_object('error',
      format('That is %s lab queries today, which is the daily limit. The in-browser database has no limit.', DAY_CAP));
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
    'remaining', DAY_CAP - used
  );
end $$;

grant create on schema public to lab_runner;
alter function public.lab_run(text[]) owner to lab_runner;
revoke create on schema public from lab_runner;

revoke all on function public.lab_run(text[]) from public, anon;
grant execute on function public.lab_run(text[]) to authenticated;

select 'lab_run now returns detail and hint' as result;
