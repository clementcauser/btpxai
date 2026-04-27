-- Mise à jour de tasks.assigned_to pour Better-Auth.
-- Better-Auth utilise text (nanoid) comme type d'ID, pas uuid.
-- À exécuter APRÈS npx @better-auth/cli migrate (qui crée la table public.user).

alter table public.tasks
  drop constraint if exists tasks_assigned_to_fkey;

-- Conversion uuid → text pour correspondre au type id de public.user
alter table public.tasks
  alter column assigned_to type text using assigned_to::text;

alter table public.tasks
  add constraint tasks_assigned_to_fkey
  foreign key (assigned_to)
  references public."user"(id)
  on delete set null;
