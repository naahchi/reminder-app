# Reminder Desk — Phase 1

A plain HTML/CSS/JavaScript reminder manager for GitHub Pages, using Supabase Auth, Postgres and private Storage. This phase manages reminders and schedules; **it does not send real push notifications yet**.

## Project files

```text
reminder-app-phase1/
├── index.html
├── manifest.json
├── assets/default-icon.svg
├── css/style.css
├── js/config.js
├── js/app.js
└── supabase/schema.sql
```

## 1. Create the Supabase project

1. Create a project at https://supabase.com/.
2. Open **SQL Editor** in the Supabase dashboard.
3. Paste and run `supabase/schema.sql`. It creates the `reminders` table, enables Row Level Security (RLS), and creates a private `reminder-icons` storage bucket with per-user policies.
4. Go to **Project Settings → API** (the dashboard labels may change).
5. Copy the Project URL and the `anon` / publishable browser key.
6. Edit `js/config.js` and replace the two placeholder values.

**Never use the `service_role` or secret key in browser JavaScript.** The browser key is intended to be public only because RLS is enabled and the policies restrict rows and files to the signed-in user.

## 2. Configure authentication

1. In Supabase **Authentication → URL Configuration**, add your deployed GitHub Pages URL to the allowed redirect URLs / site URL.
2. For a repository site the URL is usually `https://YOURNAME.github.io/REPOSITORY/`. For a user/organization site it may be `https://YOURNAME.github.io/`.
3. Email confirmation may be enabled. If it is, confirm the email before signing in.
4. The default email service can have sending limits. Check Supabase's current authentication limits before relying on it.

## 3. Deploy to GitHub Pages

1. Create a repository, for example `reminder-app`.
2. Upload the files while preserving the folder structure.
3. In repository **Settings → Pages**, choose deployment from the `main` branch and root folder (or use your existing Pages workflow).
4. Wait for the HTTPS Pages URL to become available.
5. Open the site, create an account, sign in, and create a test reminder.

The project uses relative paths for local assets. GitHub Pages must be served over HTTPS for secure browser features.

## 4. Test checklist

- Create account, confirm email if requested, and sign in.
- Create a reminder with one or more times.
- Reload the page: the reminder should remain because it is stored in Supabase.
- Edit name, days, times, message and URL.
- Pause and resume a reminder.
- Upload a small image; try an unsupported file and an image larger than 1 MB.
- Reset to the default icon.
- Delete a reminder and confirm it disappears.
- Sign out and sign in with another account; it should not show the first user's rows.

## Important limitations in Phase 1

- **This phase does not send notifications**, even though schedule times are saved.
- Schedule timezone names are stored, but actual timezone-aware scheduler execution is a later phase.
- The UI validates file type and size; MIME types can be spoofed. Do not treat client-side validation as a malware scanner. For a stricter setup, allow only PNG/JPEG/WebP and remove SVG uploads.
- Icons are in a private Storage bucket and shown through short-lived signed URLs.
- Completion state, delivery logs, cross-device push subscriptions and a scheduler are not implemented yet.
- Free-plan limits can change. Check provider pricing and quotas before relying on the services.

## Security notes

- RLS policies require `auth.uid() = user_id` for database rows.
- Storage paths begin with the signed-in user's UUID; Storage policies enforce that folder ownership.
- Never commit Supabase `service_role` keys, FCM server credentials, VAPID private keys or other secrets to this repository.
- Database policies and constraints are the security boundary; client-side validation is for usability only.

## Next phase

Add a `reminder_completions` table, a delivery/idempotency log, Cloudflare Worker Cron, and a push service. A scheduled worker must read cloud schedules and completion state before sending a push. Notification actions such as “Done Today” must update cloud completion state securely.


## Phase 2: daily completion tracking

For an existing Phase 1 database, run `supabase/phase2-migration.sql` once in Supabase SQL Editor. It adds daily completion state and a delivery log with a unique key for each reminder occurrence. It does not delete or recreate your existing reminders.

Then upload the updated project files to the same GitHub repository. The dashboard adds a **Done today / Undo done** button. Completion state is stored in Supabase and remains after refresh/sign-in. The delivery log is only preparation: no real push notification is sent in Phase 2. The future server-side worker must write delivery logs using trusted server credentials; never put a service-role or private key in browser code.


## Phase 3: specific dates and date ranges

This update adds three schedule types while preserving existing weekly reminders:

- `weekly`: runs on selected weekdays (existing behavior).
- `once`: runs on one selected date.
- `range`: runs between a start and end date, on the selected weekdays.

### Upgrade an existing Phase 2 deployment

1. In Supabase Dashboard → SQL Editor, create a new query.
2. Run `supabase/phase3-date-schedules.sql`. This is an additive migration; it does not delete reminders or completion records.
3. Update the website files from this ZIP, but keep your already-configured `js/config.js` unchanged. Do not replace your real Supabase URL/key with placeholders from an archive.
4. Test a weekly reminder, a one-time date, a date range, editing each type, and the Done Today / Undo done controls.

The date schedule fields are saved in Supabase, but this phase still does not send push notifications. Actual delivery requires a later server-side scheduler and push subscription flow.


## Phase 4A: browser notification and push subscription setup

This phase registers a service worker, allows a user to grant browser notification permission, supports a local test notification, and saves a Push API subscription to Supabase. **It does not send scheduled reminders yet.** That requires a trusted server-side sender and scheduled job in Phase 4B.

### Upgrade the existing Phase 3 site

1. Back up your current working project files.
2. In Supabase Dashboard → SQL Editor, run `supabase/phase4a-push-subscriptions.sql` once. This creates an additional table and per-user RLS policies.
3. Upload the updated files to the same GitHub repository. Keep your existing working `js/config.js` Supabase URL and anon/publishable key. Add the `VAPID_PUBLIC_KEY` property shown in the archive only after a VAPID public/private key pair is generated; put **only the public key** in browser config. Never put a private VAPID key or service-role key in this repository.
4. Open the deployed HTTPS site, sign in, click **Test on this device**, and verify the test notification appears.
5. Once a VAPID key pair is generated and its public key is configured, click **Enable notifications** again. Confirm that a row appears in `push_subscriptions` for your signed-in user.

### Important

- A local test notification proves browser permission and service-worker display only; it is not a scheduled reminder.
- Without the VAPID public key, the app can request permission and show a local test, but cannot create a new push subscription.
- Push subscriptions contain endpoint and cryptographic subscription keys. RLS restricts table access to the signed-in owner. The future sender must run in a trusted server-side environment and keep the VAPID private key secret.
- Browser/OS notification settings, battery restrictions, and browser support can affect delivery.
