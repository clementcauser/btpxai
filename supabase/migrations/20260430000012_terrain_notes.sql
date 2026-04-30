-- supabase/migrations/20260430000012_terrain_notes.sql

create table if not exists public.terrain_notes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  transcription text,
  audio_url text,
  created_at timestamptz not null default now()
);

alter table public.terrain_notes enable row level security;

-- ouvrier: insert + read own rows
create policy "ouvrier_insert_own_notes"
  on public.terrain_notes
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and auth.jwt() -> 'user_metadata' ->> 'role' = 'ouvrier'
  );

create policy "ouvrier_select_own_notes"
  on public.terrain_notes
  for select
  to authenticated
  using (
    auth.uid() = user_id
    and auth.jwt() -> 'user_metadata' ->> 'role' = 'ouvrier'
  );

-- bureau + admin: read all
create policy "bureau_admin_select_notes"
  on public.terrain_notes
  for select
  to authenticated
  using (
    auth.jwt() -> 'user_metadata' ->> 'role' in ('bureau', 'admin')
  );
