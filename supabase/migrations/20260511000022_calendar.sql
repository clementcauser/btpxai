-- supabase/migrations/20260511000022_calendar.sql

-- Types d'événements configurables par workspace
CREATE TABLE IF NOT EXISTS calendar_event_types (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  label       text NOT NULL,
  color       text NOT NULL DEFAULT '#6366f1',
  is_preset   boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Événements du calendrier
CREATE TABLE IF NOT EXISTS calendar_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title         text NOT NULL,
  description   text,
  start_at      timestamptz NOT NULL,
  end_at        timestamptz NOT NULL,
  event_type_id uuid REFERENCES calendar_event_types(id) ON DELETE SET NULL,
  created_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Ouvriers assignés (N-N)
CREATE TABLE IF NOT EXISTS calendar_event_assignees (
  event_id uuid NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  user_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  PRIMARY KEY (event_id, user_id)
);

-- Index perf
CREATE INDEX IF NOT EXISTS idx_calendar_events_workspace_start
  ON calendar_events(workspace_id, start_at);
CREATE INDEX IF NOT EXISTS idx_calendar_event_assignees_user
  ON calendar_event_assignees(user_id);

-- RLS
ALTER TABLE calendar_event_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_event_assignees ENABLE ROW LEVEL SECURITY;

-- calendar_event_types : lecture par membres du workspace, écriture admin/bureau
CREATE POLICY "workspace members can read event types"
  ON calendar_event_types FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "admin bureau can manage event types"
  ON calendar_event_types FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND role IN ('admin', 'bureau')
    )
  );

-- calendar_events : bureau/admin voient tout, ouvrier uniquement ses événements
CREATE POLICY "bureau admin see all events"
  ON calendar_events FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND role IN ('admin', 'bureau')
    )
  );

CREATE POLICY "ouvrier sees assigned events"
  ON calendar_events FOR SELECT
  USING (
    id IN (
      SELECT event_id FROM calendar_event_assignees WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "bureau admin can manage events"
  ON calendar_events FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND role IN ('admin', 'bureau')
    )
  );

-- calendar_event_assignees : mêmes règles
CREATE POLICY "bureau admin see all assignees"
  ON calendar_event_assignees FOR SELECT
  USING (
    event_id IN (
      SELECT id FROM calendar_events
      WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members
        WHERE user_id = auth.uid() AND role IN ('admin', 'bureau')
      )
    )
  );

CREATE POLICY "ouvrier sees own assignees"
  ON calendar_event_assignees FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "bureau admin manage assignees"
  ON calendar_event_assignees FOR ALL
  USING (
    event_id IN (
      SELECT id FROM calendar_events
      WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members
        WHERE user_id = auth.uid() AND role IN ('admin', 'bureau')
      )
    )
  );
