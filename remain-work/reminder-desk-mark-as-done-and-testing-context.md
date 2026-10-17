# Reminder Desk — Project Context and Testing Checklist

**Last updated:** 17 October 2026  
**Purpose:** Carry this context into a new chat so work can continue without repeating setup details.

## 1. Project overview

Reminder Desk is a mobile-friendly reminder web app/PWA.

- Frontend: plain HTML, CSS, and JavaScript.
- Hosting: GitHub Pages.
- Backend/database/storage: Supabase.
- Push notifications: Web Push API, service worker, Supabase Edge Function.
- Main project folder on the user's Windows PC: `D:\reminder-app`.
- User prefers beginner-friendly guidance and wants to do **one step at a time**. Give one action, wait for the result, then give the next action.
- Never ask the user to share secret keys. Never put the Supabase service-role key, VAPID private key, or CRON secret in frontend files.

## 2. Current setup and deployment notes

- Supabase project name: `reminder-app`.
- Project ref: `fbhbgptynskcyoipvsne`.
- Edge Function: `supabase/functions/send-reminders/index.ts`.
- The `send-reminders` function was deployed successfully; Supabase CLI previously showed it as ACTIVE (version 8).
- The server-side scheduler must invoke the function every minute for automatic scheduled push delivery.
- VAPID public key belongs in frontend configuration; VAPID private key and service-role credentials must remain server-side.
- Supabase automatically provides `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to Edge Functions in standard projects. Do not add secrets with names beginning `SUPABASE_` unless Supabase's current instructions explicitly require it.
- The project has `js/config.js`, `service-worker.js`, `assets/`, `css/`, `js/`, and `supabase/` directories.
- `.gitignore` includes `supabase/.temp/`.
- Latest reported Git state was clean and synced with `origin/main`.
- Supabase `delivery_logs` table was checked previously and recent entries showed `sent`.
- User reports custom reminder icons and notification click destinations are working.

## 3. Existing reminder features already implemented/tested earlier

Phase 3 features were reported working:
- Weekly schedules.
- One-time specific-date reminders.
- Date-range reminders.
- Create, refresh/reload, edit and save.
- Delete.
- `Done Today` / `Undo Done` in the app UI.
- Mobile layout.
- No browser console errors in the reported tests.

Push notification phases:
- Phase 4A local Chrome notification test succeeded.
- Phase 4B server-side scheduled push delivery was deployed.
- Push subscription table/migration is `phase4a-push-subscriptions.sql`.
- Phase 4B uses the Edge Function plus a trusted scheduler.
- A scheduler call is required every minute; without it, scheduled pushes will not be sent automatically.
- Keep service-role and private VAPID/CRON secrets out of GitHub and frontend files.

## 4. Push tests the user has already completed successfully

The user has reported all of the following working:
- Notifications scheduled at different times.
- Multiple reminders scheduled for the same time: both arrived separately.
- Notifications arrived with Chrome closed.
- Notifications arrived with the PWA closed.
- Notifications arrived while the phone was locked.
- Custom reminder icons appeared in notifications.
- Tapping a notification with a URL opened that URL.
- Tapping a notification without a URL opened Reminder Desk.
- These tests were run on the user's Android phone.

Do not ask the user to repeat these basic tests unless a code change makes a regression check necessary.

## 5. Current active task: Notification action “Mark as Done”

The user wants a notification action button that can be used without opening the app.

### Required behavior

1. Add a `Mark as Done` action to the push notification.
2. When tapped, it must update the relevant completion state in Supabase, not merely dismiss the notification.
3. It should work while the app/PWA is closed, subject to Android/browser push and background limitations.
4. It must reuse or fit the existing `Done Today` / `Undo Done` behavior and data model where possible; avoid creating a second, conflicting completion system.
5. The service worker should handle the action click and trigger a secure backend operation.
6. Do not expose service-role credentials or private keys in the service worker or frontend.
7. Verify the action belongs to the correct reminder and correct scheduled/local date. Consider duplicate clicks/idempotency.

### Recurring vs one-time reminder semantics

- **Repeating reminders** (daily or selected weekdays): `Mark as Done` should mark the reminder complete **for that local calendar date only**. It must not permanently set the reminder's `enabled` field to `false`. On the next scheduled day, the reminder should automatically be eligible to notify again.
- **Selected weekdays:** completion applies only to the current date; the reminder still follows its selected weekdays.
- **One-time reminders:** marking done should complete that one-time reminder so it does not notify again.
- Use the reminder's timezone setting (previous schema default was `Asia/Kolkata`) when determining the date. Avoid using UTC date blindly for local-day completion.
- Recommended data design: store completion per reminder and date, using the existing completion table/structure if one exists. Before adding a migration or table, inspect the current schema and existing `Done Today` / `Undo Done` implementation to avoid duplicate data models.
- After implementing `Mark as Done`, test that Supabase state changes, the UI reflects completion, and a repeating reminder becomes eligible again on the next scheduled day.

### Existing schema notes (verify current schema before changing)

Previously reported `public.reminders` fields included:
- `id`, `user_id`, `name`, `message`, `url`
- `days smallint[]` (default days Monday–Saturday in the earlier schema)
- `times text[]` (earlier default `["09:00","18:00"]`)
- `timezone` (earlier default `Asia/Kolkata`)
- `enabled boolean` (default true)
- `icon_path`, `created_at`, `updated_at`
- One-time and date-range schedule fields were added in Phase 3.
- `public.push_subscriptions` exists.
- `delivery_logs` exists.
These are historical notes; inspect the current project files and database schema before editing.

## 6. Suggested notification actions

Implement in this order, testing one at a time:
1. **Mark as Done** — current task. Persist completion in Supabase and respect recurring/one-time behavior.
2. **Remind Me Later** — later feature. Suggested options: 10 minutes, 30 minutes, or 1 hour. Snoozing must not change the original weekly schedule; it should create a temporary deferred delivery.
3. **View** — keep existing notification-click behavior: open the reminder URL when supplied, otherwise open Reminder Desk.
4. Optional later action: **Dismiss** — dismiss the notification without marking the reminder complete or changing its schedule.

Android/browser notification action presentation can vary by device/browser. Verify on the user's Android device after implementation.

## 7. Remaining legacy testing checklist (preserve this for later)

The user asked to preserve this checklist and will return to complete it. Do not lose it.

### Test A — Done Today / Undo Done
- For a repeating reminder, press `Done Today`.
- Confirm that reminder is skipped for the current local date while other active reminders continue normally.
- Confirm it is eligible again on its next scheduled day.
- Test `Undo Done` and confirm the completion can be reversed as intended.
- Also test a one-time reminder: marking it done should prevent future delivery.

### Test B — Edit schedule
- Edit a reminder's time/schedule and save.
- Confirm the old schedule no longer sends a notification.
- Confirm the new schedule sends one at the intended time.

### Test C — Pause / Resume
- Pause/disable a reminder.
- Confirm it sends no notification while paused.
- Resume/enable it and confirm it works again at its next scheduled time.

### Test D — Delete
- Delete a reminder.
- Confirm it no longer sends notifications at its old scheduled times.

### Test E — Supabase delivery logs and duplicate prevention
- Inspect `delivery_logs` around test times.
- Confirm successful sends are logged appropriately.
- Check for failed sends and repeated/duplicate sends.
- Confirm one scheduled reminder does not produce duplicate notifications from repeated scheduler invocations.

### Test F — Final reliability/security checks
- Verify login/auth still works.
- If multiple devices are used, verify each device subscription behaves as intended and stale/expired subscriptions are handled safely.
- Verify the scheduler is configured to call `send-reminders` every minute.
- Confirm secrets remain server-side and are not committed to GitHub.
- Check browser console and Edge Function logs for errors.

## 8. Recommended working procedure

1. Start by inspecting the current files/schema related to:
   - `Done Today` / `Undo Done` in the frontend.
   - Supabase completion records or migrations.
   - `service-worker.js` notification display/click handling.
   - `supabase/functions/send-reminders/index.ts` payload and server-side logic.
2. Do not rewrite the whole app or replace working notification code unnecessarily.
3. Make the smallest safe change for `Mark as Done`.
4. Explain one action at a time, especially for Windows/Supabase CLI instructions.
5. Ask the user to report the result before proceeding.
6. After the feature is implemented, run focused regression tests and then continue the legacy checklist above.

## 9. Immediate next step

Before writing code, inspect the current frontend code for `Done Today` / `Undo Done` (likely in `js/app.js`), the current `service-worker.js`, and current Supabase schema/migrations for the completion mechanism. Base implementation on the current project files, not assumptions from this context note.
