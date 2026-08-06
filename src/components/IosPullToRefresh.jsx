import { useEffect, useRef, useState } from 'react';
import { isIosStandalone } from '../lib/device';

const THRESHOLD = 72;

/**
 * iOS Add-to-Home tắt pull-to-refresh native → tự làm gesture kéo xuống để reload.
 * Chỉ bật trên iOS standalone; Android vẫn dùng native.
 */
export default function IosPullToRefresh() {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const pulling = useRef(false);

  useEffect(() => {
    if (!isIosStandalone()) return undefined;

    const getScrollTop = () =>
      window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;

    const onStart = (e) => {
      if (refreshing) return;
      if (getScrollTop() > 2) {
        pulling.current = false;
        return;
      }
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    };

    const onMove = (e) => {
      if (!pulling.current || refreshing) return;
      if (getScrollTop() > 2) {
        pulling.current = false;
        setPull(0);
        return;
      }
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0) {
        setPull(0);
        return;
      }
      // Chặn overscroll cao su một phần để gesture rõ hơn
      if (dy > 8) e.preventDefault();
      setPull(Math.min(dy * 0.45, 120));
    };

    const onEnd = () => {
      if (!pulling.current) return;
      pulling.current = false;
      setPull((current) => {
        if (current >= THRESHOLD) {
          setRefreshing(true);
          window.setTimeout(() => {
            window.location.reload();
          }, 280);
          return THRESHOLD;
        }
        return 0;
      });
    };

    document.addEventListener('touchstart', onStart, { passive: true });
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onEnd);
    document.addEventListener('touchcancel', onEnd);

    return () => {
      document.removeEventListener('touchstart', onStart);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
      document.removeEventListener('touchcancel', onEnd);
    };
  }, [refreshing]);

  if (!isIosStandalone()) return null;
  if (pull <= 0 && !refreshing) return null;

  const ready = pull >= THRESHOLD || refreshing;

  return (
    <div
      className="fixed left-0 right-0 z-[400] flex justify-center pointer-events-none"
      style={{
        top: 'max(0.5rem, env(safe-area-inset-top))',
        transform: `translateY(${refreshing ? 8 : Math.max(0, pull - 24)}px)`,
        opacity: refreshing ? 1 : Math.min(1, pull / 40),
        transition: refreshing || pull === 0 ? 'transform 0.2s ease, opacity 0.2s ease' : undefined,
      }}
      aria-hidden
    >
      <div
        className="rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-wider shadow-lg border backdrop-blur-md"
        style={{
          background: 'color-mix(in srgb, var(--om-tint, #fff) 94%, white)',
          borderColor: 'color-mix(in srgb, var(--om-primary-soft, #ccc) 50%, transparent)',
          color: 'var(--om-primary, #666)',
        }}
      >
        {refreshing ? 'Đang tải lại…' : ready ? 'Thả để tải lại' : 'Kéo xuống để tải lại'}
      </div>
    </div>
  );
}
