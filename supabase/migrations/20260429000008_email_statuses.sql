CREATE TABLE IF NOT EXISTS public.email_statuses (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id  TEXT    UNIQUE NOT NULL,
  thread_id   TEXT    NOT NULL,
  status      TEXT    NOT NULL DEFAULT 'a_traiter'
                CHECK (status IN ('a_traiter', 'en_cours', 'repondu', 'archive')),
  client_id   UUID    REFERENCES public.clients(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.email_statuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bureau_admin_full_access" ON public.email_statuses
  FOR ALL TO authenticated
  USING  ((auth.jwt() -> 'user_metadata' ->> 'role') IN ('bureau', 'admin'))
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') IN ('bureau', 'admin'));

CREATE OR REPLACE FUNCTION public.update_email_statuses_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER email_statuses_updated_at
  BEFORE UPDATE ON public.email_statuses
  FOR EACH ROW EXECUTE FUNCTION public.update_email_statuses_updated_at();

CREATE INDEX IF NOT EXISTS email_statuses_message_id_idx ON public.email_statuses(message_id);
CREATE INDEX IF NOT EXISTS email_statuses_status_idx     ON public.email_statuses(status);
CREATE INDEX IF NOT EXISTS email_statuses_client_id_idx  ON public.email_statuses(client_id);
