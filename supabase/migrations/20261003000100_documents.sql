-- The saved library (ticket 08). One row per analysis a user runs: the
-- extracted text and the analysis output, never the original file. Rows are
-- private to their owner, enforced here by row-level security rather than by
-- the app. Saved analyses are immutable: there is no update policy.

create table public.documents (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null default auth.uid()
                            references auth.users (id) on delete cascade,
  title         text        not null check (char_length(title) between 1 and 200),
  document_text text        not null check (char_length(document_text) > 0),
  summary       text        not null,
  flags         jsonb       not null check (jsonb_typeof(flags) = 'array'),
  -- The red lines in effect when the document was analysed (ticket 09).
  -- Kept on the row so deleting the document removes them with it.
  red_lines     jsonb       not null default '[]'::jsonb
                            check (jsonb_typeof(red_lines) = 'array'),
  -- Lets the library list show a count without reading the flags or text.
  flag_count    integer     generated always as (jsonb_array_length(flags)) stored,
  created_at    timestamptz not null default now()
);

comment on table public.documents is
  'Saved analyses: extracted text and analysis output only. No original files.';

create index documents_user_id_created_at_idx
  on public.documents (user_id, created_at desc);

alter table public.documents enable row level security;

-- Supabase grants table privileges to anon and authenticated by default.
-- Signed-out visitors get nothing; signed-in users get exactly the three
-- operations the library needs.
revoke all on table public.documents from anon;
revoke all on table public.documents from authenticated;
grant select, insert, delete on table public.documents to authenticated;

create policy "Users read their own documents"
  on public.documents for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users save documents as themselves"
  on public.documents for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users delete their own documents"
  on public.documents for delete
  to authenticated
  using ((select auth.uid()) = user_id);
