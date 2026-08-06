import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, X } from 'lucide-react';
import { supabase } from '../supabase';
import { useSession } from '../context/SessionContext';

/**
 * Banner trong app khi có thư mới — iOS thường không hiện Web Push lúc app đang mở.
 * Nguồn: Supabase realtime INSERT + message từ service worker (push).
 */
export default function InAppNotifier() {
  const { sessionUserId, spaceId } = useSession();
  const navigate = useNavigate();
  const [notice, setNotice] = useState(null);
  const hideTimer = useRef(null);
  const lastKeyRef = useRef('');

  const show = (payload) => {
    const key = `${payload.tag || 'n'}:${payload.title}:${payload.body || ''}`;
    const now = Date.now();
    if (key === lastKeyRef.current) return;
    lastKeyRef.current = key;
    window.setTimeout(() => {
      if (lastKeyRef.current === key) lastKeyRef.current = '';
    }, 2500);

    if (hideTimer.current) clearTimeout(hideTimer.current);
    setNotice({ ...payload, _t: now });
    hideTimer.current = setTimeout(() => setNotice(null), 6000);
  };

  useEffect(() => {
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  // Realtime: thư mới gửi tới mình
  useEffect(() => {
    if (!spaceId || !sessionUserId) return undefined;

    const channel = supabase
      .channel(`inapp_letters_${spaceId}_${sessionUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'love_letters',
          filter: `space_id=eq.${spaceId}`,
        },
        (payload) => {
          const row = payload.new;
          if (!row) return;
          if (row.receiver_id && row.receiver_id !== sessionUserId) return;
          if (row.sender_id && row.sender_id === sessionUserId) return;

          const from = (row.sender_name || '').trim() || 'Người ấy';
          show({
            title: 'Thư mới 💌',
            body: `${from} vừa gửi một lời thương cho bạn`,
            url: '/mailbox',
            tag: `love-letter-${row.id || Date.now()}`,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [spaceId, sessionUserId]);

  // Push lúc app đang foreground (iOS hay nuốt system notification)
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return undefined;

    const onMessage = (event) => {
      const data = event.data;
      if (!data || data.type !== 'OM_PUSH') return;
      show({
        title: data.title || 'Our Memory',
        body: data.body || '',
        url: data.url || '/',
        tag: data.tag || `push-${Date.now()}`,
      });
    };

    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, []);

  if (!notice) return null;

  const go = () => {
    const path = notice.url || '/mailbox';
    setNotice(null);
    navigate(path.startsWith('/') ? path : '/mailbox');
  };

  return (
    <div className="fixed top-0 inset-x-0 z-[300] flex justify-center px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pointer-events-none">
      <div
        className="pointer-events-auto w-full max-w-md rounded-2xl shadow-2xl border px-4 py-3 flex items-start gap-3 backdrop-blur-md animate-fade-in"
        style={{
          background: 'color-mix(in srgb, var(--om-tint) 92%, white)',
          borderColor: 'color-mix(in srgb, var(--om-primary-soft) 45%, transparent)',
          boxShadow: '0 12px 40px -8px var(--om-shadow)',
        }}
      >
        <button
          type="button"
          onClick={go}
          className="flex items-start gap-3 min-w-0 flex-1 text-left"
        >
          <span
            className="mt-0.5 w-9 h-9 rounded-full flex items-center justify-center shrink-0"
            style={{ background: 'var(--om-primary)', color: 'var(--om-on-primary)' }}
          >
            <Mail size={18} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-black uppercase tracking-wider" style={{ color: 'var(--om-primary)' }}>
              {notice.title}
            </span>
            <span className="block text-sm font-semibold text-gray-700 mt-0.5 leading-snug">{notice.body}</span>
            <span className="block text-[10px] font-bold mt-1.5 uppercase tracking-wider" style={{ color: 'var(--om-accent)' }}>
              Chạm để mở hòm thư
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => setNotice(null)}
          className="text-gray-400 p-1 shrink-0"
          aria-label="Đóng"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
