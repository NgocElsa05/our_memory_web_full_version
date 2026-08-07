import { createClient } from '@supabase/supabase-js';

function cloudinaryAvatar(url, size = 160) {
  if (!url || typeof url !== 'string') return url || '';
  if (!url.includes('res.cloudinary.com')) return url;
  const marker = '/image/upload/';
  const idx = url.indexOf(marker);
  if (idx === -1) return url;
  const after = url.slice(idx + marker.length);
  if (/^w_\d+/.test(after) || /^h_\d+/.test(after)) return url;
  const prefix = url.slice(0, idx + marker.length);
  return `${prefix}w_${size},h_${size},c_fill,g_face,q_auto,f_auto/${after}`;
}

function firstName(n) {
  return String(n || '')
    .trim()
    .split(/\s+/)[0];
}

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function personHtml(user) {
  const nick = firstName(user?.nickname);
  const url = user?.avatarUrl || '';
  const letter = esc((nick || '?').charAt(0).toUpperCase());
  const avatarInner = url
    ? `<img src="${esc(url)}" alt="" width="76" height="76" decoding="async" fetchpriority="high" />`
    : letter;
  return `<div class="person"><div class="avatar">${avatarInner}</div><div class="nick">${esc(nick)}</div></div>`;
}

function pageHtml({ origin, days, user1, user2, error }) {
  const body = error
    ? `<div class="msg error">${esc(error)}</div>`
    : `<a class="card" href="${esc(origin)}/" target="_blank" rel="noopener">${personHtml(user1)}<div class="mid"><svg class="heart" viewBox="0 0 24 24" aria-hidden="true"><path fill="#e85a7a" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg><div class="days">${esc(String(days ?? 0))}</div><div class="label">days</div></div>${personHtml(user2)}</a>`;

  const preconnect =
    user1?.avatarUrl || user2?.avatarUrl
      ? `<link rel="preconnect" href="https://res.cloudinary.com" crossorigin />`
      : '';

  return `<!doctype html>
<html lang="en" style="background:#1c1c1e">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"/>
<meta name="theme-color" content="#1c1c1e"/>
<title>Our Memory</title>
${preconnect}
${user1?.avatarUrl ? `<link rel="preload" as="image" href="${esc(user1.avatarUrl)}"/>` : ''}
${user2?.avatarUrl ? `<link rel="preload" as="image" href="${esc(user2.avatarUrl)}"/>` : ''}
<style>
*{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%;background:#1c1c1e;color:#fff;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif}
body{display:flex;align-items:center;justify-content:center;padding:8px 10px}
a.card{display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;max-width:420px;text-decoration:none;color:inherit;padding:6px 4px}
.person{display:flex;flex-direction:column;align-items:center;width:88px;flex-shrink:0}
.avatar{width:76px;height:76px;border-radius:50%;background:#3a3a3c;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:26px;color:#fff;overflow:hidden;border:3px solid #fff;box-shadow:0 2px 12px rgba(0,0,0,.35)}
.avatar img{width:100%;height:100%;object-fit:cover;display:block}
.nick{margin-top:6px;font-size:11px;font-weight:700;color:#fff;max-width:88px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:center}
.mid{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:0;gap:2px}
.heart{width:34px;height:34px;display:block;filter:drop-shadow(0 1px 2px rgba(0,0,0,.35))}
.days{font-size:28px;font-weight:900;line-height:1.05;letter-spacing:-.02em;color:#fff}
.label{font-size:11px;font-weight:700;color:rgba(255,255,255,.85)}
.msg{text-align:center;padding:16px;font-size:13px;font-weight:600;color:rgba(255,255,255,.75);max-width:280px}
.msg.error{color:#ff6b6b}
</style>
</head>
<body>${body}</body>
</html>`;
}

/** GET /api/widget-page?code=INVITE — HTML sẵn (không Loading) cho WebsiteWidget */
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
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('Method not allowed');
    return;
  }

  const code = String(req.query?.code || '')
    .trim()
    .toUpperCase();
  const siteOrigin = process.env.VITE_SITE_URL || 'https://our--memory.vercel.app';

  const send = (status, html, cache = false) => {
    res.statusCode = status;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader(
      'Cache-Control',
      cache
        ? 'public, s-maxage=120, max-age=60, stale-while-revalidate=600'
        : 'no-store'
    );
    res.end(html);
  };

  if (!code) {
    send(400, pageHtml({ origin: siteOrigin, error: 'Add invite code: /w/YOUR_CODE' }));
    return;
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  const key = serviceKey || anonKey;

  if (!supabaseUrl || !key) {
    send(500, pageHtml({ origin: siteOrigin, error: 'Missing Supabase config' }));
    return;
  }

  try {
    const supabase = createClient(supabaseUrl, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase.rpc('get_widget_by_invite', { p_code: code });
    if (error || !data?.ok) {
      send(
        404,
        pageHtml({
          origin: siteOrigin,
          error: error?.message || data?.error || 'not_found',
        })
      );
      return;
    }

    const user1 = {
      nickname: firstName(data.user1?.nickname || 'User 1'),
      avatarUrl: cloudinaryAvatar(data.user1?.avatarUrl || '', 160),
    };
    const user2 = {
      nickname: firstName(data.user2?.nickname || 'User 2'),
      avatarUrl: cloudinaryAvatar(data.user2?.avatarUrl || '', 160),
    };

    send(
      200,
      pageHtml({
        origin: siteOrigin,
        days: data.days ?? 0,
        user1,
        user2,
      }),
      true
    );
  } catch (e) {
    send(500, pageHtml({ origin: siteOrigin, error: String(e?.message || e) }));
  }
}
