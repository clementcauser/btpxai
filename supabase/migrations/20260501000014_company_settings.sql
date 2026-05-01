-- Company settings: seed default keys in app_settings KV store
INSERT INTO public.app_settings (key, value)
VALUES
  ('company_name',               ''),
  ('company_address',            ''),
  ('company_siret',              ''),
  ('company_logo_url',           ''),
  ('weekly_report_recipients',   '[]'),
  ('weekly_report_enabled',      'true'),
  ('auto_reminders_enabled',     'true'),
  ('reminder_delay_j7',          '7'),
  ('reminder_delay_j14',         '14'),
  ('default_cgv',                '')
ON CONFLICT (key) DO NOTHING;

-- Storage bucket for company logos (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-logos', 'company-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Only admins may upload logos
CREATE POLICY "admin_insert_company_logo"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'company-logos'
    AND (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- Only admins may delete / replace logos
CREATE POLICY "admin_delete_company_logo"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'company-logos'
    AND (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- Everyone (authenticated) may read logos
CREATE POLICY "authenticated_read_company_logo"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'company-logos');
