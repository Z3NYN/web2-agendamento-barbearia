self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", event => {
  let dados = {};
  try {
    dados = event.data ? event.data.json() : {};
  } catch {
    dados = { mensagem: event.data ? event.data.text() : "" };
  }
  const titulo = dados.titulo || "Studio Soldado do Corte";
  const destinoUrl = typeof dados.destinoUrl === "string" && dados.destinoUrl.startsWith("/") ? dados.destinoUrl : "/inicio";
  event.waitUntil(
    self.registration.showNotification(titulo, {
      body: dados.mensagem || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: dados.tag || "soldado-notif",
      data: { url: destinoUrl },
    })
  );
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const raw = event.notification.data && event.notification.data.url;
  const destino = typeof raw === "string" && raw.startsWith("/") ? raw : "/inicio";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(lista => {
      for (const client of lista) {
        if ("focus" in client) {
          client.focus();
          client.postMessage({ type: "SOLDADO_NAVIGATE", url: destino });
          return;
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(destino);
      }
      return undefined;
    })
  );
});
