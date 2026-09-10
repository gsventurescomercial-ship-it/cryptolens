self.addEventListener('push', (event) => {
  let data = { title: 'CryptoLens', body: 'Você tem um novo alerta.', url: '/alertas' }
  try {
    if (event.data) data = { ...data, ...event.data.json() }
  } catch {
    if (event.data) data.body = event.data.text()
  }

  event.waitUntil(self.registration.showNotification(data.title, {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: data.url || '/alertas' },
  }))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
    const target = event.notification.data?.url || '/alertas'
    const existing = windows.find((client) => 'focus' in client)
    if (existing) {
      existing.navigate(target)
      return existing.focus()
    }
    return clients.openWindow(target)
  }))
})
