-- email_acknowledgments: tracks auto-acknowledgment emails sent per message
CREATE TABLE IF NOT EXISTS public.email_acknowledgments (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id   TEXT        UNIQUE NOT NULL,
  thread_id    TEXT        NOT NULL,
  sender_email TEXT        NOT NULL,
  client_name  TEXT,
  sent_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.email_acknowledgments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bureau_admin_full_access" ON public.email_acknowledgments
  FOR ALL TO authenticated
  USING  ((auth.jwt() -> 'user_metadata' ->> 'role') IN ('bureau', 'admin'))
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') IN ('bureau', 'admin'));

CREATE INDEX IF NOT EXISTS email_acknowledgments_sender_email_idx ON public.email_acknowledgments(sender_email);
CREATE INDEX IF NOT EXISTS email_acknowledgments_sent_at_idx       ON public.email_acknowledgments(sent_at);

-- app_settings: generic key/value store for application configuration
CREATE TABLE IF NOT EXISTS public.app_settings (
  key        TEXT        PRIMARY KEY,
  value      TEXT        NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bureau_admin_full_access" ON public.app_settings
  FOR ALL TO authenticated
  USING  ((auth.jwt() -> 'user_metadata' ->> 'role') IN ('bureau', 'admin'))
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') IN ('bureau', 'admin'));

INSERT INTO public.app_settings (key, value)
  VALUES ('auto_acknowledgment_enabled', 'false')
  ON CONFLICT (key) DO NOTHING;
