self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {
    title: "Reminder Desk",
    body: "You have a reminder.",
    url: "./",
    icon: null,
    badge: null,
  };

  try {
    if (event.data) {
      data = { ...data, ...event.data.json() };
    }
  } catch (_) {
    if (event.data) {
      data.body = event.data.text();
    }
  }

  const defaultIcon = new URL(
    "assets/default-icon.png",
    self.registration.scope
  ).href;

  const defaultBadge = new URL(
    "assets/notification-badge.png",
    self.registration.scope
  ).href;

  event.waitUntil(
    self.registration.showNotification(
      data.title || "Reminder Desk",
      {
        body: data.body || "You have a reminder.",
        icon: data.icon || defaultIcon,
        badge: data.badge || defaultBadge,
        data: {
          url: data.url || "./",
          reminderId: data.reminderId || null,
        },
      }
    )
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const target = new URL(
    event.notification.data?.url || "./",
    self.registration.scope
  ).href;

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const client of windows) {
        if (client.url === target && "focus" in client) {
          return client.focus();
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(target);
      }
    })()
  );
});








// self.addEventListener("install", event => { self.skipWaiting(); });
// self.addEventListener("activate", event => { event.waitUntil(self.clients.claim()); });
// self.addEventListener("push", event => {
//   let data = { title: "Reminder Desk", body: "You have a reminder.", url: "./" };
//   try { if (event.data) data = { ...data, ...event.data.json() }; }
//   catch (_) { if (event.data) data.body = event.data.text(); }
//   event.waitUntil(self.registration.showNotification(data.title || "Reminder Desk", {
//     body: data.body || "You have a reminder.",
//     icon: "assets/default-icon.png",
//     badge: "assets/default-icon.png",
//     data: { url: data.url || "./" }
//   }));
// });
// self.addEventListener("notificationclick", event => {
//   event.notification.close();
//   const target = new URL(event.notification.data?.url || "./", self.location.href).href;
//   event.waitUntil((async () => {
//     const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
//     for (const client of windows) { if (client.url === target && "focus" in client) return client.focus(); }
//     if (self.clients.openWindow) return self.clients.openWindow(target);
//   })());
// });
