-- Reminder Desk Phase 2 migration
-- Run once in Supabase SQL Editor after Phase 1 is working.
-- Existing reminders are preserved.

create table if not exists public.reminder_completions (
  id uuid primary key default gen_random_uuid(),
  reminder_id uuid not null references public.reminders(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  completion_date date not null,
  completed_at timestamptz not null default now(),
  constraint reminder_completions_once_per_day unique (reminder_id, completion_date)
);

create index if not exists reminder_completions_user_date_idx
  on public.reminder_completions (user_id, completion_date desc);

alter table public.reminder_completions enable row level security;

drop policy if exists "Users can view own reminder completions" on public.reminder_completions;
create policy "Users can view own reminder completions"
  on public.reminder_completions for select to authenticated
  using (
    (select auth.uid()) = user_id
    and exists (select 1 from public.reminders r where r.id = reminder_id and r.user_id = (select auth.uid()))
  );

drop policy if exists "Users can insert own reminder completions" on public.reminder_completions;
create policy "Users can insert own reminder completions"
  on public.reminder_completions for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.reminders r where r.id = reminder_id and r.user_id = (select auth.uid()))
  );

drop policy if exists "Users can delete own reminder completions" on public.reminder_completions;
create policy "Users can delete own reminder completions"
  on public.reminder_completions for delete to authenticated
  using (
    (select auth.uid()) = user_id
    and exists (select 1 from public.reminders r where r.id = reminder_id and r.user_id = (select auth.uid()))
  );

-- Scheduler preparation: a unique key prevents the same scheduled occurrence
-- from being recorded/delivered twice by a future scheduled worker.
create table if not exists public.reminder_delivery_log (
  id uuid primary key default gen_random_uuid(),
  reminder_id uuid not null references public.reminders(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  scheduled_for timestamptz not null,
  status text not null default 'pending' check (status in ('pending','sent','failed','skipped')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reminder_delivery_once_per_occurrence unique (reminder_id, scheduled_for)
);

create index if not exists reminder_delivery_log_user_schedule_idx
  on public.reminder_delivery_log (user_id, scheduled_for desc);

alter table public.reminder_delivery_log enable row level security;

drop policy if exists "Users can view own delivery logs" on public.reminder_delivery_log;
create policy "Users can view own delivery logs"
  on public.reminder_delivery_log for select to authenticated
  using ((select auth.uid()) = user_id);

-- No browser write policy is intentionally provided for delivery logs.
-- A future trusted scheduled worker must write delivery records using a secret
-- held only on the server, never in js/config.js.
