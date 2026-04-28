-- Add missing fields to the quotes table
alter table public.quotes
  add column tva_rate      numeric(5,2)  not null default 20,
  add column notes         text,
  add column validity_days integer       not null default 30,
  add column reference     text;
