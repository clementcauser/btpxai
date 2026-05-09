create table public.imap_connections (
  id                 uuid        primary key default gen_random_uuid(),
  workspace_id       uuid        not null references public.workspaces(id) on delete cascade,
  email              text        not null,
  label              text        not null default 'Boîte principale',
  imap_host          text        not null,
  imap_port          integer     not null,
  imap_secure        boolean     not null default true,
  smtp_host          text        not null,
  smtp_port          integer     not null,
  smtp_secure        boolean     not null default true,
  username           text        not null,
  password_encrypted text        not null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

alter table public.imap_connections enable row level security;

create index imap_connections_workspace_id_idx on public.imap_connections(workspace_id);

create policy "authenticated can select imap_connections"
  on public.imap_connections for select
  using (auth.uid() is not null);

create policy "authenticated can insert imap_connections"
  on public.imap_connections for insert
  with check (auth.uid() is not null);

create policy "authenticated can update imap_connections"
  on public.imap_connections for update
  using (auth.uid() is not null);

create policy "authenticated can delete imap_connections"
  on public.imap_connections for delete
  using (auth.uid() is not null);
