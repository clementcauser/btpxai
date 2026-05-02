-- workspace_role enum (admin/bureau/ouvrier per workspace)
create type public.workspace_role as enum ('admin', 'bureau', 'ouvrier');

-- workspaces: top-level tenant unit
create table public.workspaces (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null,
  slug       text        not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workspaces_slug_unique unique (slug)
);

-- workspace_members: user ↔ workspace membership with role
create table public.workspace_members (
  id           uuid                  primary key default gen_random_uuid(),
  workspace_id uuid                  not null references public.workspaces(id) on delete cascade,
  user_id      uuid                  not null references auth.users(id) on delete cascade,
  role         public.workspace_role not null,
  created_at   timestamptz           not null default now(),
  constraint workspace_members_unique unique (workspace_id, user_id)
);

create index workspace_members_workspace_id_idx on public.workspace_members(workspace_id);
create index workspace_members_user_id_idx      on public.workspace_members(user_id);

-- workspace_invitations: pending invites (token-based)
create table public.workspace_invitations (
  id           uuid                  primary key default gen_random_uuid(),
  workspace_id uuid                  not null references public.workspaces(id) on delete cascade,
  email        text                  not null,
  role         public.workspace_role not null,
  token        text                  not null unique default encode(gen_random_bytes(32), 'hex'),
  invited_by   uuid                  references auth.users(id) on delete set null,
  accepted_at  timestamptz,
  expires_at   timestamptz           not null default (now() + interval '7 days'),
  created_at   timestamptz           not null default now(),
  constraint workspace_invitations_unique unique (workspace_id, email)
);

create index workspace_invitations_token_idx on public.workspace_invitations(token);
create index workspace_invitations_email_idx on public.workspace_invitations(email);

-- workspace_settings: replaces app_settings, scoped per workspace
create table public.workspace_settings (
  workspace_id uuid        not null references public.workspaces(id) on delete cascade,
  key          text        not null,
  value        text        not null,
  updated_at   timestamptz not null default now(),
  primary key  (workspace_id, key)
);

create index workspace_settings_workspace_id_idx on public.workspace_settings(workspace_id);

-- Enable RLS (policies added in migration 005)
alter table public.workspaces            enable row level security;
alter table public.workspace_members     enable row level security;
alter table public.workspace_invitations enable row level security;
alter table public.workspace_settings    enable row level security;
