-- The two tables, policies, grants, indexes and triggers in this migration were
-- applied to the project directly as SQL before the Supabase CLI was linked,
-- so the CLI's migration history table had no record of them and `supabase db
-- push` wanted to apply the same schema a second time.
--
-- This migration exists only to write that history. It creates no tables and
-- changes no data. Everything it refers to already exists and is checked by
-- the migrations it stands in for:
--
--   20261003000100_documents.sql
--   20261003000200_red_lines.sql
--
-- The local files stay the source of truth. This one exists so the ledger and
-- the migrations directory agree.

create schema if not exists supabase_migrations;

create table if not exists supabase_migrations.schema_migrations (
  version    text primary key,
  statements text[],
  name       text
);

insert into supabase_migrations.schema_migrations (version, statements, name)
values (
  '20261003000100',
  array['applied directly as SQL before the CLI was linked'],
  'documents'
)
on conflict (version) do nothing;

insert into supabase_migrations.schema_migrations (version, statements, name)
values (
  '20261003000200',
  array['applied directly as SQL before the CLI was linked'],
  'red_lines'
)
on conflict (version) do nothing;
