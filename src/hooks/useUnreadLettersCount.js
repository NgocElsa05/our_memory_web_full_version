import { useMemo } from 'react';
import { useSession } from '../context/SessionContext';
import { isLetterReceivedBySession } from '../lib/loveLetterIdentity';
import { useLoveLetters, useLoveLettersRealtimeSync } from './useLoveLetters';

export function useUnreadLettersCount() {
  useLoveLettersRealtimeSync();
  const { sessionUserId } = useSession();
  const { data } = useLoveLetters();

  return useMemo(() => {
    if (!sessionUserId || !data?.length) return 0;
    return data.filter(
      (l) => isLetterReceivedBySession(l, sessionUserId) && l.is_read !== true
    ).length;
  }, [data, sessionUserId]);
}
