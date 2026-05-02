-- ─────────────────────────────────────────────────────────────────────────────
-- DROP all existing RLS policies on business tables
-- ─────────────────────────────────────────────────────────────────────────────

do $$
declare
  r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'clients','projects','quotes','quote_items','tasks',
        'project_steps','terrain_notes','terrain_photos',
        'materiaux_requests','alertes_terrain',
        'email_statuses','email_acknowledgments',
        'gmail_connections','quote_reminders',
        'workspaces','workspace_members','workspace_invitations','workspace_settings'
      )
  loop
    execute format('drop policy if exists %I on %I.%I',
      r.policyname, r.schemaname, r.tablename);
  end loop;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Convenience macro: super_admin bypass (global admin via user_metadata)
-- Used in WITH CHECK for INSERT policies to allow super_admin to seed data.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── workspaces ──────────────────────────────────────────────────────────────
-- Members see their own workspace; super_admin sees all.

create policy "workspace_member_select"
  on public.workspaces for select
  using (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
    or is_workspace_member(id)
  );

create policy "workspace_admin_update"
  on public.workspaces for update
  using (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
    or get_workspace_role(id) = 'admin'
  );

create policy "super_admin_insert_workspace"
  on public.workspaces for insert
  with check (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
  );

create policy "super_admin_delete_workspace"
  on public.workspaces for delete
  using (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
  );

-- ─── workspace_members ───────────────────────────────────────────────────────

create policy "workspace_member_select_members"
  on public.workspace_members for select
  using (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
    or is_workspace_member(workspace_id)
  );

create policy "workspace_admin_insert_member"
  on public.workspace_members for insert
  with check (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
    or get_workspace_role(workspace_id) = 'admin'
  );

create policy "workspace_admin_update_member"
  on public.workspace_members for update
  using (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
    or get_workspace_role(workspace_id) = 'admin'
  );

create policy "workspace_admin_delete_member"
  on public.workspace_members for delete
  using (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
    or get_workspace_role(workspace_id) = 'admin'
  );

-- ─── workspace_invitations ───────────────────────────────────────────────────

create policy "workspace_admin_select_invitations"
  on public.workspace_invitations for select
  using (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
    or get_workspace_role(workspace_id) = 'admin'
  );

create policy "workspace_admin_insert_invitation"
  on public.workspace_invitations for insert
  with check (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
    or get_workspace_role(workspace_id) = 'admin'
  );

create policy "workspace_admin_update_invitation"
  on public.workspace_invitations for update
  using (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
    or get_workspace_role(workspace_id) = 'admin'
  );

create policy "workspace_admin_delete_invitation"
  on public.workspace_invitations for delete
  using (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
    or get_workspace_role(workspace_id) = 'admin'
  );

-- ─── workspace_settings ──────────────────────────────────────────────────────

create policy "workspace_member_select_settings"
  on public.workspace_settings for select
  using (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
    or is_workspace_member(workspace_id)
  );

create policy "workspace_admin_bureau_upsert_settings"
  on public.workspace_settings for insert
  with check (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
    or get_workspace_role(workspace_id) in ('admin', 'bureau')
  );

create policy "workspace_admin_bureau_update_settings"
  on public.workspace_settings for update
  using (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
    or get_workspace_role(workspace_id) in ('admin', 'bureau')
  );

-- ─── clients ─────────────────────────────────────────────────────────────────
-- bureau + admin: full CRUD. ouvrier: select only (for projet context).

create policy "clients_select"
  on public.clients for select
  using (is_workspace_member(workspace_id));

create policy "clients_insert"
  on public.clients for insert
  with check (
    is_workspace_member(workspace_id)
    and get_workspace_role(workspace_id) in ('admin', 'bureau')
  );

create policy "clients_update"
  on public.clients for update
  using (
    is_workspace_member(workspace_id)
    and get_workspace_role(workspace_id) in ('admin', 'bureau')
  );

create policy "clients_delete"
  on public.clients for delete
  using (
    is_workspace_member(workspace_id)
    and get_workspace_role(workspace_id) in ('admin', 'bureau')
  );

-- ─── projects ────────────────────────────────────────────────────────────────

create policy "projects_select"
  on public.projects for select
  using (is_workspace_member(workspace_id));

create policy "projects_insert"
  on public.projects for insert
  with check (
    is_workspace_member(workspace_id)
    and get_workspace_role(workspace_id) in ('admin', 'bureau')
  );

create policy "projects_update"
  on public.projects for update
  using (
    is_workspace_member(workspace_id)
    and get_workspace_role(workspace_id) in ('admin', 'bureau')
  );

create policy "projects_delete"
  on public.projects for delete
  using (
    is_workspace_member(workspace_id)
    and get_workspace_role(workspace_id) in ('admin', 'bureau')
  );

-- ─── quotes ──────────────────────────────────────────────────────────────────

create policy "quotes_select"
  on public.quotes for select
  using (is_workspace_member(workspace_id));

create policy "quotes_insert"
  on public.quotes for insert
  with check (
    is_workspace_member(workspace_id)
    and get_workspace_role(workspace_id) in ('admin', 'bureau')
  );

create policy "quotes_update"
  on public.quotes for update
  using (
    is_workspace_member(workspace_id)
    and get_workspace_role(workspace_id) in ('admin', 'bureau')
  );

create policy "quotes_delete"
  on public.quotes for delete
  using (
    is_workspace_member(workspace_id)
    and get_workspace_role(workspace_id) in ('admin', 'bureau')
  );

-- ─── quote_items ─────────────────────────────────────────────────────────────

create policy "quote_items_select"
  on public.quote_items for select
  using (is_workspace_member(workspace_id));

create policy "quote_items_insert"
  on public.quote_items for insert
  with check (
    is_workspace_member(workspace_id)
    and get_workspace_role(workspace_id) in ('admin', 'bureau')
  );

create policy "quote_items_update"
  on public.quote_items for update
  using (
    is_workspace_member(workspace_id)
    and get_workspace_role(workspace_id) in ('admin', 'bureau')
  );

create policy "quote_items_delete"
  on public.quote_items for delete
  using (
    is_workspace_member(workspace_id)
    and get_workspace_role(workspace_id) in ('admin', 'bureau')
  );

-- ─── tasks ───────────────────────────────────────────────────────────────────
-- ouvrier can select + update status on tasks assigned to them.

create policy "tasks_select"
  on public.tasks for select
  using (is_workspace_member(workspace_id));

create policy "tasks_insert"
  on public.tasks for insert
  with check (
    is_workspace_member(workspace_id)
    and get_workspace_role(workspace_id) in ('admin', 'bureau')
  );

create policy "tasks_update_bureau_admin"
  on public.tasks for update
  using (
    is_workspace_member(workspace_id)
    and get_workspace_role(workspace_id) in ('admin', 'bureau')
  );

create policy "tasks_update_ouvrier_own"
  on public.tasks for update
  using (
    is_workspace_member(workspace_id)
    and get_workspace_role(workspace_id) = 'ouvrier'
    and assigned_to = auth.uid()::text
  );

create policy "tasks_delete"
  on public.tasks for delete
  using (
    is_workspace_member(workspace_id)
    and get_workspace_role(workspace_id) in ('admin', 'bureau')
  );

-- ─── project_steps ───────────────────────────────────────────────────────────
-- ouvrier can select + mark steps complete.

create policy "project_steps_select"
  on public.project_steps for select
  using (is_workspace_member(workspace_id));

create policy "project_steps_insert"
  on public.project_steps for insert
  with check (
    is_workspace_member(workspace_id)
    and get_workspace_role(workspace_id) in ('admin', 'bureau')
  );

create policy "project_steps_update_bureau_admin"
  on public.project_steps for update
  using (
    is_workspace_member(workspace_id)
    and get_workspace_role(workspace_id) in ('admin', 'bureau')
  );

create policy "project_steps_update_ouvrier"
  on public.project_steps for update
  using (
    is_workspace_member(workspace_id)
    and get_workspace_role(workspace_id) = 'ouvrier'
  );

create policy "project_steps_delete"
  on public.project_steps for delete
  using (
    is_workspace_member(workspace_id)
    and get_workspace_role(workspace_id) in ('admin', 'bureau')
  );

-- ─── terrain_notes ───────────────────────────────────────────────────────────
-- ouvrier: insert own + select own. bureau/admin: select all.

create policy "terrain_notes_select_bureau_admin"
  on public.terrain_notes for select
  using (
    is_workspace_member(workspace_id)
    and get_workspace_role(workspace_id) in ('admin', 'bureau')
  );

create policy "terrain_notes_select_own"
  on public.terrain_notes for select
  using (
    is_workspace_member(workspace_id)
    and get_workspace_role(workspace_id) = 'ouvrier'
    and user_id = auth.uid()
  );

create policy "terrain_notes_insert"
  on public.terrain_notes for insert
  with check (
    is_workspace_member(workspace_id)
    and get_workspace_role(workspace_id) = 'ouvrier'
    and user_id = auth.uid()
  );

-- ─── terrain_photos ──────────────────────────────────────────────────────────

create policy "terrain_photos_select_bureau_admin"
  on public.terrain_photos for select
  using (
    is_workspace_member(workspace_id)
    and get_workspace_role(workspace_id) in ('admin', 'bureau')
  );

create policy "terrain_photos_select_own"
  on public.terrain_photos for select
  using (
    is_workspace_member(workspace_id)
    and get_workspace_role(workspace_id) = 'ouvrier'
    and user_id = auth.uid()
  );

create policy "terrain_photos_insert"
  on public.terrain_photos for insert
  with check (
    is_workspace_member(workspace_id)
    and get_workspace_role(workspace_id) = 'ouvrier'
    and user_id = auth.uid()
  );

-- ─── materiaux_requests ──────────────────────────────────────────────────────
-- ouvrier: insert own + select workspace. bureau/admin: full CRUD.

create policy "materiaux_requests_select"
  on public.materiaux_requests for select
  using (is_workspace_member(workspace_id));

create policy "materiaux_requests_insert_ouvrier"
  on public.materiaux_requests for insert
  with check (
    is_workspace_member(workspace_id)
    and get_workspace_role(workspace_id) = 'ouvrier'
    and user_id = auth.uid()
  );

create policy "materiaux_requests_insert_bureau_admin"
  on public.materiaux_requests for insert
  with check (
    is_workspace_member(workspace_id)
    and get_workspace_role(workspace_id) in ('admin', 'bureau')
  );

create policy "materiaux_requests_update"
  on public.materiaux_requests for update
  using (
    is_workspace_member(workspace_id)
    and get_workspace_role(workspace_id) in ('admin', 'bureau')
  );

create policy "materiaux_requests_delete"
  on public.materiaux_requests for delete
  using (
    is_workspace_member(workspace_id)
    and get_workspace_role(workspace_id) in ('admin', 'bureau')
  );

-- ─── alertes_terrain ─────────────────────────────────────────────────────────
-- ouvrier: insert own + select workspace. bureau/admin: full CRUD.

create policy "alertes_terrain_select"
  on public.alertes_terrain for select
  using (is_workspace_member(workspace_id));

create policy "alertes_terrain_insert_ouvrier"
  on public.alertes_terrain for insert
  with check (
    is_workspace_member(workspace_id)
    and get_workspace_role(workspace_id) = 'ouvrier'
    and user_id = auth.uid()
  );

create policy "alertes_terrain_insert_bureau_admin"
  on public.alertes_terrain for insert
  with check (
    is_workspace_member(workspace_id)
    and get_workspace_role(workspace_id) in ('admin', 'bureau')
  );

create policy "alertes_terrain_update"
  on public.alertes_terrain for update
  using (
    is_workspace_member(workspace_id)
    and get_workspace_role(workspace_id) in ('admin', 'bureau')
  );

create policy "alertes_terrain_delete"
  on public.alertes_terrain for delete
  using (
    is_workspace_member(workspace_id)
    and get_workspace_role(workspace_id) in ('admin', 'bureau')
  );

-- ─── email_statuses ──────────────────────────────────────────────────────────

create policy "email_statuses_select"
  on public.email_statuses for select
  using (
    is_workspace_member(workspace_id)
    and get_workspace_role(workspace_id) in ('admin', 'bureau')
  );

create policy "email_statuses_insert"
  on public.email_statuses for insert
  with check (
    is_workspace_member(workspace_id)
    and get_workspace_role(workspace_id) in ('admin', 'bureau')
  );

create policy "email_statuses_update"
  on public.email_statuses for update
  using (
    is_workspace_member(workspace_id)
    and get_workspace_role(workspace_id) in ('admin', 'bureau')
  );

create policy "email_statuses_delete"
  on public.email_statuses for delete
  using (
    is_workspace_member(workspace_id)
    and get_workspace_role(workspace_id) in ('admin', 'bureau')
  );

-- ─── email_acknowledgments ───────────────────────────────────────────────────

create policy "email_acknowledgments_select"
  on public.email_acknowledgments for select
  using (
    is_workspace_member(workspace_id)
    and get_workspace_role(workspace_id) in ('admin', 'bureau')
  );

create policy "email_acknowledgments_insert"
  on public.email_acknowledgments for insert
  with check (
    is_workspace_member(workspace_id)
    and get_workspace_role(workspace_id) in ('admin', 'bureau')
  );

-- ─── gmail_connections ───────────────────────────────────────────────────────
-- admin only (sensitive credentials).

create policy "gmail_connections_admin_select"
  on public.gmail_connections for select
  using (
    is_workspace_member(workspace_id)
    and get_workspace_role(workspace_id) = 'admin'
  );

create policy "gmail_connections_admin_insert"
  on public.gmail_connections for insert
  with check (
    is_workspace_member(workspace_id)
    and get_workspace_role(workspace_id) = 'admin'
  );

create policy "gmail_connections_admin_update"
  on public.gmail_connections for update
  using (
    is_workspace_member(workspace_id)
    and get_workspace_role(workspace_id) = 'admin'
  );

create policy "gmail_connections_admin_delete"
  on public.gmail_connections for delete
  using (
    is_workspace_member(workspace_id)
    and get_workspace_role(workspace_id) = 'admin'
  );

-- ─── quote_reminders ─────────────────────────────────────────────────────────

create policy "quote_reminders_select"
  on public.quote_reminders for select
  using (
    is_workspace_member(workspace_id)
    and get_workspace_role(workspace_id) in ('admin', 'bureau')
  );

create policy "quote_reminders_insert"
  on public.quote_reminders for insert
  with check (
    is_workspace_member(workspace_id)
    and get_workspace_role(workspace_id) in ('admin', 'bureau')
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- Storage: update logo bucket policy to use workspace role instead of user_metadata
-- ─────────────────────────────────────────────────────────────────────────────

drop policy if exists "admin_insert_company_logo"      on storage.objects;
drop policy if exists "admin_delete_company_logo"      on storage.objects;
drop policy if exists "authenticated_read_company_logo" on storage.objects;

-- Logos are now per-workspace; we keep simple auth check for storage.
-- Fine-grained workspace checks happen at the API layer.
create policy "authenticated_read_company_logo"
  on storage.objects for select to authenticated
  using (bucket_id = 'company-logos');

create policy "authenticated_write_company_logo"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'company-logos');

create policy "authenticated_delete_company_logo"
  on storage.objects for delete to authenticated
  using (bucket_id = 'company-logos');

-- ─────────────────────────────────────────────────────────────────────────────
-- Dev seed: one workspace with known UUID for local development
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.workspaces (id, name, slug)
values ('00000000-0000-0000-0000-000000000001', 'Dev Workspace', 'dev-workspace')
on conflict (id) do nothing;

-- Default workspace_settings (mirrors former app_settings keys)
insert into public.workspace_settings (workspace_id, key, value)
values
  ('00000000-0000-0000-0000-000000000001', 'company_name',               ''),
  ('00000000-0000-0000-0000-000000000001', 'company_address',            ''),
  ('00000000-0000-0000-0000-000000000001', 'company_siret',              ''),
  ('00000000-0000-0000-0000-000000000001', 'company_logo_url',           ''),
  ('00000000-0000-0000-0000-000000000001', 'weekly_report_recipients',   '[]'),
  ('00000000-0000-0000-0000-000000000001', 'weekly_report_enabled',      'true'),
  ('00000000-0000-0000-0000-000000000001', 'auto_reminders_enabled',     'true'),
  ('00000000-0000-0000-0000-000000000001', 'reminder_delay_j7',          '7'),
  ('00000000-0000-0000-0000-000000000001', 'reminder_delay_j14',         '14'),
  ('00000000-0000-0000-0000-000000000001', 'default_cgv',                ''),
  ('00000000-0000-0000-0000-000000000001', 'auto_acknowledgment_enabled','false')
on conflict (workspace_id, key) do nothing;
