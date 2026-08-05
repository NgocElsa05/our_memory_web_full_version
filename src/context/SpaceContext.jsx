import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { supabase } from '../supabase';
import { useAuth } from './AuthContext';
import {
  clearSpaceBootCache,
  readSpaceBootCache,
  writeSpaceBootCache,
} from '../lib/spaceBootCache';

const SpaceContext = createContext(null);

function resolveStep({ member, space, profile }) {
  if (!member || !space) return 'need_space';

  const isUser1 = member.role === 'user_1';
  const isUser2 = member.role === 'user_2';

  if (isUser1 && !space.together_since) return 'need_dates';

  if (isUser1 && !profile) {
    const themeDone = sessionStorage.getItem(`theme_done_${space.id}`) === '1';
    if (!themeDone) return 'need_theme';
  }

  if (!profile) {
    if (isUser2) {
      const previewDone = sessionStorage.getItem(`preview_done_${space.id}`) === '1';
      if (!previewDone) return 'need_preview';
    }
    return 'need_profile';
  }

  return 'ready';
}

export function SpaceProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;
  const [member, setMember] = useState(null);
  const [space, setSpace] = useState(null);
  const [profile, setProfile] = useState(null);
  const [partner, setPartner] = useState(null);
  const [partnerProfile, setPartnerProfile] = useState(null);
  const [members, setMembers] = useState([]);
  const [profilesById, setProfilesById] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [onboardingTick, setOnboardingTick] = useState(0);
  const hasLoadedOnceRef = useRef(false);
  const loadedUserIdRef = useRef(null);
  const silentRefreshOnceRef = useRef(null);

  const applyPayload = useCallback((payload) => {
    setMember(payload.member ?? null);
    setSpace(payload.space ?? null);
    setProfile(payload.profile ?? null);
    setPartner(payload.partner ?? null);
    setPartnerProfile(payload.partnerProfile ?? null);
    setMembers(payload.members ?? []);
    setProfilesById(payload.profilesById ?? {});
  }, []);

  // Hydrate từ sessionStorage TRƯỚC paint — tab discard/reload không flash FS_SPACE
  useLayoutEffect(() => {
    if (authLoading) return;

    if (!userId) {
      applyPayload({});
      setLoading(false);
      setError('');
      hasLoadedOnceRef.current = false;
      loadedUserIdRef.current = null;
      clearSpaceBootCache();
      return;
    }

    if (loadedUserIdRef.current === userId && hasLoadedOnceRef.current) return;

    const cached = readSpaceBootCache(userId);
    if (cached && cached.member && cached.space) {
      applyPayload(cached);
      hasLoadedOnceRef.current = true;
      loadedUserIdRef.current = userId;
      setLoading(false);
      setError('');
    }
  }, [authLoading, userId, applyPayload]);

  const refresh = useCallback(
    async (opts = {}) => {
      const silent = Boolean(opts.silent) || hasLoadedOnceRef.current;

      if (!userId) {
        applyPayload({});
        setLoading(false);
        setError('');
        hasLoadedOnceRef.current = false;
        loadedUserIdRef.current = null;
        clearSpaceBootCache();
        return;
      }

      if (!silent) setLoading(true);
      setError('');

      try {
        const { data: myMember, error: memErr } = await supabase
          .from('members')
          .select('*')
          .eq('auth_user_id', userId)
          .maybeSingle();

        if (memErr) throw memErr;

        if (!myMember) {
          const empty = {
            member: null,
            space: null,
            profile: null,
            partner: null,
            partnerProfile: null,
            members: [],
            profilesById: {},
          };
          applyPayload(empty);
          hasLoadedOnceRef.current = true;
          loadedUserIdRef.current = userId;
          clearSpaceBootCache();
          return;
        }

        const { data: spaceRow, error: spaceErr } = await supabase
          .from('spaces')
          .select('*')
          .eq('id', myMember.space_id)
          .maybeSingle();
        if (spaceErr) throw spaceErr;

        const { data: spaceMembers, error: allMemErr } = await supabase
          .from('members')
          .select('*')
          .eq('space_id', myMember.space_id);
        if (allMemErr) throw allMemErr;

        const { data: spaceProfiles, error: profErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('space_id', myMember.space_id);
        if (profErr) throw profErr;

        const byId = {};
        (spaceProfiles || []).forEach((p) => {
          byId[p.id] = p;
        });

        const other = (spaceMembers || []).find((m) => m.id !== myMember.id) || null;
        const payload = {
          member: myMember,
          space: spaceRow,
          profile: byId[myMember.id] || null,
          partner: other,
          partnerProfile: other ? byId[other.id] || null : null,
          members: spaceMembers || [],
          profilesById: byId,
        };

        applyPayload(payload);
        hasLoadedOnceRef.current = true;
        loadedUserIdRef.current = userId;
        writeSpaceBootCache(userId, payload);
      } catch (e) {
        console.error(e);
        if (!hasLoadedOnceRef.current) {
          setError(e.message || 'Không tải được dữ liệu space');
        }
      } finally {
        setLoading(false);
      }
    },
    [userId, applyPayload]
  );

  useEffect(() => {
    if (authLoading) return;
    if (!userId) return;

    // Đã có cache / đã load — chỉ silent refresh một lần sau hydrate
    if (loadedUserIdRef.current === userId && hasLoadedOnceRef.current) {
      if (silentRefreshOnceRef.current !== userId) {
        silentRefreshOnceRef.current = userId;
        void refresh({ silent: true });
      }
      return;
    }

    void refresh({ silent: false });
  }, [authLoading, userId, refresh]);

  const markThemeDone = useCallback((spaceId) => {
    sessionStorage.setItem(`theme_done_${spaceId}`, '1');
    setOnboardingTick((n) => n + 1);
  }, []);

  const markPreviewDone = useCallback((spaceId) => {
    sessionStorage.setItem(`preview_done_${spaceId}`, '1');
    setOnboardingTick((n) => n + 1);
  }, []);

  const nicknameOf = useCallback(
    (memberId, fallback = 'Bạn') => {
      const p = profilesById[memberId];
      const t = (p?.nickname || '').trim();
      if (t) return t;
      const m = members.find((x) => x.id === memberId);
      if (m?.nickname?.trim()) return m.nickname.trim();
      if (m?.role === 'user_1') return 'Thành viên 1';
      if (m?.role === 'user_2') return 'Thành viên 2';
      return fallback;
    },
    [profilesById, members]
  );

  const onboardingStep = useMemo(() => {
    if (authLoading || loading) return 'loading';
    if (!user) return 'logged_out';
    return resolveStep({ member, space, profile });
  }, [authLoading, loading, user, member, space, profile, onboardingTick]);

  const partnerId = partner?.id ?? null;

  const value = useMemo(
    () => ({
      member,
      space,
      profile,
      partner,
      partnerProfile,
      partnerId,
      members,
      profilesById,
      nicknameOf,
      loading: authLoading || loading,
      error,
      onboardingStep,
      refresh,
      markThemeDone,
      markPreviewDone,
      sessionUserId: member?.id ?? null,
      spaceId: space?.id ?? null,
      role: member?.role ?? null,
    }),
    [
      member,
      space,
      profile,
      partner,
      partnerProfile,
      partnerId,
      members,
      profilesById,
      nicknameOf,
      authLoading,
      loading,
      error,
      onboardingStep,
      refresh,
      markThemeDone,
      markPreviewDone,
    ]
  );

  return <SpaceContext.Provider value={value}>{children}</SpaceContext.Provider>;
}

export function useSpace() {
  const ctx = useContext(SpaceContext);
  if (!ctx) throw new Error('useSpace chỉ dùng trong SpaceProvider');
  return ctx;
}
