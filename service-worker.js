self.addEventListener("install", event => { self.skipWaiting(); });
self.addEventListener("activate", event => { event.waitUntil(self.clients.claim()); });
self.addEventListener("push", event => {
  let data = { title: "Reminder Desk", body: "You have a reminder.", url: "./" };
  try { if (event.data) data = { ...data, ...event.data.json() }; }
  catch (_) { if (event.data) data.body = event.data.text(); }
  event.waitUntil(self.registration.showNotification(data.title || "Reminder Desk", {
    body: data.body || "You have a reminder.",
    icon: "assets/default-icon.svg",
    badge: "assets/default-icon.svg",
    data: { url: data.url || "./" }
  }));
});
self.addEventListener("notificationclick", event => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "./", self.location.href).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) { if (client.url === target && "focus" in client) return client.focus(); }
    if (self.clients.openWindow) return self.clients.openWindow(target);
  })());
});
