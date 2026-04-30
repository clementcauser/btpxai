-- Add reminders toggle to quotes
ALTER TABLE public.quotes
  ADD COLUMN reminders_enabled BOOLEAN NOT NULL DEFAULT true;

-- Track sent reminders to prevent duplicates
CREATE TABLE IF NOT EXISTS public.quote_reminders (
  id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id  UUID        NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  type      TEXT        NOT NULL CHECK (type IN ('quote_j7', 'quote_j14', 'payment')),
  sent_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  email_to  TEXT        NOT NULL
);

ALTER TABLE public.quote_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bureau_admin_full_access" ON public.quote_reminders
  FOR ALL TO authenticated
  USING  ((auth.jwt() -> 'user_metadata' ->> 'role') IN ('bureau', 'admin'))
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') IN ('bureau', 'admin'));

CREATE INDEX IF NOT EXISTS quote_reminders_quote_id_idx ON public.quote_reminders(quote_id);
CREATE INDEX IF NOT EXISTS quote_reminders_type_idx      ON public.quote_reminders(type);
CREATE INDEX IF NOT EXISTS quote_reminders_sent_at_idx   ON public.quote_reminders(sent_at);
