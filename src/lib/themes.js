/** Theme palettes — map theme_key → 6 màu (xem docs/AUTH_USER_FLOW.md) */
export const THEME_PALETTES = [
  {
    key: 'neapolitan',
    name: 'Neapolitan',
    colors: ['#F9A1BC', '#FFD2E2', '#121212', '#F4F0EB', '#A4B3ED', '#DDE4FF'],
  },
  {
    key: 'day_at_the_park',
    name: 'Day at the Park',
    colors: ['#F0A33B', '#9CA989', '#F2A1B7', '#6A4630', '#D1BBA8', '#86AAB9'],
  },
  {
    key: 'spring_morning',
    name: 'Spring Morning',
    colors: ['#C5D2E1', '#88BBA4', '#679469', '#D9C35F', '#E08579', '#F09FA2'],
  },
  {
    key: 'vineyard',
    name: 'Vinyard',
    colors: ['#3B6133', '#93AE87', '#C6D6C4', '#A792BD', '#74698E', '#423650'],
  },
  {
    key: 'breezy',
    name: 'Breezy',
    colors: ['#16325C', '#667FA6', '#749FAA', '#F6ECE1', '#ECA890', '#F9D0BF'],
  },
  {
    key: 'fall_sunrise',
    name: 'Fall Sunrise',
    colors: ['#7CA5B9', '#E8A08A', '#FACEC1', '#8ABFBD', '#B6D9CF', '#E3BE57'],
  },
  {
    key: 'garden_blooms',
    name: 'Garden Blooms',
    colors: ['#115754', '#4CC9A9', '#A6EBD5', '#FFE3E5', '#FCD5D8', '#E23E68'],
  },
  {
    key: 'berry_picking',
    name: 'Berry Picking',
    colors: ['#5E8967', '#85AA92', '#D0CCBF', '#C49FA8', '#CE7E7F', '#A34C4E'],
  },
  {
    key: 'sunday_mornin',
    name: "Sunday Mornin'",
    colors: ['#163B63', '#D9724C', '#FAD2C0', '#AECFDD', '#C27038', '#EFE3B4'],
  },
  {
    key: 'pineberry',
    name: 'PineBerry',
    colors: ['#155655', '#228084', '#66A8B0', '#CB95AD', '#AD678B', '#803556'],
  },
];

export const DEFAULT_THEME_KEY = 'neapolitan';

/** Soft-slate mặc định cho Welcome / auth / onboarding (khớp :root trong index.css). */
export const AUTH_DEFAULT_CSS_VARS = {
  '--om-primary': '#7ca1d9',
  '--om-primary-soft': '#bec3ea',
  '--om-accent': '#e7b5d3',
  '--om-muted': '#d7c8e9',
  '--om-lavender': '#d7c8e9',
  '--om-envelope-heart': '#e7b5d3',
  '--om-tint': '#f4f5fa',
  '--om-field': '#f7f8fc',
  '--om-on-field': '#1a1a1a',
  '--om-placeholder': '#5b6472',
  '--om-bg': '#f8f9fd',
  '--om-on-primary': '#ffffff',
  '--om-on-accent': '#1a1a1a',
  '--om-shadow': '#7ca1d933',
};

/**
 * Form auth/onboarding: xám trung tính (không inherit theme Space / brand-blue).
 * Title OUR MEMORY giữ màu brand riêng trong AuthLayout.
 */
export const AUTH_BASIC_ACTION_VARS = {
  '--om-primary': '#4b5563',
  '--om-primary-soft': '#d1d5db',
  '--om-accent': '#9ca3af',
  '--om-muted': '#e5e7eb',
  '--om-lavender': '#9ca3af',
  '--om-tint': '#f3f4f6',
  '--om-field': '#f9fafb',
  '--om-on-field': '#1a1a1a',
  '--om-placeholder': '#6b7280',
  '--om-bg': '#f3f4f6',
  '--om-on-primary': '#ffffff',
  '--om-on-accent': '#1a1a1a',
  '--om-shadow': '#4b556333',
};

export function getThemeByKey(key) {
  return THEME_PALETTES.find((t) => t.key === key) || THEME_PALETTES[0];
}

function luminance(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  const f = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

/** Chọn màu sáng nhất trong palette */
function pickLightest(colors) {
  return [...colors].sort((a, b) => luminance(b) - luminance(a))[0];
}

function onColor(hex) {
  return luminance(hex) > 0.55 ? '#1a1a1a' : '#ffffff';
}

/**
 * Map 6 màu palette → CSS variables semantic cho UI.
 * Content boxes (--om-tint / --om-field) luôn lấy màu sáng nhất + pha trắng, chữ đen.
 * Nút solid dùng --om-on-primary / --om-on-accent (trắng hoặc đen theo độ sáng nền).
 */
export function getThemeCssVars(themeKey) {
  const t = getThemeByKey(themeKey || DEFAULT_THEME_KEY);
  const [c1, c2, c3, c4, c5, c6] = t.colors;
  const light = pickLightest(t.colors);
  // Nền ô nội dung: luôn nhạt để chữ đen đọc được trên mọi palette
  const field = `color-mix(in srgb, ${light} 38%, white)`;
  const tint = `color-mix(in srgb, ${light} 48%, white)`;

  // Neapolitan: c3 là đen (#121212) — dùng xanh c5 cho accent/tim, tránh trái tim đen
  const accent = t.key === 'neapolitan' ? c5 : c3;
  const envelopeHeart =
    t.key === 'neapolitan' ? c5 : luminance(c3) < 0.22 ? c1 : c3;

  return {
    '--om-c1': c1,
    '--om-c2': c2,
    '--om-c3': c3,
    '--om-c4': c4,
    '--om-c5': c5,
    '--om-c6': c6,
    '--om-primary': c1,
    '--om-primary-soft': c2,
    '--om-accent': accent,
    '--om-muted': c4,
    '--om-lavender': c5,
    '--om-envelope-heart': envelopeHeart,
    '--om-tint': tint,
    '--om-field': field,
    '--om-on-field': '#1a1a1a',
    '--om-placeholder': '#5b6472',
    '--om-bg': light,
    '--om-on-primary': onColor(c1),
    '--om-on-accent': onColor(accent),
    '--om-shadow': `${c1}33`,
  };
}

export function themeAccent(themeKey) {
  return getThemeByKey(themeKey || DEFAULT_THEME_KEY).colors[0];
}
