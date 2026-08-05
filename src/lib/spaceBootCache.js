/** Cache nhẹ để mở lại app (tab discard / reload) không flash màn loading space. */

const KEY = 'om_space_boot_v1';

export function readSpaceBootCache(userId) {
  if (!userId || typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.userId !== userId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeSpaceBootCache(userId, payload) {
  if (!userId || typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(
      KEY,
      JSON.stringify({
        userId,
        savedAt: Date.now(),
        member: payload.member ?? null,
        space: payload.space ?? null,
        profile: payload.profile ?? null,
        partner: payload.partner ?? null,
        partnerProfile: payload.partnerProfile ?? null,
        members: payload.members ?? [],
        profilesById: payload.profilesById ?? {},
      })
    );
  } catch {
    /* quota / private mode */
  }
}

export function clearSpaceBootCache() {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
