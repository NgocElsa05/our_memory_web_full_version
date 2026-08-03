/**
 * Migrate media_gallery rows still pointing at Supabase Storage → Cloudinary.
 *
 * Usage:
 *   npm run migrate:gallery          # all rows
 *   npm run migrate:gallery -- --dry-run
 *   npm run migrate:gallery -- --limit=3
 *
 * Requires .env.local: VITE_SUPABASE_*, VITE_CLOUDINARY_*
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const cloudName = process.env.VITE_CLOUDINARY_CLOUD_NAME;
const preset = process.env.VITE_CLOUDINARY_UPLOAD_PRESET;

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const limitArg = args.find((a) => a.startsWith('--limit='));
const limit = limitArg ? Number(limitArg.split('=')[1]) : null;

if (!supabaseUrl || !supabaseKey || !cloudName || !preset) {
  console.error('Thiếu biến trong .env.local (VITE_SUPABASE_*, VITE_CLOUDINARY_*)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

/** Tải từ Supabase + nén (tránh lỗi Cloudinary free >10MB). */
async function downloadAndCompress(remoteUrl) {
  const res = await fetch(remoteUrl);
  if (!res.ok) {
    throw new Error(`Tải ảnh thất bại HTTP ${res.status}: ${remoteUrl.slice(0, 80)}…`);
  }
  const input = Buffer.from(await res.arrayBuffer());
  return sharp(input)
    .rotate()
    .resize({ width: 2048, height: 2048, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 82 })
    .toBuffer();
}

async function uploadBuffer(jpegBuffer, folder) {
  const form = new FormData();
  form.append('file', new Blob([jpegBuffer], { type: 'image/jpeg' }), 'migrate.jpg');
  form.append('upload_preset', preset);
  form.append('folder', folder);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: form,
  });
  const data = await res.json();
  if (!data.secure_url) {
    throw new Error(data.error?.message || JSON.stringify(data));
  }
  return { secureUrl: data.secure_url, publicId: data.public_id };
}

async function main() {
  let query = supabase
    .from('media_gallery')
    .select('id, file_url')
    .like('file_url', '%supabase.co%')
    .order('created_at', { ascending: true });

  if (limit && Number.isFinite(limit)) {
    query = query.limit(limit);
  }

  const { data: rows, error } = await query;

  if (error) {
    console.error('Lỗi đọc Supabase:', error.message);
    process.exit(1);
  }

  if (!rows?.length) {
    console.log('Không còn dòng nào có file_url Supabase — có thể đã migrate xong.');
    return;
  }

  console.log(
    dryRun
      ? `[dry-run] Sẽ migrate ${rows.length} ảnh (không upload / không update DB).`
      : `Bắt đầu migrate ${rows.length} ảnh…`
  );

  let ok = 0;
  let fail = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const n = i + 1;
    console.log(`\n[${n}/${rows.length}] ${row.id}`);

    if (dryRun) {
      console.log('  ', row.file_url.slice(0, 90) + '…');
      continue;
    }

    try {
      const jpeg = await downloadAndCompress(row.file_url);
      console.log(`  Đã nén → ${(jpeg.length / 1024 / 1024).toFixed(2)} MB`);

      const { secureUrl, publicId } = await uploadBuffer(jpeg, 'couple_app/gallery');

      const { error: upErr } = await supabase
        .from('media_gallery')
        .update({ file_url: secureUrl, cloudinary_public_id: publicId })
        .eq('id', row.id);

      if (upErr) throw new Error(`Update DB: ${upErr.message}`);

      console.log('  OK', secureUrl);
      ok += 1;
    } catch (e) {
      console.error('  LỖI:', e.message);
      fail += 1;
    }

    await delay(600);
  }

  console.log('\n---');
  if (dryRun) {
    console.log('Dry-run xong. Chạy lại không có --dry-run để migrate thật.');
  } else {
    console.log(`Xong: ${ok} thành công, ${fail} lỗi.`);
    console.log('Mở Gallery trên web kiểm tra, rồi mới xóa file trong Storage bucket `media`.');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
