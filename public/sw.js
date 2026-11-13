// Offline: pages network first (cached copy, else the offline page); built assets cached on first use.
const CACHE = "app-shell-v3";
self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(["/", "/index.html", "/offline.html"])));
});
self.addEventListener("activate", (e) =>
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))),
);
// Notifications sent by the app (lib/notify): shown even when the app is closed; a tap opens the right page.
self.addEventListener("push", (e) => {
  let d = {};
  try {
    d = e.data ? e.data.json() : {};
  } catch {}
  e.waitUntil(
    self.registration.showNotification(d.title || "Notification", { body: d.body || "", icon: "/icon-192.png", badge: "/icon-192.png", tag: d.tag || undefined, data: { url: d.url || "/", read: d.read || "" } }),
  );
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  // Seen on the phone = seen in the app and no delayed email.
  if (e.notification.data && e.notification.data.read) fetch(e.notification.data.read, { mode: "no-cors", keepalive: true }).catch(() => {});
  const url = new URL((e.notification.data && e.notification.data.url) || "/", self.location.origin).href;
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ("focus" in c) {
          c.navigate(url);
          return c.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== self.location.origin) return;
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request).catch(async () => (await caches.match("/index.html")) || (await caches.match("/offline.html"))),
    );
    return;
  }
  // Hashed build files never change: cache first.
  if (url.pathname.startsWith("/assets/") || /\.(png|svg|webp|woff2?)$/.test(url.pathname)) {
    e.respondWith(
      caches.match(e.request).then(
        (hit) =>
          hit ||
          fetch(e.request).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(e.request, copy));
            }
            return res;
          }),
      ),
    );
  }
});
