(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const cfg = window.APP_CONFIG || {};
  let client = null;
  let registration = null;
  const status = message => { const el = $("pushStatus"); if (el) el.textContent = message; };
  const setButton = (busy, label) => { const b = $("enablePushBtn"); if (b) { b.disabled = busy; b.textContent = label; } };
  function decodeVapidKey(base64String) {
    const padding = "=".repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const raw = atob(base64);
    return Uint8Array.from([...raw].map(char => char.charCodeAt(0)));
  }
  async function getClient() {
    if (!window.supabase || !cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) throw new Error("Supabase configuration is missing.");
    if (!client) client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
    const { data: { session }, error } = await client.auth.getSession();
    if (error) throw error;
    if (!session) throw new Error("Please sign in first.");
    return client;
  }
  async function setupWorker() {
    if (!window.isSecureContext) throw new Error("Notifications require HTTPS. Open the deployed GitHub Pages site.");
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      throw new Error("This browser does not support web push notifications.");
    }
    registration = await navigator.serviceWorker.register(new URL("service-worker.js", document.baseURI), { scope: new URL("./", document.baseURI).pathname });
    await navigator.serviceWorker.ready;
    return registration;
  }
  async function refreshStatus() {
    if (!$("pushStatus")) return;
    if (!window.isSecureContext) { status("Notifications require the HTTPS website."); return; }
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) { status("This browser does not support web push notifications."); return; }
    try {
      await setupWorker();
      const permission = Notification.permission;
      const sub = await registration.pushManager.getSubscription();
      if (sub) status("Browser permission: " + permission + ". This device has a push subscription saved in the browser.");
      else if (permission === "denied") status("Notifications are blocked in browser settings. Allow them there before continuing.");
      else status("Browser supported. Enable notifications to grant permission and prepare this device.");
    } catch (err) { status(err.message || "Could not initialize notifications."); }
  }
  async function enable() {
    setButton(true, "Setting up…");
    try {
      await getClient();
      await setupWorker();
      let permission = Notification.permission;
      if (permission === "default") permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error(permission === "denied" ? "Permission denied. Enable notifications in your browser site settings." : "Notification permission was not granted.");
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        const key = String(cfg.VAPID_PUBLIC_KEY || "").trim();
        if (!key || key === "PASTE_PUBLIC_VAPID_KEY_HERE") {
          status("Permission granted. Next, generate a VAPID key pair and add only its PUBLIC key to js/config.js; then enable again to save the push subscription.");
          return;
        }
        subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodeVapidKey(key) });
      }
      const json = subscription.toJSON();
      const row = {
        user_id: (await client.auth.getUser()).data.user.id,
        endpoint: json.endpoint,
        p256dh: json.keys?.p256dh || null,
        auth: json.keys?.auth || null,
        subscription_json: json,
        user_agent: navigator.userAgent.slice(0, 500),
        updated_at: new Date().toISOString()
      };
      const { error } = await client.from("push_subscriptions").upsert(row, { onConflict: "user_id,endpoint" });
      if (error) throw error;
      status("Push subscription saved to Supabase for this account and device. Scheduled push delivery is not active yet.");
    } catch (err) { status(err.message || "Could not enable notifications."); }
    finally { setButton(false, "Enable notifications"); }
  }
  async function testLocal() {
    try {
      await setupWorker();
      let permission = Notification.permission;
      if (permission === "default") permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Allow notifications in browser settings first.");
      await registration.showNotification("Reminder Desk test", { body: "Local notification test succeeded on this device.", icon: new URL("assets/default-icon.svg", document.baseURI).href, data: { url: "./" } });
      status("Test notification displayed. This is a local test, not a scheduled reminder delivery.");
    } catch (err) { status(err.message || "Test notification failed."); }
  }
  document.addEventListener("DOMContentLoaded", () => {
    $("enablePushBtn")?.addEventListener("click", enable);
    $("testLocalNotificationBtn")?.addEventListener("click", testLocal);
    refreshStatus();
  });
})();
