/**
 * iOS "Add to Home Screen" hay giữ HTML/JS cũ.
 * So sánh build id trong bundle với /version.json (no-cache) → reload khi deploy mới.
 */

const BUILD_ID = import.meta.env.VITE_APP_BUILD_ID || 'dev'
const RELOAD_GUARD_KEY = 'om_reload_for_build'

async function fetchRemoteBuildId() {
  const res = await fetch(`/version.json?_=${Date.now()}`, {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) return null
  const data = await res.json()
  return typeof data?.buildId === 'string' ? data.buildId : null
}

async function hardReload(remoteBuildId) {
  try {
    if ('caches' in window) {
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k)))
    }
  } catch {
    /* ignore */
  }

  try {
    sessionStorage.setItem(RELOAD_GUARD_KEY, remoteBuildId)
  } catch {
    /* ignore */
  }

  const url = new URL(window.location.href)
  url.searchParams.set('_om', remoteBuildId)
  window.location.replace(url.toString())
}

async function checkForUpdate() {
  if (!BUILD_ID || BUILD_ID === 'dev') return

  let remote
  try {
    remote = await fetchRemoteBuildId()
  } catch {
    return
  }
  if (!remote || remote === BUILD_ID) return

  // Tránh vòng reload nếu HTML vẫn bị cache bản cũ
  try {
    if (sessionStorage.getItem(RELOAD_GUARD_KEY) === remote) return
  } catch {
    /* ignore */
  }

  await hardReload(remote)
}

function pingServiceWorkerUpdate() {
  if (!('serviceWorker' in navigator)) return
  navigator.serviceWorker.getRegistration().then((reg) => {
    reg?.update().catch(() => {})
  })
}

/** Gọi 1 lần từ main.jsx — check khi mở lại app / focus / định kỳ */
export function startUpdateChecker() {
  const run = () => {
    pingServiceWorkerUpdate()
    void checkForUpdate()
  }

  // Sau khi vào app một nhịp — tránh đua với boot
  window.setTimeout(run, 2500)

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') run()
  })

  window.addEventListener('focus', run)

  // Mỗi 3 phút khi app còn mở
  window.setInterval(run, 3 * 60 * 1000)
}
