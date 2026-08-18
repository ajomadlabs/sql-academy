-- ============================================================
--  Lab, part 8 — an autonomous reset
-- ============================================================
--  Everything this session writes is invisible to the second session
--  until the request commits, which happens after the call has already
--  returned. So a reset done here leaves the second session updating
--  rows it cannot see, matching nothing, and the exercise quietly does
--  nothing at all.
--
--  So the reset goes through a connection of its own and commits on the
--  spot. Both sessions then see the same two rows, which is the state
--  every concurrency exercise has to start from.
--
--  This also means the reset survives lab_run's rollback -- correctly.
--  The second session's commits survive too, so a reset that vanished
--  with the rollback would leave the previous exercise's leftovers
--  behind.
-- ============================================================

create or replace function lab_txn.reset_me()
returns text
language plpgsql
security definer
set search_path = lab_txn, public, pg_temp
as $$
declare
  me uuid := lab_txn.me();
begin
  if me is null then
    raise exception 'sign in first: the playground rows belong to an account';
  end if;

  perform lab.open_session('reset_conn');
  begin
    perform dblink_exec('reset_conn',
      format('delete from lab_txn.accounts where owner = %L', me));
    perform dblink_exec('reset_conn',
      format('insert into lab_txn.accounts (owner, id, balance)
              values (%L, 1, 100), (%L, 2, 100)', me, me));
    perform dblink_disconnect('reset_conn');
  exception when others then
    begin perform dblink_disconnect('reset_conn'); exception when others then end;
    raise;
  end;

  return 'accounts 1 and 2 reset to 100';
end $$;

alter function lab_txn.reset_me() owner to postgres;
revoke all on function lab_txn.reset_me() from public, anon;
grant execute on function lab_txn.reset_me() to lab_runner, authenticated;

-- ---------- prove a commit in the other session is visible here ----------
do $$
declare bal_before numeric; bal_after numeric; me uuid := '00000000-0000-0000-0000-000000000001';
begin
  perform set_config('request.jwt.claims', format('{"sub":"%s"}', me), true);
  perform lab_txn.reset_me();

  select balance into bal_before from lab_txn.accounts where owner = me and id = 1;

  perform lab.open_session('other');
  perform dblink_exec('other',
    format('update lab_txn.accounts set balance = 777 where owner = %L and id = 1', me));
  perform dblink_disconnect('other');

  select balance into bal_after from lab_txn.accounts where owner = me and id = 1;
  raise notice 'before % after %', bal_before, bal_after;
exception when others then
  begin perform dblink_disconnect('other'); exception when others then end;
  raise;
end $$;

select 'the other session committed and this one saw it' as result,
       (select balance from lab_txn.accounts
         where owner = '00000000-0000-0000-0000-000000000001' and id = 1) as balance_now;
