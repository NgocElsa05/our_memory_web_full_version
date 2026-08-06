/** iOS / PWA helpers */

export function isIosDevice() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  // iPadOS desktop UA
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
}

/** App mở từ icon Home (standalone) — iOS tắt pull-to-refresh native */
export function isIosStandalone() {
  if (typeof window === 'undefined') return false;
  if (!isIosDevice()) return false;
  const nav = window.navigator;
  if (nav.standalone === true) return true;
  return window.matchMedia('(display-mode: standalone)').matches;
}
