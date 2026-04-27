-- Enums
create type public.project_status as enum ('planned', 'in_progress', 'completed', 'cancelled');
create type public.quote_status as enum ('draft', 'sent', 'accepted', 'rejected', 'expired');
create type public.task_status as enum ('todo', 'in_progress', 'done', 'blocked');

-- clients
create table public.clients (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text,
  phone      text,
  address    text,
  created_at timestamptz not null default now()
);

-- projects
create table public.projects (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.clients(id) on delete restrict,
  title       text not null,
  description text,
  status      public.project_status not null default 'planned',
  created_at  timestamptz not null default now()
);

-- quotes
create table public.quotes (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  status     public.quote_status not null default 'draft',
  total_ht   numeric(10,2) not null default 0,
  created_at timestamptz not null default now(),
  sent_at    timestamptz
);

-- quote_items
create table public.quote_items (
  id         uuid primary key default gen_random_uuid(),
  quote_id   uuid not null references public.quotes(id) on delete cascade,
  label      text not null,
  quantity   numeric(10,2) not null,
  unit_price numeric(10,2) not null,
  unit       text
);

-- tasks
create table public.tasks (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  title       text not null,
  status      public.task_status not null default 'todo',
  assigned_to uuid references auth.users(id) on delete set null,
  due_date    date
);
