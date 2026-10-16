-- Reminder Desk Phase 1 schema
-- Run in Supabase Dashboard -> SQL Editor.
-- Authenticated users can only access rows whose user_id matches auth.uid().

create extension if not exists pgcrypto;

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  message text not null default '' check (char_length(message) <= 500),
  url text,
  days smallint[] not null default array[1,2,3,4,5,6]::smallint[],
  times text[] not null default array['09:00','18:00']::text[],
  timezone text not null default 'Asia/Kolkata',
  enabled boolean not null default true,
  icon_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reminders_days_valid check (
    cardinality(days) between 1 and 7 and days <@ array[0,1,2,3,4,5,6]::smallint[]
  ),
  constraint reminders_times_count check (cardinality(times) between 1 and 10)
);

create index if not exists reminders_user_created_idx
  on public.reminders (user_id, created_at desc);

alter table public.reminders enable row level security;

drop policy if exists "Users can view own reminders" on public.reminders;
create policy "Users can view own reminders"
  on public.reminders for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own reminders" on public.reminders;
create policy "Users can insert own reminders"
  on public.reminders for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own reminders" on public.reminders;
create policy "Users can update own reminders"
  on public.reminders for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own reminders" on public.reminders;
create policy "Users can delete own reminders"
  on public.reminders for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Private bucket for reminder icons. Browser code requests short-lived signed URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('reminder-icons', 'reminder-icons', false, 1048576,
        array['image/png','image/jpeg','image/webp'])
on conflict (id) do update set
  public = false,
  file_size_limit = 1048576,
  allowed_mime_types = array['image/png','image/jpeg','image/webp'];

drop policy if exists "Users can read own reminder icons" on storage.objects;
create policy "Users can read own reminder icons"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'reminder-icons'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users can upload own reminder icons" on storage.objects;
create policy "Users can upload own reminder icons"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'reminder-icons'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users can update own reminder icons" on storage.objects;
create policy "Users can update own reminder icons"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'reminder-icons'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'reminder-icons'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users can delete own reminder icons" on storage.objects;
create policy "Users can delete own reminder icons"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'reminder-icons'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Phase 1 intentionally stores schedules in days/times columns.
-- Phase 2 can add a completion table and a notification-delivery log.
