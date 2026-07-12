// =========================================================
// LUSS — Aktivasi push notification di sisi browser
// =========================================================

const VAPID_PUBLIC_KEY = 'BPyMnYueybSDRAvb1wKeK_GKmr990lrit4UlGn68YTljoJw3Vwo23dpj04_ZGipicp6JWSzGwaoGb4Q_765RbyE';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

/** Cek apakah device ini sudah aktif menerima notifikasi. */
async function isPushEnabled() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return false;
  const subscription = await registration.pushManager.getSubscription();
  return !!subscription;
}

/** Minta izin & daftarkan device ini untuk menerima notifikasi. */
async function enablePushNotifications(userId) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Browser ini tidak mendukung push notification.');
  }

  const registration = await navigator.serviceWorker.register('sw.js');
  await navigator.serviceWorker.ready;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Izin notifikasi ditolak. Aktifkan lewat pengaturan browser kalau berubah pikiran.');
  }

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });
  }

  const subJson = subscription.toJSON();

  const { error } = await supabaseClient.from('push_subscriptions').upsert({
    user_id: userId,
    endpoint: subJson.endpoint,
    p256dh: subJson.keys.p256dh,
    auth_key: subJson.keys.auth,
    device_info: navigator.userAgent.slice(0, 200)
  }, { onConflict: 'user_id,endpoint' });

  if (error) throw error;
  return true;
}
