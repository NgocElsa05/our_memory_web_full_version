import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

/**
 * Cron hằng ngày: gửi Web Push (lockscreen) khi Space chạm mốc ngày / sinh nhật.
 * Vercel Cron → GET/POST /api/milestones-cron
 *
 * Env cần:
 * - CRON_SECRET (Authorization: Bearer …)
 * - SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 * - VAPID_PUBLIC_KEY / VITE_VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY + VAPID_SUBJECT
 */

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function parseBirthday(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const s = raw
    .trim()
    .replace(/[()[\]{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!s) return null;

  let m = s.match(/(?:^|[^\d])(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[^\d]|$)/);
  if (m) {
    const month = Number(m[2]);
    const day = Number(m[3]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) return { month, day };
  }

  m = s.match(/(?:^|[^\d])(\d{1,2})[-/.](\d{1,2})(?:[-/.](\d{2,4}))?(?:[^\d]|$)/);
  if (m) {
    const day = Number(m[1]);
    const month = Number(m[2]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) return { month, day };
  }

  return null;
}

const DAYS_TZ = 'Australia/Sydney';

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

/** Khoảng cách lịch Úc — không +1 (khớp Home / widget). */
function daysTogether(togetherSince, now = new Date()) {
  if (!togetherSince) return null;
  const raw = String(togetherSince).slice(0, 10);
  const [sy, sm, sd] = raw.split('-').map(Number);
  if (!sy || !sm || !sd) return null;
  const today = calendarDateInTz(now, DAYS_TZ);
  if (!today) return null;
  const startUtc = Date.UTC(sy, sm - 1, sd);
  const todayUtc = Date.UTC(today.y, today.m - 1, today.d);
  const diff = Math.floor((todayUtc - startUtc) / (1000 * 60 * 60 * 24));
  return diff >= 0 ? diff : null;
}

function isDayMilestone(days) {
  if (!days || days < 30) return false;
  if (days % 30 === 0) return true;
  if (days === 100 || days === 200) return true;
  if (days % 365 === 0) return true;
  return false;
}

function dayTitle(days) {
  if (days % 365 === 0) {
    const years = days / 365;
    return years === 1 ? 'Một năm yêu nhau rồi! 💕' : `${years} năm bên nhau rồi! 💕`;
  }
  if (days === 100) return '100 ngày yêu — mốc trăm ngày! 💕';
  if (days === 200) return '200 ngày yêu! 💕';
  return `Ngày thứ ${days} bên nhau! 💕`;
}

function dayBody(days) {
  return `Hôm nay đánh dấu ${days} ngày hai bạn thuộc về nhau. Mở Our Memory nhé.`;
}

function authorized(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.authorization || '';
  if (auth === `Bearer ${secret}`) return true;
  // Test thủ công: /api/milestones-cron?secret=...
  const q = req.query?.secret;
  return q === secret;
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed' });
  }
  if (!authorized(req)) return json(res, 401, { error: 'Unauthorized' });

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const vapidPublic = process.env.VITE_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:our-memory@vercel.app';

  if (!supabaseUrl || !serviceKey || !vapidPublic || !vapidPrivate) {
    return json(res, 500, {
      error: 'Thiếu SUPABASE_SERVICE_ROLE_KEY hoặc VAPID trên server.',
    });
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();

  const { data: spaces, error: spacesErr } = await admin
    .from('spaces')
    .select('id, together_since, name')
    .not('together_since', 'is', null);

  if (spacesErr) return json(res, 400, { error: spacesErr.message });

  let pushed = 0;
  let celebrations = 0;

  for (const space of spaces || []) {
    const notes = [];
    const days = daysTogether(space.together_since, now);
    if (isDayMilestone(days)) {
      notes.push({
        title: dayTitle(days),
        body: dayBody(days),
        tag: `days-${space.id}-${days}`,
      });
    }

    const { data: profiles } = await admin
      .from('profiles')
      .select('id, nickname, birthday')
      .eq('space_id', space.id);

    for (const p of profiles || []) {
      const b = parseBirthday(p.birthday);
      if (!b || b.month !== month || b.day !== day) continue;
      const name = (p.nickname || '').trim() || 'Người ấy';
      notes.push({
        title: `Sinh nhật ${name}! 🎂`,
        body: `Hôm nay là ngày đặc biệt của ${name}. Mở Our Memory để chúc nhau nhé.`,
        tag: `bday-${p.id}-${month}-${day}`,
      });
    }

    if (!notes.length) continue;
    celebrations += notes.length;

    const { data: subs } = await admin
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('space_id', space.id);

    if (!subs?.length) continue;

    for (const note of notes) {
      const payload = JSON.stringify({
        title: note.title,
        body: note.body,
        url: '/',
        tag: note.tag,
      });
      await Promise.all(
        subs.map(async (sub) => {
          try {
            await webpush.sendNotification(
              {
                endpoint: sub.endpoint,
                keys: { p256dh: sub.p256dh, auth: sub.auth },
              },
              payload
            );
            pushed += 1;
          } catch {
            /* ignore stale */
          }
        })
      );
    }
  }

  return json(res, 200, {
    ok: true,
    spaces: (spaces || []).length,
    celebrations,
    pushed,
    date: now.toISOString(),
  });
}
