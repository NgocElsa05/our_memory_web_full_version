export const PENDING_INVITE_KEY = 'pendingInviteCode';

export function savePendingInvite(code) {
  if (!code) {
    sessionStorage.removeItem(PENDING_INVITE_KEY);
    return;
  }
  sessionStorage.setItem(PENDING_INVITE_KEY, String(code).trim());
}

export function readPendingInvite() {
  return sessionStorage.getItem(PENDING_INVITE_KEY) || '';
}

export function clearPendingInvite() {
  sessionStorage.removeItem(PENDING_INVITE_KEY);
}

/** Mã mời ngắn, dễ share (không dùng dấu gạch). */
export function generateInviteCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

export function inviteUrl(inviteCode) {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/invite/${inviteCode}`;
}

export function daysTogether(togetherSince) {
  if (!togetherSince) return null;
  const start = new Date(`${togetherSince}T00:00:00`);
  if (Number.isNaN(start.getTime())) return null;
  const today = new Date();
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diff = Math.floor((todayDay - startDay) / (1000 * 60 * 60 * 24));
  return diff >= 0 ? diff + 1 : null; // tính cả ngày đầu
}

export function formatViDate(isoDate) {
  if (!isoDate) return 'Chưa chọn';
  const d = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString('vi-VN');
}
