-- Fix email_statuses unique constraint to be composite (workspace_id, message_id).
-- The original migration only had UNIQUE on message_id alone, but upsert logic
-- uses onConflict: "workspace_id,message_id" which requires a composite constraint.

ALTER TABLE public.email_statuses
  DROP CONSTRAINT IF EXISTS email_statuses_message_id_key;

ALTER TABLE public.email_statuses
  ADD CONSTRAINT email_statuses_workspace_message_unique
  UNIQUE (workspace_id, message_id);
