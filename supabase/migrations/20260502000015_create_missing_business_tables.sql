-- Tables created via Supabase dashboard, not tracked in migrations.
-- Must exist before workspace_id is added in migration 003.

-- project_steps
create table if not exists public.project_steps (
  id           uuid        primary key default gen_random_uuid(),
  project_id   uuid        not null references public.projects(id) on delete cascade,
  label        text        not null,
  "order"      integer     not null,
  completed_at timestamptz,
  completed_by text
);

create index if not exists project_steps_project_id_idx on public.project_steps(project_id);

alter table public.project_steps enable row level security;

-- alertes_terrain
create table if not exists public.alertes_terrain (
  id          uuid        primary key default gen_random_uuid(),
  project_id  uuid        references public.projects(id) on delete set null,
  user_id     uuid        not null references auth.users(id) on delete cascade,
  urgency     text        not null check (urgency in ('faible', 'elevee', 'critique')),
  description text        not null,
  photo_url   text,
  status      text        not null default 'ouvert' check (status in ('ouvert', 'pris_en_charge', 'resolu')),
  handled_by  text,
  handled_at  timestamptz,
  resolved_at timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists alertes_terrain_project_id_idx on public.alertes_terrain(project_id);
create index if not exists alertes_terrain_status_idx     on public.alertes_terrain(status);

alter table public.alertes_terrain enable row level security;

-- materiaux_requests
create table if not exists public.materiaux_requests (
  id         uuid        primary key default gen_random_uuid(),
  project_id uuid        not null references public.projects(id) on delete cascade,
  user_id    uuid        not null references auth.users(id) on delete cascade,
  label      text        not null,
  quantity   text        not null,
  urgency    text        not null check (urgency in ('normal', 'urgent', 'critique')),
  comment    text,
  photo_url  text,
  status     text        not null default 'pending' check (status in ('pending', 'ordered', 'delivered')),
  created_at timestamptz not null default now()
);

create index if not exists materiaux_requests_project_id_idx on public.materiaux_requests(project_id);
create index if not exists materiaux_requests_status_idx     on public.materiaux_requests(status);

alter table public.materiaux_requests enable row level security;
