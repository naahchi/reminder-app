import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Content-Type": "application/json" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });
function partsInZone(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone || "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date);
  const p = Object.fromEntries(parts.map(x => [x.type, x.value]));
  const dow: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}`, day: dow[p.weekday] ?? -1 };
}
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const expected = Deno.env.get("CRON_SECRET");
  if (!expected || req.headers.get("x-cron-secret") !== expected) return json({ error: "Unauthorized" }, 401);
  const url = Deno.env.get("SUPABASE_URL"), serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY"), vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY"), subject = Deno.env.get("VAPID_SUBJECT") || "mailto:admin@example.com";
  if (!url || !serviceKey || !vapidPublic || !vapidPrivate) return json({ error: "Missing required server secrets" }, 500);
  const db = createClient(url, serviceKey, { auth: { persistSession: false } });
  webpush.setVapidDetails(subject, vapidPublic, vapidPrivate);
  const now = new Date();
  const { data: reminders, error: readError } = await db.from("reminders").select("*").eq("enabled", true);
  if (readError) return json({ error: readError.message }, 500);
  let checked = 0, sent = 0, skipped = 0, failed = 0;
  for (const r of reminders || []) {
    let local;
    try { local = partsInZone(now, r.timezone || "Asia/Kolkata"); } catch { failed++; continue; }
    const type = r.schedule_type || "weekly";
    let activeDate = false;
    if (type === "once") activeDate = r.specific_date === local.date;
    else if (type === "range") activeDate = !!r.start_date && !!r.end_date && local.date >= r.start_date && local.date <= r.end_date && Array.isArray(r.days) && r.days.includes(local.day);
    else activeDate = Array.isArray(r.days) && r.days.includes(local.day);
    if (!activeDate || !Array.isArray(r.times) || !r.times.includes(local.time)) continue;
    checked++;
    const scheduledFor = new Date(now); scheduledFor.setUTCSeconds(0, 0);
    const { error: logError } = await db.from("reminder_delivery_log").insert({ reminder_id: r.id, user_id: r.user_id, scheduled_for: scheduledFor.toISOString(), status: "pending", attempt_count: 0 });
    if (logError) { if (logError.code === "23505") skipped++; else failed++; continue; }
    const { data: done } = await db.from("reminder_completions").select("id").eq("reminder_id", r.id).eq("user_id", r.user_id).eq("completion_date", local.date).maybeSingle();
    if (done) {
      await db.from("reminder_delivery_log").update({ status: "skipped", last_error: "Already marked done for this local date", updated_at: new Date().toISOString() }).eq("reminder_id", r.id).eq("scheduled_for", scheduledFor.toISOString());
      skipped++; continue;
    }
    const { data: subs, error: subError } = await db.from("push_subscriptions").select("id,subscription_json").eq("user_id", r.user_id);
    if (subError || !subs?.length) {
      await db.from("reminder_delivery_log").update({ status: "failed", attempt_count: 1, last_error: subError?.message || "No push subscription for this user", updated_at: new Date().toISOString() }).eq("reminder_id", r.id).eq("scheduled_for", scheduledFor.toISOString());
      failed++; continue;
    }
    const payload = JSON.stringify({ title: r.name || "Reminder Desk", body: r.message || "It's time for your reminder.", url: r.url || "./", reminderId: r.id });
    let delivered = 0, errors: string[] = [];
    for (const sub of subs) {
      try { await webpush.sendNotification(sub.subscription_json, payload, { TTL: 300 }); delivered++; }
      catch (e) {
        const msg = String(e).slice(0, 500); errors.push(msg);
        if (e && typeof e === "object" && "statusCode" in e && ((e as {statusCode:number}).statusCode === 404 || (e as {statusCode:number}).statusCode === 410)) await db.from("push_subscriptions").delete().eq("id", sub.id);
      }
    }
    const status = delivered ? "sent" : "failed";
    await db.from("reminder_delivery_log").update({ status, attempt_count: 1, last_error: errors.length ? errors.join(" | ").slice(0, 1000) : null, updated_at: new Date().toISOString() }).eq("reminder_id", r.id).eq("scheduled_for", scheduledFor.toISOString());
    if (delivered) sent++; else failed++;
  }
  return json({ ok: true, runAt: now.toISOString(), checked, sent, skipped, failed });
});
