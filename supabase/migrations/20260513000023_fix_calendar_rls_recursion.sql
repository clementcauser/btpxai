-- Fix: infinite recursion in calendar_event_assignees RLS policies
--
-- Cause: calendar_events policy "ouvrier sees assigned events" queries
--        calendar_event_assignees, whose "bureau admin see all assignees"
--        policy queries back calendar_events → infinite loop.
--
-- Fix: replace the recursive sub-select with a SECURITY DEFINER function
--      that reads calendar_events bypassing RLS.

DROP POLICY IF EXISTS "bureau admin see all assignees" ON calendar_event_assignees;
DROP POLICY IF EXISTS "bureau admin manage assignees" ON calendar_event_assignees;

CREATE OR REPLACE FUNCTION public.is_bureau_admin_for_event(p_event_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM calendar_events ce
    JOIN workspace_members wm ON wm.workspace_id = ce.workspace_id
    WHERE ce.id = p_event_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('admin', 'bureau')
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_bureau_admin_for_event(uuid) TO authenticated;

CREATE POLICY "bureau admin see all assignees"
  ON calendar_event_assignees FOR SELECT
  USING (public.is_bureau_admin_for_event(event_id));

CREATE POLICY "bureau admin manage assignees"
  ON calendar_event_assignees FOR ALL
  USING (public.is_bureau_admin_for_event(event_id));
