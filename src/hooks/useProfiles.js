import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { useSession } from '../context/SessionContext';

export function friendlyNickname(_profileId, nickname, fallback = 'Bạn') {
  const t = (nickname ?? '').trim();
  return t || fallback;
}

async function fetchSpaceProfiles(spaceId) {
  if (!spaceId) return [];
  const { data, error } = await supabase
    .from('profiles')
    .select('id, nickname, avatar_url, space_id, full_name')
    .eq('space_id', spaceId);
  if (error) throw error;
  return data ?? [];
}

/** Nickname theo member id trong space hiện tại */
export function useProfileNicknames() {
  const { spaceId, members, nicknameOf } = useSession();
  const q = useQuery({
    queryKey: ['profiles', spaceId],
    queryFn: () => fetchSpaceProfiles(spaceId),
    enabled: Boolean(spaceId),
  });

  const tabNames = useMemo(() => {
    const map = {};
    (members || []).forEach((m) => {
      const fromQuery = q.data?.find((p) => p.id === m.id);
      map[m.id] = friendlyNickname(
        m.id,
        fromQuery?.nickname || m.nickname,
        nicknameOf?.(m.id) || (m.role === 'user_1' ? 'Tình yêu 1' : 'Tình yêu 2')
      );
    });
    return map;
  }, [members, q.data, nicknameOf]);

  return {
    tabNames,
    isLoading: q.isLoading,
    isError: q.isError,
    refetch: q.refetch,
  };
}

/** Hai avatar cho Home: luôn user_1 trái, user_2 phải (giữ layout 2 người) */
export function useProfileAvatars() {
  const { spaceId, members, nicknameOf } = useSession();
  const q = useQuery({
    queryKey: ['profiles', spaceId],
    queryFn: () => fetchSpaceProfiles(spaceId),
    enabled: Boolean(spaceId),
  });

  const { avatars, labels, ids } = useMemo(() => {
    const m1 = (members || []).find((m) => m.role === 'user_1');
    const m2 = (members || []).find((m) => m.role === 'user_2');
    const p1 = q.data?.find((p) => p.id === m1?.id);
    const p2 = q.data?.find((p) => p.id === m2?.id);

    return {
      ids: { user_1: m1?.id || null, user_2: m2?.id || null },
      avatars: {
        user_1: p1?.avatar_url || '',
        user_2: p2?.avatar_url || '',
        // alias layout cũ Home
        em: p1?.avatar_url || '',
        anh: p2?.avatar_url || '',
      },
      labels: {
        user_1: friendlyNickname(m1?.id, p1?.nickname || m1?.nickname, 'Tình yêu 1'),
        user_2: friendlyNickname(m2?.id, p2?.nickname || m2?.nickname, 'Tình yêu 2'),
        em: friendlyNickname(m1?.id, p1?.nickname || m1?.nickname, 'Tình yêu 1'),
        anh: friendlyNickname(m2?.id, p2?.nickname || m2?.nickname, 'Tình yêu 2'),
      },
    };
  }, [members, q.data, nicknameOf]);

  return {
    avatars,
    labels,
    ids,
    isLoading: q.isLoading,
    refetch: q.refetch,
  };
}
