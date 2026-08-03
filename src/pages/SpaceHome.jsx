import { useState } from 'react';
import { Copy, Check, Heart, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSpace } from '../context/SpaceContext';
import { daysTogether, formatViDate, inviteUrl } from '../lib/invite';
import { getThemeByKey, DEFAULT_THEME_KEY } from '../lib/themes';

/** Trang chủ tạm sau onboarding — chưa gắn Gallery/Mailbox cũ (vẫn dựa user_em/user_anh). */
export default function SpaceHome() {
  const { signOut, user } = useAuth();
  const { space, member, profile, partner } = useSpace();
  const [copied, setCopied] = useState(false);

  const theme = getThemeByKey(space?.theme_key || DEFAULT_THEME_KEY);
  const days = daysTogether(space?.together_since);
  const link = space?.invite_code ? inviteUrl(space.invite_code) : '';

  const copyInvite = async () => {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen om-bg-page text-gray-800">
      <header className="max-w-lg mx-auto px-5 pt-8 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Heart className="text-[var(--om-accent)] fill-[var(--om-accent)]" size={22} />
          <span className="font-black uppercase tracking-tighter text-[var(--om-primary)]">Our Memory</span>
        </div>
        <button
          type="button"
          onClick={() => signOut()}
          className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-gray-400 hover:text-[var(--om-primary)]"
        >
          <LogOut size={14} />
          Đăng xuất
        </button>
      </header>

      <main className="max-w-lg mx-auto px-5 pb-16 space-y-5">
        <section className="rounded-3xl bg-white border border-[color-mix(in_srgb,var(--om-primary-soft)_25%,transparent)] shadow-sm p-6 overflow-hidden relative">
          <div className="flex gap-1 mb-5 -mx-1">
            {theme.colors.map((c) => (
              <span key={c} className="h-2 flex-1 first:rounded-l-full last:rounded-r-full" style={{ background: c }} />
            ))}
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Space của bạn</p>
          <h1 className="text-3xl font-black mt-1 text-gray-800">{space?.name || '…'}</h1>
          <p className="mt-2 text-sm font-semibold text-gray-500">
            Xin chào, {profile?.nickname || 'bạn'} · vai {member?.role === 'user_1' ? 'người tạo' : 'thành viên'}
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-2xl om-field p-4">
              <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Đã yêu</p>
              <p className="text-2xl font-black text-[var(--om-primary)] mt-1">
                {days != null ? `${days}` : '—'}
                <span className="text-sm ml-1 text-gray-400">ngày</span>
              </p>
              <p className="text-xs text-gray-400 mt-1 font-medium">
                từ {formatViDate(space?.together_since)}
              </p>
            </div>
            <div className="rounded-2xl om-field p-4">
              <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Theme</p>
              <p className="text-lg font-black text-gray-800 mt-1">{theme.name}</p>
              <p className="text-xs text-gray-400 mt-1 font-medium">
                Quen: {formatViDate(space?.met_on)}
              </p>
            </div>
          </div>
        </section>

        {!partner && space?.invite_code && (
          <section className="rounded-3xl bg-white border border-[color-mix(in_srgb,var(--om-primary-soft)_25%,transparent)] shadow-sm p-6">
            <h2 className="font-black text-gray-800">Mời người ấy</h2>
            <p className="text-sm text-gray-500 font-medium mt-1 mb-4">
              Gửi link này để người thứ hai tham gia Space.
            </p>
            <div className="rounded-2xl om-field border border-[color-mix(in_srgb,var(--om-primary-soft)_30%,transparent)] px-4 py-3 text-xs font-mono text-gray-600 break-all">
              {link}
            </div>
            <button
              type="button"
              onClick={copyInvite}
              className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--om-primary)] text-[var(--om-on-primary)] py-3 text-xs font-black uppercase tracking-widest"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'Đã copy' : 'Copy link mời'}
            </button>
          </section>
        )}

        {partner && (
          <section className="rounded-3xl bg-white border border-[color-mix(in_srgb,var(--om-primary-soft)_25%,transparent)] shadow-sm p-6">
            <h2 className="font-black text-gray-800">Đã đủ hai bạn</h2>
            <p className="text-sm text-gray-500 font-medium mt-1">
              Partner đã vào Space. Các trang Gallery / Hòm thư / Khám phá cũ sẽ được nối lại sau khi migrate khỏi
              user_em / user_anh.
            </p>
          </section>
        )}

        <p className="text-center text-[11px] text-gray-400 font-medium">
          Đăng nhập: {user?.email || 'Google'} · Đây là bản thử Auth + onboarding
        </p>
      </main>
    </div>
  );
}
