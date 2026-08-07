import { registerPlugin } from '@capacitor/core';
import { Capacitor } from '@capacitor/core';
import { cloudinaryAvatar } from './cloudinaryUrl';
import { daysTogether } from './invite';

/**
 * Capacitor plugin (iOS) — ghi App Group cho WidgetKit.
 * Trên web / Android chưa native → no-op an toàn.
 */
const CoupleWidgetNative = registerPlugin('CoupleWidget', {
  web: () => ({
    sync: async () => ({ ok: false, reason: 'web' }),
  }),
});

/**
 * @param {object} input
 * @param {string|null} input.togetherSince
 * @param {string} [input.avatar1Url]
 * @param {string} [input.avatar2Url]
 * @param {string} [input.nickname1]
 * @param {string} [input.nickname2]
 * @param {string} [input.spaceName]
 */
export async function syncCoupleWidget(input) {
  if (!Capacitor.isNativePlatform()) {
    return { ok: false, reason: 'not_native' };
  }

  const togetherSince = input?.togetherSince || null;
  const days = daysTogether(togetherSince) ?? 0;

  const payload = {
    togetherSince,
    days,
    avatar1Url: cloudinaryAvatar(input?.avatar1Url || '', 256) || '',
    avatar2Url: cloudinaryAvatar(input?.avatar2Url || '', 256) || '',
    nickname1: (input?.nickname1 || '').trim() || 'Tình yêu 1',
    nickname2: (input?.nickname2 || '').trim() || 'Tình yêu 2',
    spaceName: (input?.spaceName || '').trim() || 'Our Memory',
    updatedAt: new Date().toISOString(),
  };

  try {
    const result = await CoupleWidgetNative.sync(payload);
    return { ok: true, ...result, days: payload.days };
  } catch (e) {
    console.warn('[CoupleWidget] sync failed', e);
    return { ok: false, error: e?.message || String(e) };
  }
}

export function isCoupleWidgetSupported() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
}
