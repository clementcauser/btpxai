-- Fix: tasks.assigned_to referenced the Better Auth "user" table (empty).
-- Column type was text; auth.users.id is uuid. Convert and rewire the FK.
-- The RLS policy tasks_update_ouvrier_own depends on assigned_to, so drop and recreate it.

DROP POLICY IF EXISTS "tasks_update_ouvrier_own" ON public.tasks;

ALTER TABLE tasks
  DROP CONSTRAINT tasks_assigned_to_fkey;

ALTER TABLE tasks
  ALTER COLUMN assigned_to TYPE uuid USING assigned_to::uuid;

ALTER TABLE tasks
  ADD CONSTRAINT tasks_assigned_to_fkey
  FOREIGN KEY (assigned_to) REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE POLICY "tasks_update_ouvrier_own"
  ON public.tasks FOR UPDATE
  USING (
    is_workspace_member(workspace_id)
    AND get_workspace_role(workspace_id) = 'ouvrier'
    AND assigned_to = auth.uid()
  );
