-- Reminder Desk Phase 3: date-based schedules
-- Run in Supabase SQL Editor AFTER Phase 2 is working.
-- Existing weekly reminders and completion records are preserved.

alter table public.reminders
  add column if not exists schedule_type text not null default 'weekly',
  add column if not exists specific_date date,
  add column if not exists start_date date,
  add column if not exists end_date date;

do $$
begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.reminders'::regclass and conname = 'reminders_schedule_type_valid') then
    alter table public.reminders add constraint reminders_schedule_type_valid
      check (schedule_type in ('weekly', 'once', 'range'));
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.reminders'::regclass and conname = 'reminders_schedule_dates_valid') then
    alter table public.reminders add constraint reminders_schedule_dates_valid
      check (
        (schedule_type = 'weekly' and specific_date is null and start_date is null and end_date is null)
        or (schedule_type = 'once' and specific_date is not null and start_date is null and end_date is null)
        or (schedule_type = 'range' and specific_date is null and start_date is not null and end_date is not null and end_date >= start_date)
      );
  end if;
end $$;

create index if not exists reminders_date_schedule_idx
  on public.reminders (user_id, schedule_type, specific_date, start_date, end_date);

-- Existing RLS on public.reminders protects these new columns.
-- Weekly reminders and reminder_completions are not modified.
