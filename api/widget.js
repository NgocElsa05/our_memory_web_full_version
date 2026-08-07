import { createClient } from '@supabase/supabase-js';

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.end(JSON.stringify(body));
}

function cloudinaryAvatar(url, size = 256) {
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

/** GET /api/widget?code=INVITE — snapshot cho Scriptable widget */
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.end();
    return;
  }

  if (req.method !== 'GET') {
    return json(res, 405, { ok: false, error: 'Method not allowed' });
  }

  const code = String(req.query?.code || '')
    .trim()
    .toUpperCase();
  if (!code) {
    return json(res, 400, { ok: false, error: 'Thiếu ?code=MÃ_MỜI' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  const key = serviceKey || anonKey;

  if (!supabaseUrl || !key) {
    return json(res, 500, { ok: false, error: 'Thiếu cấu hình Supabase trên Vercel' });
  }

  const supabase = createClient(supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.rpc('get_widget_by_invite', { p_code: code });

  if (error) {
    return json(res, 400, { ok: false, error: error.message });
  }

  if (!data?.ok) {
    return json(res, 404, data || { ok: false, error: 'not_found' });
  }

  return json(res, 200, {
    ok: true,
    spaceName: data.spaceName || 'Our Memory',
    togetherSince: data.togetherSince || null,
    days: data.days ?? 0,
    user1: {
      nickname: data.user1?.nickname || 'User 1',
      avatarUrl: cloudinaryAvatar(data.user1?.avatarUrl || '', 256),
    },
    user2: {
      nickname: data.user2?.nickname || 'User 2',
      avatarUrl: cloudinaryAvatar(data.user2?.avatarUrl || '', 256),
    },
  });
}
