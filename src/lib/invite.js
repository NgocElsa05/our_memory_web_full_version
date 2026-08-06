export const PENDING_INVITE_KEY = 'pendingInviteCode';

function normalizeInviteCode(code) {
  return String(code || '')
    .trim()
    .toUpperCase();
}

/** Lưu cả localStorage + sessionStorage — OAuth / đổi tab vẫn giữ lời mời. */
export function savePendingInvite(code) {
  const normalized = normalizeInviteCode(code);
  if (!normalized) {
    clearPendingInvite();
    return;
  }
  try {
    localStorage.setItem(PENDING_INVITE_KEY, normalized);
  } catch {
    /* private mode */
  }
  try {
    sessionStorage.setItem(PENDING_INVITE_KEY, normalized);
  } catch {
    /* ignore */
  }
}

export function readPendingInvite() {
  try {
    const fromLocal = localStorage.getItem(PENDING_INVITE_KEY);
    if (fromLocal) return normalizeInviteCode(fromLocal);
  } catch {
    /* ignore */
  }
  try {
    return normalizeInviteCode(sessionStorage.getItem(PENDING_INVITE_KEY) || '');
  } catch {
    return '';
  }
}

export function clearPendingInvite() {
  try {
    localStorage.removeItem(PENDING_INVITE_KEY);
  } catch {
    /* ignore */
  }
  try {
    sessionStorage.removeItem(PENDING_INVITE_KEY);
  } catch {
    /* ignore */
  }
}

/** Path quay lại lời mời sau auth — rỗng nếu không có pending. */
export function pendingInvitePath() {
  const code = readPendingInvite();
  return code ? `/invite/${encodeURIComponent(code)}` : '';
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
