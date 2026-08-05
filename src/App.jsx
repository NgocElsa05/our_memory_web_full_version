import { useMemo } from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes, Link, useLocation } from 'react-router-dom';
import { Home as HomeIcon, Calendar, Search, Mail, Heart, Settings as SettingsIcon } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SpaceProvider, useSpace } from './context/SpaceContext';
import { SessionContext } from './context/SessionContext';

import Welcome from './pages/auth/Welcome';
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import Invite from './pages/auth/Invite';
import AuthCallback from './pages/auth/AuthCallback';
import CreateSpace from './pages/onboarding/CreateSpace';
import OnboardingDates from './pages/onboarding/Dates';
import ThemePicker from './pages/onboarding/ThemePicker';
import SpacePreview from './pages/onboarding/SpacePreview';
import CreateProfile from './pages/onboarding/CreateProfile';
import Home from './pages/Home';
import Gallery from './pages/Gallery';
import Mailbox from './pages/Mailbox';
import Discovery from './pages/Discovery';
import Settings from './pages/Settings';
import MusicPlayer from './components/MusicPlayer';
import CuteLoader from './components/CuteLoader';
import MilestoneCelebration from './components/MilestoneCelebration';
import { useUnreadLettersCount } from './hooks/useUnreadLettersCount';
import { getThemeByKey, DEFAULT_THEME_KEY, getThemeCssVars } from './lib/themes';
import { LOADING_COPY } from './lib/loadingCopy';

function LoadingScreen({ message = LOADING_COPY.FS_AUTH }) {
  return <CuteLoader variant="fullscreen" message={message} />;
}

function stepPath(step) {
  switch (step) {
    case 'need_space':
      return '/onboarding/space';
    case 'need_dates':
      return '/onboarding/dates';
    case 'need_theme':
      return '/onboarding/theme';
    case 'need_preview':
      return '/onboarding/space-preview';
    case 'need_profile':
      return '/onboarding/profile';
    case 'ready':
      return '/';
    default:
      return null;
  }
}

function PublicOnly({ children }) {
  const { user, loading } = useAuth();
  const { onboardingStep, loading: spaceLoading } = useSpace();
  if (loading) return <LoadingScreen message={LOADING_COPY.FS_AUTH} />;
  if ((user && spaceLoading) || (user && onboardingStep === 'loading')) {
    return <LoadingScreen message={LOADING_COPY.FS_SPACE} />;
  }
  if (user) {
    const to = stepPath(onboardingStep) || '/onboarding/space';
    return <Navigate to={to} replace />;
  }
  return children;
}

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <LoadingScreen message={LOADING_COPY.FS_AUTH} />;
  if (!user) {
    return <Navigate to="/welcome" replace state={{ from: location.pathname }} />;
  }
  return children;
}

function OnboardingGate({ expect, children }) {
  const { onboardingStep, loading, error } = useSpace();
  if (loading || onboardingStep === 'loading') {
    return <LoadingScreen message={LOADING_COPY.FS_SPACE} />;
  }
  if (error) {
    return (
      <div className="min-h-screen bg-[var(--om-tint)] flex flex-col items-center justify-center px-6 text-center">
        <p className="text-sm font-semibold text-[color-mix(in_srgb,var(--om-accent)_45%,#3a1a28)] mb-2">{error}</p>
        <p className="text-xs text-gray-400">
          Kiểm tra đã chạy SQL schema trên Supabase chưa (bảng spaces, members, profiles…).
        </p>
      </div>
    );
  }
  if (onboardingStep === 'logged_out') {
    return <Navigate to="/welcome" replace />;
  }
  if (onboardingStep !== expect) {
    const to = stepPath(onboardingStep);
    if (to) return <Navigate to={to} replace />;
  }
  return children;
}

function SessionBridge({ children }) {
  const spaceCtx = useSpace();
  const { signOut } = useAuth();

  const value = useMemo(
    () => ({
      ...spaceCtx,
      setSessionUserId: () => {},
      clearSession: () => {
        void signOut();
      },
    }),
    [spaceCtx, signOut]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

const NavItem = ({ to, icon: Icon, label, mobile = false, badge = 0 }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  const showBadge = badge > 0;
  const badgeText = badge > 99 ? '99+' : String(badge);
  if (mobile) {
    return (
      <Link
        to={to}
        className={`flex flex-col items-center gap-1 ${isActive ? '' : 'text-gray-400'}`}
        style={isActive ? { color: 'var(--om-primary)' } : undefined}
      >
        <span className="relative inline-flex">
          <Icon size={20} />
          {showBadge && (
            <span
              className="absolute -top-1.5 -right-2 min-w-[1rem] h-4 px-1 flex items-center justify-center rounded-full text-[9px] font-black border border-white shadow-sm leading-none"
              style={{ background: 'var(--om-accent)', color: 'var(--om-on-primary)' }}
            >
              {badgeText}
            </span>
          )}
        </span>
        <span className="text-[10px] font-black uppercase tracking-tighter">{label}</span>
      </Link>
    );
  }
  return (
    <Link
      to={to}
      className="flex items-center gap-3 p-3 rounded-xl transition-all"
      style={
        isActive
          ? {
              background: 'var(--om-primary)',
              color: 'var(--om-on-primary)',
              boxShadow: `0 10px 25px -5px var(--om-shadow)`,
            }
          : { color: '#6b7280' }
      }
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.background = 'color-mix(in srgb, var(--om-primary) 12%, transparent)';
          e.currentTarget.style.color = 'var(--om-primary)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = '#6b7280';
        }
      }}
    >
      <span className="relative inline-flex shrink-0">
        <Icon size={20} />
        {showBadge && (
          <span
            className="absolute -top-1.5 -right-2 min-w-[1rem] h-4 px-1 flex items-center justify-center rounded-full text-[9px] font-black border border-white shadow-sm leading-none"
            style={{ background: 'var(--om-accent)', color: '#fff' }}
          >
            {badgeText}
          </span>
        )}
      </span>
      <span className="font-bold text-sm">{label}</span>
    </Link>
  );
};

function AuthenticatedShell() {
  const mailUnread = useUnreadLettersCount();
  const { profile, role, space } = useSpace();
  const theme = getThemeByKey(space?.theme_key || DEFAULT_THEME_KEY);
  const themeVars = useMemo(
    () => getThemeCssVars(space?.theme_key || DEFAULT_THEME_KEY),
    [space?.theme_key]
  );

  return (
    <div className="flex min-h-screen om-bg-page text-gray-800 font-sans relative theme-root" style={themeVars}>
      <MusicPlayer />
      <MilestoneCelebration />

      <aside className="hidden md:flex w-64 bg-white border-r flex-col p-6 sticky top-0 h-screen shadow-sm om-border-soft">
        <div className="flex items-center gap-2 mb-10 px-2">
          <Heart size={28} style={{ color: 'var(--om-accent)', fill: 'var(--om-accent)' }} />
          <h1
            className="text-xl font-black uppercase tracking-tighter bg-clip-text text-transparent"
            style={{
              backgroundImage: 'linear-gradient(to right, var(--om-primary), var(--om-lavender))',
            }}
          >
            Our Memory
          </h1>
        </div>
        <nav className="flex flex-col gap-2 flex-1">
          <NavItem to="/" icon={HomeIcon} label="Trang chủ" />
          <NavItem to="/gallery" icon={Calendar} label="Kỷ niệm" />
          <NavItem to="/mailbox" icon={Mail} label="Hòm thư" badge={mailUnread} />
          <NavItem to="/discovery" icon={Search} label="Khám phá" />
        </nav>

        <Link
          to="/settings"
          className="block p-4 rounded-2xl border space-y-3 hover:bg-white transition-all group"
          style={{
            background: 'color-mix(in srgb, var(--om-tint) 40%, #f8f9fd)',
            borderColor: 'color-mix(in srgb, var(--om-primary-soft) 40%, transparent)',
          }}
        >
          <div className="flex gap-1 -mx-0.5">
            {theme.colors.map((c) => (
              <span key={c} className="h-1.5 flex-1 first:rounded-l-full last:rounded-r-full" style={{ background: c }} />
            ))}
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p
                className="text-[10px] font-black uppercase tracking-widest truncate"
                style={{ color: 'var(--om-primary-soft)' }}
              >
                {profile?.nickname || 'Bạn'} · {role === 'user_1' ? 'User 1' : 'User 2'}
              </p>
              <p className="text-[11px] font-bold text-gray-600 truncate mt-0.5">{theme.name}</p>
            </div>
            <SettingsIcon size={16} className="shrink-0" style={{ color: 'var(--om-primary)' }} />
          </div>
          <p className="text-[9px] font-black uppercase tracking-wider" style={{ color: 'var(--om-primary)' }}>
            Cài đặt Space
          </p>
        </Link>
      </aside>

      <main className="flex-1 pb-24 md:pb-0 min-h-screen overflow-x-hidden">
        <div
          className="md:hidden sticky top-0 z-30 flex justify-between items-center px-4 pt-3 pb-2 backdrop-blur-sm border-b"
          style={{
            background: 'color-mix(in srgb, var(--om-bg) 70%, white)',
            borderColor: 'color-mix(in srgb, var(--om-primary-soft) 25%, transparent)',
          }}
        >
          <span className="text-[10px] font-black uppercase tracking-wider truncate" style={{ color: 'var(--om-primary)' }}>
            {profile?.nickname || 'Our Memory'}
          </span>
          <Link
            to="/settings"
            className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider py-2 px-4 rounded-full bg-white border shadow-sm"
            style={{
              color: 'var(--om-primary)',
              borderColor: 'color-mix(in srgb, var(--om-primary-soft) 40%, transparent)',
            }}
          >
            <SettingsIcon size={12} />
            Cài đặt
          </Link>
        </div>
        <div className="max-x-6xl mx-auto py-6 md:py-8 px-4 md:px-10">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/mailbox" element={<Mailbox />} />
            <Route path="/discovery" element={<Discovery />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </div>
      </main>

      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t flex justify-around py-4 px-2 z-40"
        style={{
          borderColor: 'color-mix(in srgb, var(--om-primary-soft) 40%, transparent)',
          boxShadow: `0 -10px 25px -5px var(--om-shadow)`,
        }}
      >
        <NavItem to="/" icon={HomeIcon} label="Trang" mobile />
        <NavItem to="/gallery" icon={Calendar} label="Kỉ niệm" mobile />
        <NavItem to="/mailbox" icon={Mail} label="Hòm Thư" mobile badge={mailUnread} />
        <NavItem to="/discovery" icon={Search} label="Khám phá" mobile />
      </nav>
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/welcome"
        element={
          <PublicOnly>
            <Welcome />
          </PublicOnly>
        }
      />
      <Route
        path="/login"
        element={
          <PublicOnly>
            <Login />
          </PublicOnly>
        }
      />
      <Route
        path="/signup"
        element={
          <PublicOnly>
            <Signup />
          </PublicOnly>
        }
      />
      <Route path="/invite/:inviteCode" element={<Invite />} />
      <Route path="/auth/callback" element={<AuthCallback />} />

      <Route
        path="/onboarding/space"
        element={
          <RequireAuth>
            <OnboardingGate expect="need_space">
              <CreateSpace />
            </OnboardingGate>
          </RequireAuth>
        }
      />
      <Route
        path="/onboarding/dates"
        element={
          <RequireAuth>
            <OnboardingGate expect="need_dates">
              <OnboardingDates />
            </OnboardingGate>
          </RequireAuth>
        }
      />
      <Route
        path="/onboarding/theme"
        element={
          <RequireAuth>
            <OnboardingGate expect="need_theme">
              <ThemePicker />
            </OnboardingGate>
          </RequireAuth>
        }
      />
      <Route
        path="/onboarding/space-preview"
        element={
          <RequireAuth>
            <OnboardingGate expect="need_preview">
              <SpacePreview />
            </OnboardingGate>
          </RequireAuth>
        }
      />
      <Route
        path="/onboarding/profile"
        element={
          <RequireAuth>
            <OnboardingGate expect="need_profile">
              <CreateProfile />
            </OnboardingGate>
          </RequireAuth>
        }
      />

      <Route
        path="/*"
        element={
          <RequireAuth>
            <OnboardingGate expect="ready">
              <SessionBridge>
                <AuthenticatedShell />
              </SessionBridge>
            </OnboardingGate>
          </RequireAuth>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <SpaceProvider>
          <AppRoutes />
        </SpaceProvider>
      </AuthProvider>
    </Router>
  );
}
