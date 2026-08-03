import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { useSession } from '../context/SessionContext';

export const LOVE_LETTERS_QUERY_KEY = ['love-letters'];

const REALTIME_DEBOUNCE_MS = 500;

let suppressRealtimeUntil = 0;

export function suppressLoveLettersRealtime(ms = 2000) {
  suppressRealtimeUntil = Date.now() + ms;
}

const LETTER_COLUMNS =
  'id, content, sender_id, sender_name, receiver_id, is_read, created_at, space_id';

export async function fetchLoveLetters(spaceId) {
  if (!spaceId) return [];
  const { data, error } = await supabase
    .from('love_letters')
    .select(LETTER_COLUMNS)
    .eq('space_id', spaceId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export function useLoveLetters() {
  const { spaceId } = useSession();
  return useQuery({
    queryKey: [...LOVE_LETTERS_QUERY_KEY, spaceId],
    queryFn: () => fetchLoveLetters(spaceId),
    enabled: Boolean(spaceId),
  });
}

export function useLoveLettersRealtimeSync() {
  const queryClient = useQueryClient();
  const { spaceId } = useSession();
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!spaceId) return undefined;

    const scheduleInvalidate = () => {
      if (Date.now() < suppressRealtimeUntil) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        if (Date.now() < suppressRealtimeUntil) return;
        void queryClient.invalidateQueries({ queryKey: [...LOVE_LETTERS_QUERY_KEY, spaceId] });
      }, REALTIME_DEBOUNCE_MS);
    };

    const channel = supabase
      .channel(`love_letters_${spaceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'love_letters',
          filter: `space_id=eq.${spaceId}`,
        },
        scheduleInvalidate
      )
      .subscribe();

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [queryClient, spaceId]);
}
