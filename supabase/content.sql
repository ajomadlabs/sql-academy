-- ============================================================
--  Lesson content, readable only with an account
-- ============================================================
--  The course used to ship every lesson and every reference solution in
--  a public JavaScript file, so signing in tracked your progress but
--  protected nothing. The explanations, problems and solutions live here
--  now; what stays public is the catalogue -- titles, counts, module
--  structure -- which the landing page needs before anyone signs in and
--  which gives nothing away.
-- ============================================================

create table if not exists public.content (
  day        int  primary key,
  body       jsonb not null,
  sol        jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.content enable row level security;

-- Nobody reaches this without an account. anon is explicitly excluded
-- rather than merely unmentioned.
revoke all on public.content from anon, public;
grant select on public.content to authenticated;
grant all    on public.content to service_role;   -- how the build uploads it

drop policy if exists content_signed_in on public.content;
create policy content_signed_in on public.content
  for select to authenticated
  using (true);

select 'content table ready' as result,
       (select count(*) from public.content) as rows_present;
