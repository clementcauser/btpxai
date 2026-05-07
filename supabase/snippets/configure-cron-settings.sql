-- Run this once in the Supabase SQL editor before applying the cron migration.
-- Replace the values with your actual project URL and anon key.
alter database postgres set app.supabase_url    = 'https://<PROJECT_REF>.supabase.co';
alter database postgres set app.supabase_anon_key = '<SUPABASE_ANON_KEY>';
