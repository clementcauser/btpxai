-- Storage bucket for generated quote PDFs
insert into storage.buckets (id, name, public)
values ('quotes-pdf', 'quotes-pdf', false)
on conflict (id) do nothing;

-- Allow authenticated users to upload/read their own quote PDFs
create policy "bureau can upload quote pdfs"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'quotes-pdf');

create policy "bureau can read quote pdfs"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'quotes-pdf');

create policy "bureau can delete quote pdfs"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'quotes-pdf');
