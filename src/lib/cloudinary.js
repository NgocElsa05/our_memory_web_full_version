/**
 * Upload ảnh (File hoặc Blob) lên Cloudinary — dùng chung Gallery & Discovery.
 * Endpoint đúng: v1_1 (không phải v1_0).
 */
export async function uploadToCloudinary(fileOrBlob, folder, filename = 'upload.jpg') {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const preset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
  if (!cloudName || !preset) {
    throw new Error('Thiếu VITE_CLOUDINARY_CLOUD_NAME hoặc VITE_CLOUDINARY_UPLOAD_PRESET trong .env.local');
  }
  const formData = new FormData();
  const file =
    fileOrBlob instanceof File
      ? fileOrBlob
      : new File([fileOrBlob], filename, { type: 'image/jpeg' });
  formData.append('file', file);
  formData.append('upload_preset', preset);
  formData.append('folder', folder);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: 'POST', body: formData }
  );
  const data = await res.json();
  if (!data.secure_url) {
    throw new Error(data.error?.message || 'Upload Cloudinary thất bại');
  }
  return {
    secureUrl: data.secure_url,
    publicId: data.public_id || null,
  };
}
