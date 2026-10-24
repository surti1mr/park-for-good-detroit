create policy "demo insert profile" on public.profiles for insert to anon, authenticated with check (true);
create unique index profiles_email_unique on public.profiles (lower(email));