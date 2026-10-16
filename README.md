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
