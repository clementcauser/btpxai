-- Add workspace_id NOT NULL to all 14 business tables.
-- Safe because all tables are empty at this point (supabase db reset).

-- 1. clients
alter table public.clients
  add column workspace_id uuid not null references public.workspaces(id) on delete cascade;
create index clients_workspace_id_idx on public.clients(workspace_id);

-- 2. projects
alter table public.projects
  add column workspace_id uuid not null references public.workspaces(id) on delete cascade;
create index projects_workspace_id_idx on public.projects(workspace_id);

-- 3. quotes
alter table public.quotes
  add column workspace_id uuid not null references public.workspaces(id) on delete cascade;
create index quotes_workspace_id_idx on public.quotes(workspace_id);

-- 4. quote_items
alter table public.quote_items
  add column workspace_id uuid not null references public.workspaces(id) on delete cascade;
create index quote_items_workspace_id_idx on public.quote_items(workspace_id);

-- 5. tasks
alter table public.tasks
  add column workspace_id uuid not null references public.workspaces(id) on delete cascade;
create index tasks_workspace_id_idx on public.tasks(workspace_id);

-- 6. project_steps
alter table public.project_steps
  add column workspace_id uuid not null references public.workspaces(id) on delete cascade;
create index project_steps_workspace_id_idx on public.project_steps(workspace_id);

-- 7. terrain_notes
alter table public.terrain_notes
  add column workspace_id uuid not null references public.workspaces(id) on delete cascade;
create index terrain_notes_workspace_id_idx on public.terrain_notes(workspace_id);

-- 8. terrain_photos
alter table public.terrain_photos
  add column workspace_id uuid not null references public.workspaces(id) on delete cascade;
create index terrain_photos_workspace_id_idx on public.terrain_photos(workspace_id);

-- 9. materiaux_requests
alter table public.materiaux_requests
  add column workspace_id uuid not null references public.workspaces(id) on delete cascade;
create index materiaux_requests_workspace_id_idx on public.materiaux_requests(workspace_id);

-- 10. alertes_terrain
alter table public.alertes_terrain
  add column workspace_id uuid not null references public.workspaces(id) on delete cascade;
create index alertes_terrain_workspace_id_idx on public.alertes_terrain(workspace_id);

-- 11. email_statuses
alter table public.email_statuses
  add column workspace_id uuid not null references public.workspaces(id) on delete cascade;
create index email_statuses_workspace_id_idx on public.email_statuses(workspace_id);

-- 12. email_acknowledgments
alter table public.email_acknowledgments
  add column workspace_id uuid not null references public.workspaces(id) on delete cascade;
create index email_acknowledgments_workspace_id_idx on public.email_acknowledgments(workspace_id);

-- 13. gmail_connections
alter table public.gmail_connections
  add column workspace_id uuid not null references public.workspaces(id) on delete cascade;
create index gmail_connections_workspace_id_idx on public.gmail_connections(workspace_id);

-- 14. quote_reminders
alter table public.quote_reminders
  add column workspace_id uuid not null references public.workspaces(id) on delete cascade;
create index quote_reminders_workspace_id_idx on public.quote_reminders(workspace_id);
