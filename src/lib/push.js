import { supabase } from '../supabase';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

export function isPushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export async function registerPushServiceWorker() {
  if (!isPushSupported()) return null;
  return navigator.serviceWorker.register('/sw.js');
}

export async function enablePushNotifications({ memberId, spaceId, forceResubscribe = true }) {
  if (!isPushSupported()) throw new Error('Thiết bị / trình duyệt này không hỗ trợ Web Push.');
  if (!memberId || !spaceId) throw new Error('Thiếu member / space.');

  const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!publicKey) throw new Error('Thiếu VITE_VAPID_PUBLIC_KEY trong env.');

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error(
      'Chưa cho phép thông báo cho Our Memory / Chrome. Vào Cài đặt điện thoại → Ứng dụng → Chrome (hoặc Our Memory) → Thông báo → Cho phép, rồi bấm lại.'
    );
  }

  const reg = await registerPushServiceWorker();
  await navigator.serviceWorker.ready;

  let sub = await reg.pushManager.getSubscription();
  // Endpoint cũ (đổi Chrome / xóa data) hay 410 — đăng ký lại cho chắc
  if (forceResubscribe && sub) {
    try {
      await sub.unsubscribe();
    } catch {
      /* ignore */
    }
    sub = null;
  }
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  const json = sub.toJSON();
  const endpoint = json.endpoint;
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;
  if (!endpoint || !p256dh || !auth) throw new Error('Không lấy được khóa push.');

  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      space_id: spaceId,
      member_id: memberId,
      endpoint,
      p256dh,
      auth,
      user_agent: navigator.userAgent?.slice(0, 240) || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'endpoint' }
  );
  if (error) throw error;

  // Xóa endpoint cũ của cùng member (tránh máy này còn subscription chết)
  await supabase
    .from('push_subscriptions')
    .delete()
    .eq('member_id', memberId)
    .neq('endpoint', endpoint);

  return true;
}

/** Gửi push tới partner qua API Vercel (cần deploy; local thường không có /api). */
export async function notifyPartner({ targetMemberId, title, body, url, tag }) {
  if (!targetMemberId) return { sent: 0, skipped: true };

  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { sent: 0, skipped: true };

  try {
    const res = await fetch('/api/notify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ targetMemberId, title, body, url, tag }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.warn('[push] notify failed', err);
      return { sent: 0, error: err.error || res.statusText };
    }
    return res.json();
  } catch (e) {
    console.warn('[push] notify error', e);
    return { sent: 0, error: e.message };
  }
}
