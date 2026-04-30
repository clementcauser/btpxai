ALTER TABLE public.email_statuses
  ADD COLUMN IF NOT EXISTS category TEXT
    CHECK (category IN ('demande_devis', 'suivi_commande', 'question', 'autre'));
