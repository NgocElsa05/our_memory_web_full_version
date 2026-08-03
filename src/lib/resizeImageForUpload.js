/**
 * Giảm dung lượng ảnh trước khi upload (giữ đủ nét cho web).
 * Ảnh nhỏ / đã vừa kích thước thì trả về file gốc.
 *
 * @param {File} file
 * @param {{ maxEdge?: number; maxBytesBeforeProcess?: number; quality?: number }} [opts]
 * @returns {Promise<File>}
 */
export async function prepareImageFileForUpload(file, opts = {}) {
  if (!(file instanceof File) || !file.type.startsWith('image/')) {
    return file;
  }

  const maxEdge = opts.maxEdge ?? 1920;
  const maxBytesBeforeProcess = opts.maxBytesBeforeProcess ?? 600 * 1024;
  const quality = opts.quality ?? 0.82;

  let bmp;
  try {
    bmp = await createImageBitmap(file);
  } catch {
    return file;
  }

  const iw = bmp.width;
  const ih = bmp.height;
  const bigSide = Math.max(iw, ih);
  const needResize = bigSide > maxEdge;
  const needReencode = file.size > maxBytesBeforeProcess;

  if (!needResize && !needReencode) {
    bmp.close();
    return file;
  }

  const scale = needResize ? Math.min(1, maxEdge / bigSide) : 1;
  const w = Math.max(1, Math.round(iw * scale));
  const h = Math.max(1, Math.round(ih * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bmp.close();
    return file;
  }
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close();

  const baseName = file.name.replace(/\.[^.]+$/, '') || 'photo';
  const outName = `${baseName}.jpg`;

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Không tạo được ảnh đã nén'))),
      'image/jpeg',
      quality
    );
  });

  return new File([blob], outName, { type: 'image/jpeg' });
}
