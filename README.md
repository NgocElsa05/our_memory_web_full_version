# Our Memory Web

Ứng dụng web riêng tư cho hai người: lưu ảnh kỷ niệm, thư, playlist YouTube, và “khám phá” nhau qua moodboard + ghi chú. Giao diện pastel, tối ưu mobile (thanh điều hướng dưới) và desktop (sidebar).

## Công nghệ

| Thành phần | Vai trò |
|------------|---------|
| **React 19** + **Vite 8** | UI và build |
| **React Router 7** | Định tuyến trang |
| **Tailwind CSS 3** | Styling |
| **Supabase** | Database, Storage (bucket ảnh gallery), realtime-ready client |
| **Cloudinary** | Upload ảnh moodboard / profile (trang Khám phá), preset unsigned |
| **react-calendar** | Lịch trong Kỷ niệm |
| **lucide-react** | Icon |

**Tài liệu bổ sung:** [SUPABASE_SCHEMA_FOR_REVIEW.md](./SUPABASE_SCHEMA_FOR_REVIEW.md) — template dán schema Supabase để đối chiếu với frontend.

## Cài đặt và chạy local

```bash
npm install
npm run dev
```

Build production:

```bash
npm run build
npm run preview
```

### Biến môi trường

Tạo file `.env.local` (đã được `.gitignore` bỏ qua) với các biến **Vite** (tiền tố `VITE_`):

| Biến | Mục đích |
|------|----------|
| `VITE_SUPABASE_URL` | URL project Supabase |
| `VITE_SUPABASE_ANON_KEY` | Khóa anon công khai (client) |
| `VITE_CLOUDINARY_CLOUD_NAME` | Cloud name Cloudinary |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | Upload preset (unsigned) cho upload từ trình duyệt |

**Lưu ý kỹ thuật:** Hiện `src/supabase.js` đang khởi tạo client bằng URL/key cố định trong code. Để đồng bộ với Vercel và tránh lộ key trong repo, nên chuyển sang `import.meta.env.VITE_SUPABASE_URL` và `import.meta.env.VITE_SUPABASE_ANON_KEY`.

### Backend Supabase (đối chiếu code ↔ database)

Bảng dưới đây **được sinh tự động** từ `supabase.from('…')` và `supabase.storage…from('…')` trong `src/`. Sau khi đổi query ở pages hoặc components, chạy **`npm run readme:sync`** rồi commit README.

Mô tả cột, luồng UX và ý nghĩa từng trang vẫn nằm ở mục **Chi tiết từng trang** — cần **cập nhật tay** khi bạn đổi hành vi hoặc schema nghiệp vụ (README không đoán được phần đó). Đối chiếu với Postgres/RLS: **[SUPABASE_SCHEMA_FOR_REVIEW.md](./SUPABASE_SCHEMA_FOR_REVIEW.md)**.

<!-- README_SYNC:SUPABASE_START -->

| Bảng / bucket | Loại | File (tham chiếu) |
| --- | --- | --- |
| `discovery_comments` | Bảng | `src/pages/Discovery.jsx` |
| `love_letters` | Bảng | `src/pages/Mailbox.jsx` |
| `media` | Storage bucket | `src/pages/Gallery.jsx` |
| `media_gallery` | Bảng | `src/pages/Gallery.jsx` |
| `partner_discoveries` | Bảng | `src/pages/Discovery.jsx` |
| `profiles` | Bảng | `src/components/SessionUserPicker.jsx`, `src/pages/Discovery.jsx`, `src/pages/Gallery.jsx`, `src/pages/Home.jsx`, `src/pages/Mailbox.jsx` |
| `shared_playlist` | Bảng | `src/components/MusicPlayer.jsx` |

<!-- README_SYNC:SUPABASE_END -->

Chính sách **Row Level Security (RLS)** và quyền Storage cần cấu hình trên Supabase; README này chỉ mô tả phía frontend.

---

## Luồng ứng dụng tổng quan

1. Người dùng mở site → màn **mã bí mật 4 số** (lưu trạng thái trong `sessionStorage` với key `isMyWorld`).
2. Sau khi đúng mã → **React Router** render layout: sidebar (desktop) / bottom nav (mobile), vùng `<Routes>`, và **`MusicPlayer`** cố định góc màn hình.
3. Các trang gọi **Supabase** (và Cloudinary ở Khám phá) để đọc/ghi dữ liệu.

### Định tuyến

Bảng route **được sinh tự động** từ `<Route path="…" element={<… />} />` trong `src/App.jsx`. Chạy **`npm run readme:sync`** sau khi thêm/sửa route.

<!-- README_SYNC:ROUTES_START -->

| Đường dẫn | Component | File |
| --- | --- | --- |
| `/` | Home | `src/pages/Home.jsx` |
| `/gallery` | Gallery | `src/pages/Gallery.jsx` |
| `/mailbox` | Mailbox | `src/pages/Mailbox.jsx` |
| `/discovery` | Discovery | `src/pages/Discovery.jsx` |

<!-- README_SYNC:ROUTES_END -->

### Shell trong `App.jsx`

- **`NavItem`** — Link + icon (lucide); desktop: nền khi active; mobile: icon + nhãn nhỏ.
- **Màn khóa** — Input số, `CORRECT_PASS` hardcode trong `App.jsx` (nên đổi hoặc thay bằng cơ chế an toàn hơn nếu cần).
- **`MusicPlayer`** — Luôn mount sau khi đăng nhập “mã”; không nằm trong từng route.

---

## Component toàn cục

### `MusicPlayer` (`src/components/MusicPlayer.jsx`)

**Vị trí:** Góc phải dưới (floating), `z-index` cao.

**Chức năng:**

- Đọc playlist từ bảng **`shared_playlist`** (Supabase), sắp xếp theo `created_at` giảm dần.
- Lần đầu load: chọn ngẫu nhiên một bài; nếu không có bài nào thì fallback video YouTube mặc định (`jfKfPfyJRdk`).
- **Iframe YouTube** embed với `autoplay`, `loop`, `playlist` cùng `videoId`.
- **Dropdown** chọn bài khác; xóa bài khỏi playlist.
- Form **thêm bài:** parse `youtube_id` từ URL YouTube bằng regex, cần có thêm **tên bài** (`title`), insert vào Supabase.
- Đồng bộ tên bài hiện tại: ghi `localStorage` (`currentSongTitle`) và phát sự kiện tùy chỉnh **`musicChanged`** trên `window` để trang **Home** cập nhật “Giai điệu hôm nay”.

**Trạng thái UI:** Thu gọn (pill “Đang phát”) / mở rộng (panel đầy đủ).

---

## Chi tiết từng trang

### 1. Trang chủ — `Home.jsx` (`/`)

**Mục đích:** Dashboard cảm xúc: đếm ngày từ mốc cố định, avatar hai người, nhạc đang phát, preview ảnh mới nhất.

**Dữ liệu:**

- **`media_gallery`:** Lấy 1 bản ghi mới nhất theo `capture_date` → thẻ “Khoảnh khắc mới” (ảnh + `caption` nếu có).
- **`profiles`:** `id`, `avatar_url` cho `user_em` / `user_anh` → hai vòng tròn avatar.
- **Ngày yêu:** Tính số ngày giữa **23/04/2026** (mốc cố định trong code, timezone **Australia/Sydney** cho “hôm nay”) và ngày hiện tại; tối thiểu 0.

**Tương tác:**

- Nghe sự kiện `musicChanged` + đọc `localStorage` cho tiêu đề bài.
- Click “Khoảnh khắc mới” → `navigate('/gallery')`.

**Layout:** `max-w-md mx-auto` — khung hẹp kiểu mobile-first cho trang này.

---

### 2. Kỷ niệm — `Gallery.jsx` (`/gallery`)

**Mục đích:** Quản lý ảnh kỷ niệm: lưới, lịch, album; upload lên Supabase Storage; modal xem / tải / xóa.

**Chế độ xem (`view`):**

| Giá trị | Hành vi |
|---------|--------|
| `grid` | Lưới ảnh; có thể lọc theo **album** (`activeAlbum`) sau khi chọn từ chế độ album |
| `calendar` | `react-calendar` chọn ngày; ô có kỷ niệm class `has-memory`; bên dưới lưới ảnh trong ngày đó |
| `album` | Danh sách album (gom theo `album_name`), click album → chuyển `grid` + set `activeAlbum` |

**Upload (`handleUpload`):**

- Chọn nhiều file ảnh.
- `prompt` chú thích (một chú thích chung cho cả lô) và tên album (mặc định `"Chung"`).
- Upload từng file vào bucket **`media`**, tên file random; lấy **public URL**.
- `capture_date`: nếu đang ở view **calendar** thì gán theo **ngày đang chọn** trên lịch (giờ lấy theo thời điểm upload); ngược lại dùng thời điểm hiện tại.
- Insert hàng loạt vào **`media_gallery`**.

**Modal ảnh:** Full màn hình — đóng, link tải, xóa (xóa row DB; không xóa file storage trong đoạn code hiển thị — có thể bổ sung sau nếu cần).

**Đồng bộ tên:** Đọc `profiles.nickname` cho nhãn xác nhận xóa.

---

### 3. Hòm thư — `Mailbox.jsx` (`/mailbox`)

**Mục đích:** Gửi “thư” cho đối phương; xem hộp đến / đã gửi.

**Chọn “ai đang dùng máy”:** `currentUser` = `user_em` hoặc `user_anh` (chỉ UI, không xác thực server).

**Gửi thư (`love_letters`):**

- `sender_id` = user hiện tại, `receiver_id` = đối phương.
- `sender_name` = nickname đọc từ `profiles` (đã sync `tabNames`).

**Lọc danh sách:**

- **Thư nhận:** không phải thư do “tôi” gửi (ưu tiên `sender_id`; thư cũ không có id thì fallback theo emoji trong `sender_name`).
- **Thư đã gửi:** ngược lại.

Có **xóa** từng thư.

---

### 4. Khám phá — `Discovery.jsx` (`/discovery`)

**Mục đích:** Profile + moodboard ảnh cho từng người; danh sách “điều đối phương phát hiện” + phản hồi.

**Tab Em / Anh:** `activeTab` quyết định `subject_id` = `user_em` hoặc `user_anh`. Nếu chưa có row **`profiles`**, insert mặc định.

**Banner profile:**

- Chế độ xem: tên script (font Pinyon Script), tuổi, giới, cung, sinh nhật.
- Chế độ **sửa:** form text + nút Save → `update` `profiles`.
- **Moodboard:** lưới CSS 4×4; cấu hình ô trong mảng `GRID_CELLS` (key khớp **tên cột** trên `profiles`, trừ ảnh giữa).

**`MoodCell` (component con trong file):**

- Một ô moodboard: hiển thị ảnh hoặc placeholder; khi `editingProfile`, click mở file picker → upload **Cloudinary** (`uploadImage`) → cập nhật cột tương ứng trên Supabase.
- Ô giữa: `avatar_url`, upload riêng `handleAvatarUpload`.

**Cloudinary:** `VITE_CLOUDINARY_*`, folder upload `couple_app/profiles`.

**Discoveries:**

- Đọc **`partner_discoveries`** theo `subject_id` tab hiện tại, kèm nested **`discovery_comments`**.
- Thêm fact mới: insert với `author_id` = nickname **đối phương** (`partnerNickname`), `subject_id` = người đang được “khám phá”.
- Mỗi fact: nút **Chuẩn** / **Sai** → mở input reply → insert **`discovery_comments`** (tiền tố `[CHUẨN RỒI]` / `[SAI NHA]` trong nội dung).
- Xóa fact / xóa comment.

---

## Cấu trúc thư mục (frontend)

```
scripts/
  sync-readme.mjs    # npm run readme:sync — cập nhật bảng trong README
src/
  App.jsx              # Khóa mã, layout, route, NavItem
  main.jsx             # Entry React
  index.css            # Tailwind directives
  supabase.js          # Client Supabase
  components/
    MusicPlayer.jsx    # Nhạc nền YouTube + playlist
  pages/
    Home.jsx
    Gallery.jsx
    Mailbox.jsx
    Discovery.jsx
```

---

## Triển khai (Vercel)

- Framework preset: **Vite**.
- Thêm đủ biến `VITE_*` trong Project Settings → Environment Variables cho **Production** (và Preview nếu cần).
- Sau khi đổi env, **Redeploy** để build embed đúng giá trị `import.meta.env`.

---

## Bảo mật (tóm tắt)

- Mã 4 số trong `App.jsx` chỉ là **che mắt** trên UI, không thay thế tài khoản Supabase hay RLS.
- Khóa **anon** Supabase vẫn có thể bị lạm dụng nếu RLS không chặt; cấu hình policy trên Supabase là bắt buộc cho dữ liệu riêng tư.
- Không commit `.env.local` hoặc secret; dùng `.env.example` (không chứa giá trị thật) nếu muốn hướng dẫn teammate.

---

## Đồng bộ README với code

Khi bạn thêm/sửa **route** trong `App.jsx` hoặc gọi **Supabase** (bảng / storage bucket) trong `src/`, chạy:

```bash
npm run readme:sync
```

Script `scripts/sync-readme.mjs` cập nhật hai khối giữa comment `<!-- README_SYNC:… -->` trong README (bảng route + bảng Supabase). Phần **Chi tiết từng trang**, **Component toàn cục**, **Bảo mật**, v.v. vẫn do bạn chỉnh tay cho khớp mô tả nghiệp vụ.

---

## Script npm

| Script | Mô tả |
|--------|--------|
| `npm run dev` | Dev server Vite |
| `npm run build` | Build production |
| `npm run preview` | Xem bản build |
| `npm run lint` | ESLint |
| `npm run readme:sync` | Cập nhật bảng route & Supabase trong README từ source |
