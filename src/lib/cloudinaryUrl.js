/**
 * Thêm transform Cloudinary vào URL delivery.
 * https://res.cloudinary.com/{cloud}/image/upload/{transforms}/{rest}
 */
export function cloudinaryTransform(url, transforms = 'w_400,h_400,c_fill,q_auto,f_auto') {
  if (!url || typeof url !== 'string') return url;
  if (!url.includes('res.cloudinary.com')) return url;

  const uploadMarker = '/image/upload/';
  const idx = url.indexOf(uploadMarker);
  if (idx === -1) return url;

  const afterUpload = url.slice(idx + uploadMarker.length);
  if (/^w_\d+/.test(afterUpload) || /^h_\d+/.test(afterUpload)) return url;

  const prefix = url.slice(0, idx + uploadMarker.length);
  return `${prefix}${transforms}/${afterUpload}`;
}

/** Thumbnail vuông — grid gallery, album */
export function cloudinaryThumb(url, size = 400) {
  return cloudinaryTransform(url, `w_${size},h_${size},c_fill,q_auto,f_auto`);
}

/** Avatar / ô nhỏ */
export function cloudinaryAvatar(url, size = 200) {
  return cloudinaryTransform(url, `w_${size},h_${size},c_fill,q_auto,f_auto`);
}

/** Xem lớn — đủ nét, nhẹ hơn file gốc */
export function cloudinaryDisplay(url, maxWidth = 1600) {
  return cloudinaryTransform(url, `w_${maxWidth},c_limit,q_auto,f_auto`);
}
