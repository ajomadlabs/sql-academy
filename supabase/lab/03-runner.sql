-- ============================================================
--  Lab, part 3 of 3 — the runner
-- ============================================================
--
--  One function is the entire surface a learner can reach. It:
--
--    * refuses anyone who is not signed in
--    * counts calls, so one person cannot spend the whole compute budget
--    * drops to lab_runner, which can see the lab and nothing else --
--      not auth, not public, not anyone's progress
--    * caps how long a statement may run and how long it may wait for a lock
--    * runs the learner's statements inside a subtransaction, then forces
--      that subtransaction to roll back
--
--  That last point is what makes this affordable. A learner can CREATE
--  INDEX on the real 250k-row orders table and read a real EXPLAIN
--  ANALYZE, and nothing survives the call -- so one shared copy of the
--  dataset serves everybody instead of one copy each.
--
--  Two details that look odd and are not:
--
--  json, not jsonb, for the rows. jsonb sorts object keys, which would
--  quietly reorder the columns of every result. json preserves the order
--  the query actually returned.
--
--  It lives in public because PostgREST only exposes functions from the
--  schemas listed in the API settings, and public is the one already
--  there. The machinery it uses stays in the lab schema.
-- ============================================================

create or replace function public.lab_run(stmts text[])
returns json
language plpgsql
security definer
set search_path = lab_shared, pg_temp
as $$
declare
  -- Read the caller straight out of the request's JWT claims rather than
  -- calling auth.uid(). Same value, but it is a settings lookup, so the
  -- lab role needs no privileges on the auth schema at all -- and a role
  -- that cannot reach auth is a much easier thing to reason about.
  uid        uuid := nullif(current_setting('request.jwt.claims', true)::json ->> 'sub', '')::uuid;
  used       int;
  rec        record;
  rows_arr   json[] := '{}';
  n          int := 0;
  last_ix    int := array_length(stmts, 1);
  stmt       text;
  err        text := null;
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

  -- Counted outside the rolled-back block below, so it actually sticks.
  insert into lab.usage (user_id, on_day, calls)
       values (uid, current_date, 1)
  on conflict (user_id, on_day)
    do update set calls = lab.usage.calls + 1
    returning calls into used;

  if used > DAY_CAP then
    return json_build_object('error',
      format('That is %s lab queries today, which is the daily limit. The in-browser database has no limit.', DAY_CAP));
  end if;

  -- Guardrails for this call only. There is no SET ROLE here on purpose:
  -- Postgres forbids it inside a security-definer function. The privilege
  -- drop comes from the function being OWNED by lab_runner instead, which
  -- is what security definer means -- it runs as its owner, and lab_runner
  -- can see the lab and nothing else.
  set local statement_timeout = '10s';
  set local lock_timeout      = '4s';

  started := clock_timestamp();

  begin
    foreach stmt in array stmts loop
      n := n + 1;
      if btrim(stmt) = '' then continue; end if;

      -- Only the last statement's output comes back, the way a psql
      -- script shows you the result of whatever you ended with.
      -- \y, not \b: in a Postgres regex \b is a backspace character,
      -- so \b here would silently never match and every result would
      -- come back empty.
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

    -- Undo all of it. The results are already in plpgsql variables,
    -- which a rollback does not touch.
    raise exception using errcode = 'ZZ000', message = '__lab_rollback__';

  exception when others then
    if sqlerrm <> '__lab_rollback__' then
      err := sqlerrm;
      elapsed_ms := extract(epoch from clock_timestamp() - started) * 1000;
    end if;
  end;

  if err is not null then
    return json_build_object('error', err, 'ms', round(elapsed_ms));
  end if;

  return json_build_object(
    'rows',      coalesce(array_to_json(rows_arr), '[]'::json),
    'ms',        round(elapsed_ms),
    'truncated', coalesce(array_length(rows_arr, 1), 0) >= ROW_CAP,
    'remaining', DAY_CAP - used
  );
end $$;

-- This is the privilege drop, and it is the whole security model:
-- the function executes as lab_runner, not as the caller and not as
-- postgres. Without this line it would run as whoever created it.
--
-- Postgres will only hand an object to a role that could have created it
-- there, and part 1 deliberately strips lab_runner of everything on
-- public. So the privilege is granted for exactly as long as the transfer
-- takes and then revoked: the ownership sticks, the privilege does not,
-- and lab_runner ends up owning a function in a schema it cannot write to.
grant create on schema public to lab_runner;
alter function public.lab_run(text[]) owner to lab_runner;
revoke create on schema public from lab_runner;

-- Signed-in users only. anon must never reach it.
revoke all on function public.lab_run(text[]) from public, anon;
grant execute on function public.lab_run(text[]) to authenticated;

comment on function public.lab_run(text[]) is
  'Runs statements against the shared practice dataset as lab_runner, then rolls them back. Signed-in users only.';
