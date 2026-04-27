-- Enable RLS
alter table public.clients     enable row level security;
alter table public.projects    enable row level security;
alter table public.quotes      enable row level security;
alter table public.quote_items enable row level security;
alter table public.tasks       enable row level security;

-- TODO: affiner par rôle (admin / bureau / ouvrier) quand Better-Auth est intégré
-- Pour l'instant : tout utilisateur authentifié a accès complet

-- clients
create policy "authenticated users can select clients"
  on public.clients for select
  using (auth.uid() is not null);

create policy "authenticated users can insert clients"
  on public.clients for insert
  with check (auth.uid() is not null);

create policy "authenticated users can update clients"
  on public.clients for update
  using (auth.uid() is not null);

create policy "authenticated users can delete clients"
  on public.clients for delete
  using (auth.uid() is not null);

-- projects
create policy "authenticated users can select projects"
  on public.projects for select
  using (auth.uid() is not null);

create policy "authenticated users can insert projects"
  on public.projects for insert
  with check (auth.uid() is not null);

create policy "authenticated users can update projects"
  on public.projects for update
  using (auth.uid() is not null);

create policy "authenticated users can delete projects"
  on public.projects for delete
  using (auth.uid() is not null);

-- quotes
create policy "authenticated users can select quotes"
  on public.quotes for select
  using (auth.uid() is not null);

create policy "authenticated users can insert quotes"
  on public.quotes for insert
  with check (auth.uid() is not null);

create policy "authenticated users can update quotes"
  on public.quotes for update
  using (auth.uid() is not null);

create policy "authenticated users can delete quotes"
  on public.quotes for delete
  using (auth.uid() is not null);

-- quote_items
create policy "authenticated users can select quote_items"
  on public.quote_items for select
  using (auth.uid() is not null);

create policy "authenticated users can insert quote_items"
  on public.quote_items for insert
  with check (auth.uid() is not null);

create policy "authenticated users can update quote_items"
  on public.quote_items for update
  using (auth.uid() is not null);

create policy "authenticated users can delete quote_items"
  on public.quote_items for delete
  using (auth.uid() is not null);

-- tasks
create policy "authenticated users can select tasks"
  on public.tasks for select
  using (auth.uid() is not null);

create policy "authenticated users can insert tasks"
  on public.tasks for insert
  with check (auth.uid() is not null);

create policy "authenticated users can update tasks"
  on public.tasks for update
  using (auth.uid() is not null);

create policy "authenticated users can delete tasks"
  on public.tasks for delete
  using (auth.uid() is not null);
