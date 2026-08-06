import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

/** Deep link ourmemory://… → về Home (widget tap). */
export function startDeepLinkListener(navigate) {
  if (!Capacitor.isNativePlatform()) return () => {};

  const sub = App.addListener('appUrlOpen', ({ url }) => {
    try {
      const u = new URL(url);
      if (u.protocol !== 'ourmemory:') return;
      const path = u.host || u.pathname.replace(/^\//, '') || 'home';
      if (path === 'home' || path === '') {
        navigate?.('/', { replace: true });
      }
    } catch {
      /* ignore */
    }
  });

  return () => {
    sub.then((h) => h.remove()).catch(() => {});
  };
}
