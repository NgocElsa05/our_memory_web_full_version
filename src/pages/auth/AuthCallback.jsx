import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase';
import { useSpace } from '../../context/SpaceContext';

const NEXT_KEY = 'auth_oauth_next';

export function saveOAuthNext(path) {
  sessionStorage.setItem(NEXT_KEY, path || '/onboarding/space');
}

export function readOAuthNext() {
  return sessionStorage.getItem(NEXT_KEY) || '/onboarding/space';
}

export function clearOAuthNext() {
  sessionStorage.removeItem(NEXT_KEY);
}

/**
 * Google / OAuth quay về đây trước — đợi session xong rồi mới vào onboarding.
 * Tránh đạp về /welcome vì chưa kịp có user.
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const { onboardingStep, loading: spaceLoading, refresh } = useSpace();
  const [message, setMessage] = useState('Đang đăng nhập bằng Google…');

  useEffect(() => {
    let cancelled = false;

    async function finish() {
      // Đợi Supabase đọc token trên URL (PKCE / hash)
      const { data, error } = await supabase.auth.getSession();
      if (cancelled) return;

      if (error || !data.session) {
        setMessage('Đăng nhập Google chưa thành công. Thử lại hoặc dùng email nhé.');
        setTimeout(() => navigate('/login', { replace: true }), 1800);
        return;
      }

      await refresh();
      if (cancelled) return;

      const next = readOAuthNext();
      clearOAuthNext();
      // Để SpaceProvider kịp tính bước — chờ chút rồi điều hướng theo step
      setMessage('Đăng nhập thành công, đang vào Space…');
    }

    finish();
    return () => {
      cancelled = true;
    };
  }, [navigate, refresh]);

  useEffect(() => {
    if (spaceLoading || onboardingStep === 'loading' || onboardingStep === 'logged_out') return;
    if (onboardingStep === 'ready') {
      clearOAuthNext();
      navigate('/', { replace: true });
      return;
    }
    if (
      onboardingStep === 'need_space' ||
      onboardingStep === 'need_dates' ||
      onboardingStep === 'need_theme' ||
      onboardingStep === 'need_preview' ||
      onboardingStep === 'need_profile'
    ) {
      const map = {
        need_space: '/onboarding/space',
        need_dates: '/onboarding/dates',
        need_theme: '/onboarding/theme',
        need_preview: '/onboarding/space-preview',
        need_profile: '/onboarding/profile',
      };
      clearOAuthNext();
      navigate(map[onboardingStep], { replace: true });
    }
  }, [onboardingStep, spaceLoading, navigate]);

  return (
    <div className="min-h-screen bg-[var(--om-tint)] flex items-center justify-center px-6 text-center">
      <p className="text-sm font-black uppercase tracking-widest text-[var(--om-primary)]">{message}</p>
    </div>
  );
}
