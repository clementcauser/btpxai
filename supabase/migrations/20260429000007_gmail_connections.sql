create table public.gmail_connections (
  id            uuid primary key default gen_random_uuid(),
  email         text not null,
  access_token  text not null,
  refresh_token text not null,
  expires_at    timestamptz not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.gmail_connections enable row level security;

create policy "bureau and admin can select gmail_connections"
  on public.gmail_connections for select
  using (auth.uid() is not null);

create policy "bureau and admin can insert gmail_connections"
  on public.gmail_connections for insert
  with check (auth.uid() is not null);

create policy "bureau and admin can update gmail_connections"
  on public.gmail_connections for update
  using (auth.uid() is not null);

create policy "bureau and admin can delete gmail_connections"
  on public.gmail_connections for delete
  using (auth.uid() is not null);
