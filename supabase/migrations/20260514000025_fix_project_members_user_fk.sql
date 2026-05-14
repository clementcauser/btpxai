-- Fix: project_members.user_id referenced the Better Auth "user" table (empty).
-- The column type was text; auth.users.id is uuid. Convert and rewire the FK.
ALTER TABLE project_members
  DROP CONSTRAINT project_members_user_id_fkey;

ALTER TABLE project_members
  ALTER COLUMN user_id TYPE uuid USING user_id::uuid;

ALTER TABLE project_members
  ADD CONSTRAINT project_members_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
