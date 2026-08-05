import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabase';
import { useAuth } from './AuthContext';

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
  const [member, setMember] = useState(null);
  const [space, setSpace] = useState(null);
  const [profile, setProfile] = useState(null);
  const [partner, setPartner] = useState(null);
  const [partnerProfile, setPartnerProfile] = useState(null);
  const [members, setMembers] = useState([]);
  const [profilesById, setProfilesById] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  /** Buộc tính lại onboardingStep sau khi ghi sessionStorage (theme/preview done). */
  const [onboardingTick, setOnboardingTick] = useState(0);

  const refresh = useCallback(async () => {
    if (!user) {
      setMember(null);
      setSpace(null);
      setProfile(null);
      setPartner(null);
      setPartnerProfile(null);
      setMembers([]);
      setProfilesById({});
      setLoading(false);
      setError('');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data: myMember, error: memErr } = await supabase
        .from('members')
        .select('*')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (memErr) throw memErr;

      if (!myMember) {
        setMember(null);
        setSpace(null);
        setProfile(null);
        setPartner(null);
        setPartnerProfile(null);
        setMembers([]);
        setProfilesById({});
        return;
      }

      setMember(myMember);

      const { data: spaceRow, error: spaceErr } = await supabase
        .from('spaces')
        .select('*')
        .eq('id', myMember.space_id)
        .maybeSingle();
      if (spaceErr) throw spaceErr;
      setSpace(spaceRow);

      const { data: spaceMembers, error: allMemErr } = await supabase
        .from('members')
        .select('*')
        .eq('space_id', myMember.space_id);
      if (allMemErr) throw allMemErr;
      setMembers(spaceMembers || []);

      const { data: spaceProfiles, error: profErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('space_id', myMember.space_id);
      if (profErr) throw profErr;

      const byId = {};
      (spaceProfiles || []).forEach((p) => {
        byId[p.id] = p;
      });
      setProfilesById(byId);
      setProfile(byId[myMember.id] || null);

      const other = (spaceMembers || []).find((m) => m.id !== myMember.id) || null;
      setPartner(other);
      setPartnerProfile(other ? byId[other.id] || null : null);
    } catch (e) {
      console.error(e);
      setError(e.message || 'Không tải được dữ liệu space');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    refresh();
  }, [authLoading, refresh]);

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
    // onboardingTick: đọc lại theme_done / preview_done trong sessionStorage
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
