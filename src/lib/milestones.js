/** Mốc kỷ niệm: số ngày bên nhau + sinh nhật */

export function todayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Parse birthday free-text → { month, day } (DD/MM ưu tiên) */
export function parseBirthday(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const s = raw.trim();
  if (!s) return null;

  // ISO: 2000-03-22 hoặc 2000/03/22
  let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (m) {
    const month = Number(m[2]);
    const day = Number(m[3]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) return { month, day };
  }

  // DD/MM hoặc DD-MM hoặc DD.MM (có thể kèm năm phía sau)
  m = s.match(/^(\d{1,2})[/\-.](\d{1,2})(?:[/\-.](\d{2,4}))?/);
  if (m) {
    const day = Number(m[1]);
    const month = Number(m[2]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) return { month, day };
  }

  return null;
}

export function isBirthdayToday(raw, now = new Date()) {
  const p = parseBirthday(raw);
  if (!p) return false;
  return p.month === now.getMonth() + 1 && p.day === now.getDate();
}

/** Mốc ngày: mỗi 30 ngày + 100, 200 + các năm (365, 730…) */
export function isDayMilestone(days) {
  if (!days || days < 30) return false;
  if (days % 30 === 0) return true;
  if (days === 100 || days === 200) return true;
  if (days % 365 === 0) return true;
  return false;
}

export function dayMilestoneTitle(days) {
  if (days % 365 === 0) {
    const years = days / 365;
    return years === 1
      ? 'Một năm yêu nhau rồi!'
      : `${years} năm bên nhau rồi!`;
  }
  if (days === 100) return '100 ngày yêu — mốc trăm ngày!';
  if (days === 200) return '200 ngày yêu — chúc mừng cặp đôi!';
  return `Ngày thứ ${days} bên nhau!`;
}

export function dayMilestoneBody(days) {
  if (days % 365 === 0) {
    return 'Cả thế giới riêng của hai mình lại thêm một vòng mặt trời. Yêu thương nhiều nhé.';
  }
  return `Hôm nay đánh dấu ${days} ngày hai bạn thuộc về nhau. Mở app để ôm lấy khoảnh khắc này nhé.`;
}

/**
 * @returns {Array<{ id: string, type: 'days'|'birthday', title: string, body: string, emoji: string }>}
 */
export function getTodaysCelebrations({
  days,
  profiles = [],
  now = new Date(),
} = {}) {
  const out = [];

  if (isDayMilestone(days)) {
    out.push({
      id: `days_${days}`,
      type: 'days',
      title: dayMilestoneTitle(days),
      body: dayMilestoneBody(days),
      emoji: '💕',
      days,
    });
  }

  for (const p of profiles) {
    if (!isBirthdayToday(p.birthday, now)) continue;
    const name = (p.nickname || '').trim() || 'Người ấy';
    out.push({
      id: `bday_${p.id}_${todayKey(now)}`,
      type: 'birthday',
      title: `Sinh nhật ${name}!`,
      body: `Hôm nay là ngày đặc biệt của ${name}. Gửi một lời chúc ấm áp trong Space nhé.`,
      emoji: '🎂',
      memberId: p.id,
      nickname: name,
    });
  }

  return out;
}

export function celebrationStorageKey(spaceId, celebrationId, date = todayKey()) {
  return `om_celeb_${spaceId}_${celebrationId}_${date}`;
}

export function hasShownCelebration(spaceId, celebrationId, date = todayKey()) {
  if (typeof localStorage === 'undefined') return false;
  return localStorage.getItem(celebrationStorageKey(spaceId, celebrationId, date)) === '1';
}

export function markCelebrationShown(spaceId, celebrationId, date = todayKey()) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(celebrationStorageKey(spaceId, celebrationId, date), '1');
}
