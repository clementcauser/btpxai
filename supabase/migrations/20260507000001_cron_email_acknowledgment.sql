-- Schedule email-acknowledgment every 2 minutes via Supabase Edge Function.
-- Before running this migration, configure the required database settings once:
--   see supabase/snippets/configure-cron-settings.sql
select cron.schedule(
  'email-acknowledgment',
  '*/2 * * * *',
  $$
  select net.http_post(
    url        := current_setting('app.supabase_url') || '/functions/v1/email-acknowledgment',
    headers    := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_anon_key')
    ),
    body       := '{}'::jsonb
  );
  $$
);
