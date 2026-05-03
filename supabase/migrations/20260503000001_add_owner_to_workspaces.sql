-- Add owner_id (one-to-one relation) to workspaces.
-- ON DELETE SET NULL: deleting the user unlinks but preserves the workspace.

alter table public.workspaces
  add column owner_id uuid references auth.users(id) on delete set null;

-- Super-admin or the owner themselves can update ownership
create policy "workspace_owner_update"
  on public.workspaces for update
  using (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
    or auth.uid() = owner_id
  );
