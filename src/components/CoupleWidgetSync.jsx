import { useEffect, useRef } from 'react';
import { useSession } from '../context/SessionContext';
import { useProfileAvatars } from '../hooks/useProfiles';
import { syncCoupleWidget, isCoupleWidgetSupported } from '../lib/coupleWidget';

/**
 * Khi Space + 2 profile sẵn sàng → sync snapshot sang iOS App Group (widget).
 * No-op trên web / Android.
 */
export default function CoupleWidgetSync() {
  const { space } = useSession();
  const { avatars, labels } = useProfileAvatars();
  const lastKey = useRef('');

  useEffect(() => {
    if (!isCoupleWidgetSupported()) return undefined;
    if (!space?.id) return undefined;

    const key = [
      space.id,
      space.together_since || '',
      avatars.user_1 || '',
      avatars.user_2 || '',
      labels.user_1 || '',
      labels.user_2 || '',
      space.name || '',
    ].join('|');

    if (key === lastKey.current) return undefined;
    lastKey.current = key;

    const t = window.setTimeout(() => {
      void syncCoupleWidget({
        togetherSince: space.together_since || null,
        avatar1Url: avatars.user_1 || '',
        avatar2Url: avatars.user_2 || '',
        nickname1: labels.user_1 || '',
        nickname2: labels.user_2 || '',
        spaceName: space.name || '',
      });
    }, 800);

    return () => window.clearTimeout(t);
  }, [
    space?.id,
    space?.together_since,
    space?.name,
    avatars.user_1,
    avatars.user_2,
    labels.user_1,
    labels.user_2,
  ]);

  return null;
}
