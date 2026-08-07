import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

const W = 480;
const H = 220;
const AV = 96;

function cloudinaryAvatar(url, size = 192) {
  if (!url || typeof url !== 'string') return url || '';
  if (!url.includes('res.cloudinary.com')) return url;
  const marker = '/image/upload/';
  const idx = url.indexOf(marker);
  if (idx === -1) return url;
  const after = url.slice(idx + marker.length);
  if (/^w_\d+/.test(after) || /^h_\d+/.test(after)) return url;
  const prefix = url.slice(0, idx + marker.length);
  return `${prefix}w_${size},h_${size},c_fill,q_auto,f_auto/${after}`;
}

function firstName(n) {
  return String(n || '')
    .trim()
    .split(/\s+/)[0];
}

function escXml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function loadAvatarDataUri(url) {
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const png = await sharp(buf)
      .resize(AV, AV, { fit: 'cover' })
      .png()
      .toBuffer();
    return `data:image/png;base64,${png.toString('base64')}`;
  } catch {
    return null;
  }
}

function avatarBlock(cx, cy, dataUri, letter) {
  const clipId = `c${cx}`;
  if (dataUri) {
    return `
      <defs>
        <clipPath id="${clipId}"><circle cx="${cx}" cy="${cy}" r="${AV / 2}"/></clipPath>
      </defs>
      <circle cx="${cx}" cy="${cy}" r="${AV / 2 + 2}" fill="rgba(255,255,255,0.9)"/>
      <image href="${dataUri}" x="${cx - AV / 2}" y="${cy - AV / 2}" width="${AV}" height="${AV}" clip-path="url(#${clipId})" />
    `;
  }
  return `
    <circle cx="${cx}" cy="${cy}" r="${AV / 2}" fill="#e4e0ef"/>
    <text x="${cx}" y="${cy + 10}" text-anchor="middle" font-size="32" font-weight="800" fill="#7ca1d9" font-family="system-ui,sans-serif">${escXml(letter)}</text>
  `;
}

/** GET /api/widget-png?code=INVITE — PNG nền trong suốt (alpha thật) cho KWGT / image widget */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.end();
    return;
  }

  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.end('Method not allowed');
    return;
  }

  const code = String(req.query?.code || '')
    .trim()
    .toUpperCase();
  if (!code) {
    res.statusCode = 400;
    res.end('Missing ?code=');
    return;
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  const key = serviceKey || anonKey;

  if (!supabaseUrl || !key) {
    res.statusCode = 500;
    res.end('Missing Supabase config');
    return;
  }

  const supabase = createClient(supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.rpc('get_widget_by_invite', { p_code: code });
  if (error || !data?.ok) {
    res.statusCode = 404;
    res.end(error?.message || data?.error || 'not_found');
    return;
  }

  const u1 = {
    nickname: firstName(data.user1?.nickname || 'User 1'),
    avatarUrl: cloudinaryAvatar(data.user1?.avatarUrl || '', 192),
  };
  const u2 = {
    nickname: firstName(data.user2?.nickname || 'User 2'),
    avatarUrl: cloudinaryAvatar(data.user2?.avatarUrl || '', 192),
  };
  const days = data.days ?? 0;

  const [a1, a2] = await Promise.all([
    loadAvatarDataUri(u1.avatarUrl),
    loadAvatarDataUri(u2.avatarUrl),
  ]);

  const leftX = 70;
  const rightX = W - 70;
  const midX = W / 2;
  const avatarY = 88;
  const nameY = 158;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  ${avatarBlock(leftX, avatarY, a1, (u1.nickname || '?').charAt(0).toUpperCase())}
  ${avatarBlock(rightX, avatarY, a2, (u2.nickname || '?').charAt(0).toUpperCase())}

  <path transform="translate(${midX - 18}, 42) scale(1.5)" fill="#e85a7a"
    d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>

  <text x="${midX}" y="118" text-anchor="middle" font-size="40" font-weight="900" fill="#1a1a1a" font-family="system-ui,sans-serif">${escXml(String(days))}</text>
  <text x="${midX}" y="140" text-anchor="middle" font-size="14" font-weight="700" fill="#6b6570" font-family="system-ui,sans-serif">days</text>

  <text x="${leftX}" y="${nameY}" text-anchor="middle" font-size="14" font-weight="700" fill="#6b6570" font-family="system-ui,sans-serif">${escXml(u1.nickname)}</text>
  <text x="${rightX}" y="${nameY}" text-anchor="middle" font-size="14" font-weight="700" fill="#6b6570" font-family="system-ui,sans-serif">${escXml(u2.nickname)}</text>
</svg>`;

  try {
    const png = await sharp(Buffer.from(svg)).png().toBuffer();
    res.statusCode = 200;
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.end(png);
  } catch (e) {
    res.statusCode = 500;
    res.end(String(e?.message || e));
  }
}
