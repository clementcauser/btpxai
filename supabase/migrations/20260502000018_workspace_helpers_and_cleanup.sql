-- Helper: is the current Supabase auth user a member of a given workspace?
create or replace function public.is_workspace_member(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members
    where workspace_id = p_workspace_id
      and user_id      = auth.uid()
  );
$$;

-- Helper: what workspace_role does the current user hold in a given workspace?
-- Returns NULL if not a member.
create or replace function public.get_workspace_role(p_workspace_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role::text
  from public.workspace_members
  where workspace_id = p_workspace_id
    and user_id      = auth.uid()
  limit 1;
$$;

-- Drop app_settings: superseded by workspace_settings
drop table if exists public.app_settings cascade;
