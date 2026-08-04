import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Settings as SettingsIcon,
  Palette,
  CalendarHeart,
  Type,
  LogOut,
  Check,
  Copy,
  Bell,
  DoorOpen,
  Trash2,
} from 'lucide-react';
import { supabase } from '../supabase';
import { useSession } from '../context/SessionContext';
import { useAuth } from '../context/AuthContext';
import { THEME_PALETTES, getThemeByKey, DEFAULT_THEME_KEY, getThemeCssVars } from '../lib/themes';
import { inviteUrl } from '../lib/invite';
import { enablePushNotifications, isPushSupported } from '../lib/push';
import { LOADING_COPY } from '../lib/loadingCopy';

export default function Settings() {
  const { space, spaceId, refresh, role, sessionUserId } = useSession();
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState(space?.name || '');
  const [togetherSince, setTogetherSince] = useState(space?.together_since || '');
  const [metOn, setMetOn] = useState(space?.met_on || '');
  const [skipMet, setSkipMet] = useState(!space?.met_on);
  const [themeKey, setThemeKey] = useState(space?.theme_key || null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushMsg, setPushMsg] = useState('');
  const [dangerBusy, setDangerBusy] = useState(false);
  const [confirmName, setConfirmName] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [dangerNote, setDangerNote] = useState('');

  const namesMatch = (a, b) =>
    (a || '').normalize('NFC').trim().replace(/\s+/g, ' ') ===
    (b || '').normalize('NFC').trim().replace(/\s+/g, ' ');

  const flashError = (msg) => {
    setError(msg);
    setDangerNote(msg);
    try {
      window.alert(msg);
    } catch {
      /* ignore */
    }
  };

  const formatSbError = (e, fallback) => {
    if (!e) return fallback;
    const parts = [e.message, e.details, e.hint, e.code].filter(Boolean);
    return parts.length ? parts.join(' — ') : fallback;
  };

  useEffect(() => {
    setName(space?.name || '');
    setTogetherSince(space?.together_since || '');
    setMetOn(space?.met_on || '');
    setSkipMet(!space?.met_on);
    setThemeKey(space?.theme_key || null);
  }, [space?.id, space?.name, space?.together_since, space?.met_on, space?.theme_key]);

  // Live-preview palette while browsing before Save
  useEffect(() => {
    const vars = getThemeCssVars(themeKey || space?.theme_key || DEFAULT_THEME_KEY);
    Object.entries(vars).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value);
    });
  }, [themeKey, space?.theme_key]);

  const currentTheme = getThemeByKey(themeKey || DEFAULT_THEME_KEY);

  const save = async () => {
    if (!spaceId) return;
    setError('');
    setMessage('');

    const trimmed = name.trim();
    if (!trimmed) {
      setError('Tên Space không được để trống.');
      return;
    }
    if (!togetherSince) {
      setError('Cần ngày bắt đầu yêu để đếm số ngày bên nhau.');
      return;
    }
    const met = skipMet ? null : metOn || null;
    if (met && togetherSince < met) {
      setError('Ngày bắt đầu yêu nên từ ngày biết nhau trở đi.');
      return;
    }

    setSaving(true);
    try {
      const { error: updErr } = await supabase
        .from('spaces')
        .update({
          name: trimmed,
          together_since: togetherSince,
          met_on: met,
          theme_key: themeKey,
        })
        .eq('id', spaceId);
      if (updErr) throw updErr;
      await refresh();
      setMessage(LOADING_COPY.IN_SAVE_OK);
    } catch (e) {
      setError(e.message || 'Không lưu được, thử lại nhé.');
    } finally {
      setSaving(false);
    }
  };

  const copyInvite = async () => {
    if (!space?.invite_code) return;
    await navigator.clipboard.writeText(inviteUrl(space.invite_code));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const enablePush = async () => {
    setPushBusy(true);
    setPushMsg('');
    try {
      await enablePushNotifications({ memberId: sessionUserId, spaceId });
      setPushMsg(LOADING_COPY.IN_PUSH_OK);
    } catch (e) {
      setPushMsg(e.message || LOADING_COPY.IN_PUSH_FAIL);
    } finally {
      setPushBusy(false);
    }
  };

  const clearSpaceLocalFlags = (id) => {
    if (!id) return;
    sessionStorage.removeItem(`theme_done_${id}`);
    sessionStorage.removeItem(`preview_done_${id}`);
  };

  const goCreateNewSpace = async () => {
    clearSpaceLocalFlags(spaceId);
    await refresh();
    navigate('/onboarding/space', { replace: true });
  };

  /** Sau DELETE + CASCADE, .select() RETURNING hay ra [] dù đã xóa — verify bằng cách đọc lại. */
  const assertSpaceGone = async (id) => {
    const { data, error } = await supabase
      .from('spaces')
      .select('id')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (data) {
      throw new Error(
        'Space vẫn còn sau khi xóa. Kiểm tra policy DELETE (sql_space_leave_delete.sql) và role user_1 trên bảng members.'
      );
    }
  };

  const assertMembershipGone = async (memberId) => {
    const { data, error } = await supabase
      .from('members')
      .select('id')
      .eq('id', memberId)
      .maybeSingle();
    if (error) throw error;
    if (data) {
      throw new Error(
        'Vẫn còn membership. Chạy lại scripts/sql_space_leave_delete.sql (members_delete).'
      );
    }
  };

  /** Rời Space — RPC leave_my_space (tránh DELETE 500 / RLS recursion). */
  const leaveSpace = async () => {
    if (!sessionUserId || !spaceId) {
      flashError('Thiếu thông tin Space / thành viên.');
      return;
    }

    setDangerBusy(true);
    setError('');
    setMessage('');
    setDangerNote(LOADING_COPY.IN_LEAVE);
    try {
      const { error: rpcErr } = await supabase.rpc('leave_my_space', { p_space_id: spaceId });
      if (rpcErr) throw rpcErr;
      await assertSpaceGone(spaceId).catch(async () => {
        // Có thể chỉ rời membership, space còn nếu còn partner
        await assertMembershipGone(sessionUserId);
      });
      setShowLeaveConfirm(false);
      setDangerNote('Đã rời Space.');
      await goCreateNewSpace();
    } catch (e) {
      console.error('[leaveSpace]', e);
      flashError(formatSbError(e, 'Không rời được Space.'));
    } finally {
      setDangerBusy(false);
    }
  };

  /** Xóa toàn bộ Space — RPC delete_my_space. */
  const deleteSpace = async () => {
    if (!spaceId) {
      flashError('Thiếu spaceId.');
      return;
    }
    if (role !== 'user_1') {
      flashError('Chỉ người tạo Space (User 1) mới được xóa.');
      return;
    }
    const expected = (space?.name || '').trim();
    if (!expected || !namesMatch(confirmName, expected)) {
      flashError(`Gõ đúng tên Space: «${expected}»`);
      return;
    }

    setDangerBusy(true);
    setError('');
    setMessage('');
    setDangerNote(LOADING_COPY.IN_DELETE);
    try {
      const { error: rpcErr } = await supabase.rpc('delete_my_space', { p_space_id: spaceId });
      if (rpcErr) throw rpcErr;
      await assertSpaceGone(spaceId);
      setShowDeleteConfirm(false);
      setConfirmName('');
      setDangerNote('Đã xóa Space.');
      await goCreateNewSpace();
    } catch (e) {
      console.error('[deleteSpace]', e);
      flashError(formatSbError(e, 'Không xóa được Space.'));
    } finally {
      setDangerBusy(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto p-4 pb-24 md:pb-8 animate-fade-in font-sans space-y-6">
      <header className="text-center mb-2">
        <div className="inline-flex p-3 rounded-full mb-3" style={{ background: 'color-mix(in srgb, var(--om-primary-soft) 35%, transparent)' }}>
          <SettingsIcon style={{ color: 'var(--om-primary)' }} size={28} />
        </div>
        <h1 className="text-2xl font-black text-gray-800 tracking-tight">Cài đặt Space</h1>
        <p className="text-xs text-gray-400 font-bold mt-1 uppercase tracking-wider">
          {role === 'user_1' ? 'User 1' : 'User 2'} · đổi theme & thông tin chung
        </p>
      </header>

      {error && (
        <div className="rounded-2xl bg-[color-mix(in_srgb,var(--om-accent)_22%,white)] border border-[color-mix(in_srgb,var(--om-accent)_50%,transparent)] px-4 py-3 text-sm font-semibold text-[color-mix(in_srgb,var(--om-accent)_45%,#3a1a28)]">
          {error}
        </div>
      )}
      {message && (
        <div className="rounded-2xl bg-[color-mix(in_srgb,var(--om-primary)_14%,white)] border border-[color-mix(in_srgb,var(--om-primary)_30%,transparent)] px-4 py-3 text-sm font-semibold text-[var(--om-primary)] flex items-center gap-2">
          <Check size={16} /> {message}
        </div>
      )}

      {/* Theme preview strip */}
      <div className="bg-white rounded-[30px] border border-[color-mix(in_srgb,var(--om-primary-soft)_25%,transparent)] shadow-sm p-5 overflow-hidden">
        <div className="flex gap-1 mb-4 -mx-1">
          {currentTheme.colors.map((c) => (
            <span key={c} className="h-2.5 flex-1 first:rounded-l-full last:rounded-r-full" style={{ background: c }} />
          ))}
        </div>
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Theme đang dùng</p>
        <p className="font-black text-gray-800 mt-0.5">{currentTheme.name}</p>
      </div>

      {/* Name */}
      <section className="bg-white rounded-[30px] border border-[color-mix(in_srgb,var(--om-primary-soft)_25%,transparent)] shadow-sm p-6 space-y-3">
        <h2 className="text-xs font-black uppercase tracking-widest flex items-center gap-2" style={{ color: 'var(--om-primary)' }}>
          <Type size={14} /> Tên Space
        </h2>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          className="om-field w-full rounded-2xl border-2 border-[color-mix(in_srgb,var(--om-primary-soft)_30%,transparent)] px-4 py-3 text-sm font-semibold outline-none focus:border-[var(--om-primary)]"
          placeholder="Chúng mình"
        />
      </section>

      {/* Dates */}
      <section className="bg-white rounded-[30px] border border-[color-mix(in_srgb,var(--om-primary-soft)_25%,transparent)] shadow-sm p-6 space-y-4">
        <h2 className="text-xs font-black uppercase tracking-widest flex items-center gap-2" style={{ color: 'var(--om-primary)' }}>
          <CalendarHeart size={14} /> Những ngày đặc biệt
        </h2>
        <label className="block">
          <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2 block">
            Ngày bắt đầu yêu *
          </span>
          <input
            type="date"
            required
            value={togetherSince}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setTogetherSince(e.target.value)}
            className="om-field w-full rounded-2xl border-2 border-[color-mix(in_srgb,var(--om-primary-soft)_30%,transparent)] px-4 py-3 text-sm font-semibold outline-none focus:border-[var(--om-primary)]"
          />
        </label>
        <label className="block">
          <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2 block">
            Ngày quen nhau
          </span>
          <input
            type="date"
            value={metOn}
            disabled={skipMet}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setMetOn(e.target.value)}
            className="om-field w-full rounded-2xl border-2 border-[color-mix(in_srgb,var(--om-primary-soft)_30%,transparent)] px-4 py-3 text-sm font-semibold outline-none focus:border-[var(--om-primary)] disabled:opacity-50"
          />
        </label>
        <button
          type="button"
          onClick={() => {
            setSkipMet((v) => !v);
            if (!skipMet) setMetOn('');
          }}
          className="text-xs font-bold text-[var(--om-primary)] hover:underline"
        >
          {skipMet ? 'Nhập ngày quen' : 'Để trống ngày quen'}
        </button>
      </section>

      {/* Theme grid */}
      <section className="bg-white rounded-[30px] border border-[color-mix(in_srgb,var(--om-primary-soft)_25%,transparent)] shadow-sm p-6">
        <h2 className="text-xs font-black uppercase tracking-widest flex items-center gap-2 mb-4" style={{ color: 'var(--om-primary)' }}>
          <Palette size={14} /> Màu chủ đạo
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[360px] overflow-y-auto pr-1">
          {THEME_PALETTES.map((theme) => {
            const active = themeKey === theme.key;
            return (
              <button
                key={theme.key}
                type="button"
                onClick={() => setThemeKey(theme.key)}
                className={`text-left rounded-2xl border-2 p-3 transition-all ${
                  active
                    ? 'border-2 shadow-sm'
                    : 'border-2 border-[color-mix(in_srgb,var(--om-primary-soft)_30%,transparent)] om-surface hover:opacity-90'
                }`}
                style={
                  active
                    ? {
                        borderColor: theme.colors[0],
                        background: `color-mix(in srgb, ${theme.colors[0]} 12%, white)`,
                      }
                    : undefined
                }
              >
                <p className="text-xs font-black text-gray-700 mb-2">{theme.name}</p>
                <div className="flex gap-1">
                  {theme.colors.map((c) => (
                    <span
                      key={`${theme.key}-${c}`}
                      className="h-6 flex-1 rounded-md border border-black/5"
                      style={{ background: c }}
                    />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Push notifications */}
      <section className="bg-white rounded-[30px] border border-[color-mix(in_srgb,var(--om-primary-soft)_25%,transparent)] shadow-sm p-6 space-y-3">
        <h2 className="text-xs font-black uppercase tracking-widest flex items-center gap-2" style={{ color: 'var(--om-primary)' }}>
          <Bell size={14} /> Thông báo
        </h2>
        <p className="text-sm text-gray-500 font-medium">
          Bật để nhận thông báo khi có thư mới hoặc comment Discovery (cần chạy trên link Vercel / HTTPS, và cả hai cùng bật).
        </p>
        {!isPushSupported() && (
          <p className="text-xs font-semibold text-amber-700">
            Trình duyệt / thiết bị này không hỗ trợ Web Push (iOS cần «Thêm vào MH chính» + iOS 16.4+).
          </p>
        )}
        <button
          type="button"
          onClick={enablePush}
          disabled={pushBusy || !isPushSupported()}
          className="w-full rounded-2xl py-3 text-xs font-black uppercase tracking-widest text-[var(--om-on-primary)] disabled:opacity-50"
          style={{ background: 'var(--om-primary)' }}
        >
          {pushBusy ? LOADING_COPY.IN_PUSH : 'Bật thông báo trên máy này'}
        </button>
        {pushMsg && <p className="text-xs font-semibold text-gray-600">{pushMsg}</p>}
      </section>

      {/* Invite */}
      {space?.invite_code && (
        <section className="bg-white rounded-[30px] border border-[color-mix(in_srgb,var(--om-primary-soft)_25%,transparent)] shadow-sm p-6">
          <h2 className="text-xs font-black uppercase tracking-widest text-[var(--om-primary)] mb-2">Link mời</h2>
          <p className="om-field text-[11px] font-mono break-all mb-3 rounded-xl px-3 py-2 border border-[color-mix(in_srgb,var(--om-primary-soft)_20%,transparent)]">
            {inviteUrl(space.invite_code)}
          </p>
          <button
            type="button"
            onClick={copyInvite}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-[color-mix(in_srgb,var(--om-primary-soft)_40%,transparent)] text-xs font-black uppercase tracking-widest text-gray-600"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Đã copy' : 'Copy link mời'}
          </button>
        </section>
      )}

      <button
        type="button"
        onClick={save}
        disabled={saving || dangerBusy}
        className="w-full rounded-2xl py-4 text-xs font-black uppercase tracking-widest shadow-lg active:scale-[0.98] disabled:opacity-50"
        style={{
          background: 'var(--om-primary)',
          color: 'var(--om-on-primary)',
          boxShadow: `0 10px 25px -5px var(--om-shadow)`,
        }}
      >
        {saving ? LOADING_COPY.IN_SAVE : 'Lưu thay đổi'}
      </button>

      {/* Danger zone */}
      <section className="bg-white rounded-[30px] border border-rose-200 shadow-sm p-6 space-y-4">
        <h2 className="text-xs font-black uppercase tracking-widest text-rose-500">Nguy hiểm</h2>
        <p className="text-sm text-gray-500 font-medium">
          Rời Space để tạo / join Space khác. Xóa Space chỉ dành cho người tạo — mất hết dữ liệu.
        </p>
        {dangerNote && (
          <p className="text-xs font-black text-rose-600 bg-rose-50 rounded-xl px-3 py-2">{dangerNote}</p>
        )}

        {!showLeaveConfirm ? (
          <button
            type="button"
            onClick={() => {
              setShowLeaveConfirm(true);
              setDangerNote('');
              setError('');
            }}
            disabled={dangerBusy}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-white border-2 border-rose-200 text-rose-600 py-3.5 text-xs font-black uppercase tracking-widest disabled:opacity-50"
          >
            <DoorOpen size={14} />
            Rời Space
          </button>
        ) : (
          <div className="space-y-2 rounded-2xl border border-rose-100 bg-rose-50/50 p-3">
            <p className="text-xs font-semibold text-rose-700">
              Chắc chắn rời Space{role === 'user_1' && space?.name ? ` «${space.name}»` : ''}?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowLeaveConfirm(false)}
                disabled={dangerBusy}
                className="flex-1 rounded-2xl border-2 border-gray-200 bg-white py-3 text-xs font-black uppercase tracking-widest text-gray-500"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={leaveSpace}
                disabled={dangerBusy}
                className="flex-1 rounded-2xl bg-rose-500 text-white py-3 text-xs font-black uppercase tracking-widest disabled:opacity-50"
              >
                {dangerBusy ? LOADING_COPY.IN_LEAVE : 'Xác nhận rời'}
              </button>
            </div>
          </div>
        )}

        {role === 'user_1' && (
          <div className="space-y-3 pt-2 border-t border-rose-100">
            {!showDeleteConfirm ? (
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(true);
                  setConfirmName('');
                  setError('');
                  setDangerNote('');
                }}
                disabled={dangerBusy}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-rose-500 text-white py-3.5 text-xs font-black uppercase tracking-widest disabled:opacity-50"
              >
                <Trash2 size={14} />
                Xóa Space
              </button>
            ) : (
              <>
                <p className="text-xs font-semibold text-rose-600">
                  Gõ đúng <span className="font-black">«{space?.name}»</span> rồi bấm xóa (không popup thêm):
                </p>
                <input
                  value={confirmName}
                  onChange={(e) => setConfirmName(e.target.value)}
                  className="om-field w-full rounded-2xl border-2 border-rose-200 px-4 py-3 text-sm font-semibold outline-none focus:border-rose-400"
                  placeholder={space?.name || 'Tên Space'}
                  autoCapitalize="off"
                  autoCorrect="off"
                />
                <p className="text-[10px] text-gray-400 font-medium">
                  Khớp tên: {namesMatch(confirmName, space?.name || '') ? '✓ đúng' : '✗ chưa đúng'}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setConfirmName('');
                      setDangerNote('');
                    }}
                    disabled={dangerBusy}
                    className="flex-1 rounded-2xl border-2 border-gray-200 py-3 text-xs font-black uppercase tracking-widest text-gray-500"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={deleteSpace}
                    disabled={dangerBusy}
                    className="flex-1 rounded-2xl bg-rose-600 text-white py-3 text-xs font-black uppercase tracking-widest disabled:opacity-50"
                  >
                    {dangerBusy ? LOADING_COPY.IN_DELETE : 'Xóa ngay'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </section>

      <button
        type="button"
        onClick={() => signOut()}
        disabled={dangerBusy}
        className="w-full flex items-center justify-center gap-2 rounded-2xl bg-white border-2 border-[color-mix(in_srgb,var(--om-accent)_50%,transparent)] text-[color-mix(in_srgb,var(--om-accent)_45%,#3a1a28)] py-3.5 text-xs font-black uppercase tracking-widest"
      >
        <LogOut size={14} />
        Đăng xuất
      </button>

      <p className="text-center">
        <Link to="/" className="text-xs font-bold text-[var(--om-primary)] hover:underline">
          ← Về trang chủ
        </Link>
      </p>
    </div>
  );
}
