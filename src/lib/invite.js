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

const DAYS_TZ = 'Australia/Sydney';

/** Calendar YYYY-MM-DD in Australia/Sydney (avoids UTC day rollover). */
function calendarDateInTz(date = new Date(), timeZone = DAYS_TZ) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const y = Number(parts.find((p) => p.type === 'year')?.value);
  const m = Number(parts.find((p) => p.type === 'month')?.value);
  const d = Number(parts.find((p) => p.type === 'day')?.value);
  if (!y || !m || !d) return null;
  return { y, m, d };
}

/**
 * Số ngày yêu nhau theo lịch Úc (Australia/Sydney).
 * Đếm khoảng cách lịch: 23/4 → 7/8 = 106 (không +1 ngày đầu).
 */
export function daysTogether(togetherSince) {
  if (!togetherSince) return null;
  const raw = String(togetherSince).slice(0, 10);
  const [sy, sm, sd] = raw.split('-').map(Number);
  if (!sy || !sm || !sd) return null;
  const today = calendarDateInTz(new Date(), DAYS_TZ);
  if (!today) return null;
  const startUtc = Date.UTC(sy, sm - 1, sd);
  const todayUtc = Date.UTC(today.y, today.m - 1, today.d);
  const diff = Math.floor((todayUtc - startUtc) / (1000 * 60 * 60 * 24));
  return diff >= 0 ? diff : null;
}

export function formatViDate(isoDate) {
  if (!isoDate) return 'Chưa chọn';
  const d = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString('vi-VN');
}
