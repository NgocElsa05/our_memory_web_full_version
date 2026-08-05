import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Heart, PartyPopper, X } from 'lucide-react';
import { supabase } from '../supabase';
import { useSession } from '../context/SessionContext';
import { daysTogether } from '../lib/invite';
import {
  getTodaysCelebrations,
  hasShownCelebration,
  markCelebrationShown,
} from '../lib/milestones';

async function fetchProfilesForMilestones(spaceId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, nickname, birthday')
    .eq('space_id', spaceId);
  if (error) throw error;
  return data ?? [];
}

function maybeLocalNotify(celeb) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  try {
    const regPromise = navigator.serviceWorker?.ready;
    const opts = {
      body: celeb.body,
      icon: '/icons/icon-192.png?v=2',
      badge: '/icons/favicon-32.png?v=2',
      tag: `milestone-${celeb.id}`,
      renotify: true,
      data: { url: '/' },
    };
    if (regPromise) {
      regPromise.then((reg) => reg.showNotification(`${celeb.emoji} ${celeb.title}`, opts)).catch(() => {
        new Notification(`${celeb.emoji} ${celeb.title}`, opts);
      });
    } else {
      new Notification(`${celeb.emoji} ${celeb.title}`, opts);
    }
  } catch {
    /* ignore */
  }
}

/**
 * Popup chúc mừng mốc ngày / sinh nhật khi mở app (1 lần / mốc / ngày).
 * Lockscreen: local notification nếu đã cho phép + cron Vercel (api/milestones-cron).
 */
export default function MilestoneCelebration() {
  const { space, spaceId, members } = useSession();
  const days = daysTogether(space?.together_since);
  const [queue, setQueue] = useState([]);
  const [active, setActive] = useState(null);

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles-milestones', spaceId],
    queryFn: () => fetchProfilesForMilestones(spaceId),
    enabled: Boolean(spaceId),
  });

  const todays = useMemo(
    () =>
      getTodaysCelebrations({
        days,
        profiles: profiles.map((p) => ({
          id: p.id,
          nickname: p.nickname,
          birthday: p.birthday,
        })),
      }),
    [days, profiles]
  );

  useEffect(() => {
    if (!spaceId || !todays.length) return;
    const pending = todays.filter((c) => !hasShownCelebration(spaceId, c.id));
    if (!pending.length) return;
    setQueue(pending);
  }, [spaceId, todays]);

  useEffect(() => {
    if (active || !queue.length || !spaceId) return;
    const [next, ...rest] = queue;
    setActive(next);
    setQueue(rest);
    markCelebrationShown(spaceId, next.id);
    maybeLocalNotify(next);
  }, [queue, active, spaceId]);

  const dismiss = () => setActive(null);

  if (!active) return null;

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center px-5 bg-black/45 backdrop-blur-[2px]">
      <div
        className="relative w-full max-w-sm rounded-[32px] bg-white shadow-2xl border overflow-hidden"
        style={{ borderColor: 'color-mix(in srgb, var(--om-primary-soft) 35%, transparent)' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="milestone-title"
      >
        <div
          className="h-2 w-full"
          style={{
            background: 'linear-gradient(90deg, var(--om-primary), var(--om-accent), var(--om-lavender))',
          }}
        />
        <button
          type="button"
          onClick={dismiss}
          className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-50"
          aria-label="Đóng"
        >
          <X size={18} />
        </button>

        <div className="px-7 pt-8 pb-7 text-center">
          <div
            className="mx-auto mb-4 w-16 h-16 rounded-full flex items-center justify-center shadow-inner"
            style={{ background: 'color-mix(in srgb, var(--om-accent) 28%, white)' }}
          >
            {active.type === 'birthday' ? (
              <span className="text-3xl" aria-hidden>
                🎂
              </span>
            ) : (
              <PartyPopper className="text-[var(--om-primary)]" size={30} />
            )}
          </div>

          <p className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-2">
            Our Memory
          </p>
          <h2 id="milestone-title" className="text-xl font-black text-gray-800 leading-snug mb-3">
            {active.emoji} {active.title}
          </h2>
          <p className="text-sm text-gray-500 font-medium leading-relaxed mb-6">{active.body}</p>

          {typeof active.days === 'number' && (
            <p
              className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-full mb-6"
              style={{
                color: 'var(--om-primary)',
                background: 'color-mix(in srgb, var(--om-primary) 12%, white)',
              }}
            >
              <Heart size={12} className="fill-current" /> {active.days} ngày
            </p>
          )}

          <button
            type="button"
            onClick={dismiss}
            className="w-full rounded-2xl py-3.5 text-xs font-black uppercase tracking-widest text-[var(--om-on-primary)]"
            style={{ background: 'var(--om-primary)', boxShadow: '0 10px 24px var(--om-shadow)' }}
          >
            Ôm lấy khoảnh khắc này
          </button>

          {members?.length < 2 && (
            <p className="mt-3 text-[11px] text-gray-400">Khi đủ hai người, cả hai đều nhận được lời chúc này.</p>
          )}
        </div>
      </div>
    </div>
  );
}
