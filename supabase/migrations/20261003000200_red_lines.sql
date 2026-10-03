-- A user's own red lines (ticket 09, ADR 0006): things they don't want to
-- see in a contract. Red lines only ever add flags. The list is private to
-- its owner, enforced here by row-level security rather than by the app.
-- The red lines in effect for a given analysis are copied onto that
-- documents row (documents.red_lines), so editing this list later never
-- changes what a saved analysis says it was run with.

create table public.red_lines (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null default auth.uid()
                         references auth.users (id) on delete cascade,
  text       text        not null check (char_length(text) between 1 and 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.red_lines is
  'Each user''s own red lines. They only add flags to an analysis, never remove one.';

create index red_lines_user_id_created_at_idx
  on public.red_lines (user_id, created_at);

create function public.red_lines_touch_updated_at() returns trigger
  language plpgsql
  set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger red_lines_touch_updated_at
  before update on public.red_lines
  for each row execute function public.red_lines_touch_updated_at();

-- At most 20 red lines per user (MAX_RED_LINES in lib/analysis/red-lines.ts).
-- The app checks first and says so plainly; this is the backstop. The
-- per-user advisory lock keeps two parallel inserts from both passing.
create function public.red_lines_enforce_limit() returns trigger
  language plpgsql
  set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtext('red_lines:' || new.user_id::text));
  if (select count(*) from public.red_lines where user_id = new.user_id) >= 20 then
    raise exception 'red line limit reached' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger red_lines_enforce_limit
  before insert on public.red_lines
  for each row execute function public.red_lines_enforce_limit();

alter table public.red_lines enable row level security;

-- Supabase grants table privileges to anon and authenticated by default.
-- Signed-out visitors get nothing; signed-in users get the four operations
-- on their own rows, and can change only the text of a red line.
revoke all on table public.red_lines from anon;
revoke all on table public.red_lines from authenticated;
grant select, insert, delete on table public.red_lines to authenticated;
grant update (text) on table public.red_lines to authenticated;

create policy "Users read their own red lines"
  on public.red_lines for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users add red lines as themselves"
  on public.red_lines for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users edit their own red lines"
  on public.red_lines for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users remove their own red lines"
  on public.red_lines for delete
  to authenticated
  using ((select auth.uid()) = user_id);
