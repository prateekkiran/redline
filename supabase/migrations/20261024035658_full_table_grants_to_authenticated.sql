-- Give the authenticated role all four table operations on both tables.
--
-- The two earlier migrations grant the operations the app needs but don't
-- use: `documents` has no UPDATE, because a saved analysis is immutable, and
-- `red_lines` has UPDATE on the `text` column alone, because a user may
-- change what a red line says but not whose it is or when it was added.
--
-- The grant is what the table allows; the row-level security policies are
-- what decide which rows a user may touch. `documents` still has no UPDATE
-- policy, so an UPDATE there is denied by RLS even though the grant permits
-- it. `red_lines` has one that checks the row before and after the change, so
-- a user cannot move a red line to another account.
--
-- This migration widens the table grant to the four operations. It does not
-- add or change any policy, and anon keeps no access to either table.

grant select, insert, update, delete on table public.documents to authenticated;
grant select, insert, update, delete on table public.red_lines to authenticated;
