-- supabase/migrations/20260430000013_terrain_photos.sql

create table if not exists public.terrain_photos (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  photo_url text not null,
  lat double precision,
  lng double precision,
  created_at timestamptz not null default now()
);

alter table public.terrain_photos enable row level security;

-- ouvrier: insert + read own rows
create policy "ouvrier_insert_own_photos"
  on public.terrain_photos
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and auth.jwt() -> 'user_metadata' ->> 'role' = 'ouvrier'
  );

create policy "ouvrier_select_own_photos"
  on public.terrain_photos
  for select
  to authenticated
  using (
    auth.uid() = user_id
    and auth.jwt() -> 'user_metadata' ->> 'role' = 'ouvrier'
  );

-- bureau + admin: read all
create policy "bureau_admin_select_photos"
  on public.terrain_photos
  for select
  to authenticated
  using (
    auth.jwt() -> 'user_metadata' ->> 'role' in ('bureau', 'admin')
  );

-- Storage bucket for terrain photos (run once via dashboard or seed)
-- insert into storage.buckets (id, name, public)
-- values ('terrain-photos', 'terrain-photos', true)
-- on conflict (id) do nothing;
