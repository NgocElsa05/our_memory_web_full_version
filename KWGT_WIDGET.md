# Widget Android bằng KWGT (cùng API Our Memory)

Hiển thị: **avatar 1 | số ngày | avatar 2** — cùng data với Scriptable iOS.

API: `https://our--memory.vercel.app/api/widget?code=MÃ_MỜI`

> Trước tiên vẫn cần chạy SQL [`scripts/sql_widget_by_invite.sql`](scripts/sql_widget_by_invite.sql) trên Supabase (nếu chưa chạy).

---

## 0. Chuẩn bị

1. Play Store → cài **KWGT** (Kustom Widget Maker)  
2. Nên cài thêm **KWGT Pro** (mở khóa lưu / công thức đầy đủ — bản free hay bị khóa)  
3. Lấy **mã mời** trong app Our Memory: Cài đặt → link `/invite/XXXX` → lấy `XXXX`  
4. Thử trên Chrome điện thoại:
   ```text
   https://our--memory.vercel.app/api/widget?code=XXXX
   ```
   Phải thấy JSON có `"ok":true`, `"days"`, `"user1"`, `"user2"`.

---

## 1. Thêm widget trống lên màn hình

1. Giữ Home Screen → **Widgets** → kéo **KWGT** (ô 2×2 hoặc tương đương Small) ra màn hình  
2. Chạm widget → **KWGT** mở editor (hoặc “Create new”)

---

## 2. Tạo layer nền

1. Trong editor → **Items** → **+** → **Shape**  
2. Shape = Rectangle, bo góc (~24–32)  
3. Paint → màu nền mềm, ví dụ `#F8F5FA`  
4. Size: khớp widget (hoặc `100%` / `100%`)

---

## 3. Công thức lấy data (Globals — tiện sửa 1 chỗ)

**Items → + → Globals** (hoặc Layer → Globals):

| Tên biến | Formula / Value |
|----------|-----------------|
| `code` | `XXXX` (mã mời, viết hoa cũng được) |
| `api` | `https://our--memory.vercel.app/api/widget?code=$gv(code)$` |
| `raw` | `$wg(gv(api), json)$` |
| `days` | `$tc(json, gv(raw), days)$` |
| `a1` | `$tc(json, gv(raw), user1.avatarUrl)$` |
| `a2` | `$tc(json, gv(raw), user2.avatarUrl)$` |
| `n1` | `$tc(json, gv(raw), user1.nickname)$` |
| `n2` | `$tc(json, gv(raw), user2.nickname)$` |

Nếu editor không có Globals riêng: gắn thẳng formula vào từng layer (thay `gv(...)` bằng chuỗi/`wg` trực tiếp).

**Lưu ý cú pháp KWGT** (tùy bản):

- Web JSON: `$wg("URL", json)$`  
- Đọc field: `$tc(json, wg("URL", json), days)$`  

Ví dụ số ngày **không dùng Globals**:

```text
$tc(json, wg("https://our--memory.vercel.app/api/widget?code=XXXX", json), days)$
```

Avatar 1:

```text
$tc(json, wg("https://our--memory.vercel.app/api/widget?code=XXXX", json), user1.avatarUrl)$
```

---

## 4. Layout 3 cột

**Items → + → Stack / Overlap** hoặc đặt 3 layer cạnh nhau:

### Trái — Avatar user 1
1. **+ → Bitmap** (hoặc Image)  
2. FX / Bitmap → **Bitmap URL** (hoặc formula):
   ```text
   $tc(json, wg("https://our--memory.vercel.app/api/widget?code=XXXX", json), user1.avatarUrl)$
   ```
3. Shape mask: **Circle** (hoặc Corner radius 50%)  
4. Size ~ `52dp` × `52dp`  
5. Bên dưới (optional): **Text** nickname  
   ```text
   $tc(json, wg("https://our--memory.vercel.app/api/widget?code=XXXX", json), user1.nickname)$
   ```
   Font nhỏ, căn giữa

### Giữa — Số ngày
1. **+ → Text**  
2. Content:
   ```text
   $tc(json, wg("https://our--memory.vercel.app/api/widget?code=XXXX", json), days)$
   ```
3. Font đậm, size lớn (~26–32)  
4. Thêm Text thứ hai: chữ `ngày` (cố định), size nhỏ, màu xám

### Phải — Avatar user 2
Giống trái, đổi path thành `user2.avatarUrl` / `user2.nickname`.

---

## 5. Chạm widget mở app web

Root layer / Stack → **Touch** → **Open URL**:

```text
https://our--memory.vercel.app/
```

---

## 6. Lưu & gắn

1. **Save** preset (đặt tên `Our Memory`)  
2. Về Home → chạm widget KWGT đang trống → chọn preset vừa lưu  
3. Nếu avatar chưa hiện: đợi vài giây (KWGT cache mạng), hoặc trong editor bấm refresh / tạm tắt–bật Wi‑Fi

---

## 7. Cập nhật thường xuyên

KWGT Settings (trong app) → cập nhật widget / background update:

- Cho phép chạy nền (tùy máy Xiaomi/OPPO/Vivo hay bị kill — xem [dontkillmyapp.com](https://dontkillmyapp.com))  
- Interval hợp lý: 30–60 phút  

Đổi ngày yêu / avatar trong Our Memory → widget sẽ lấy số mới ở lần `wg` tiếp theo.

---

## Lỗi thường gặp

| Hiện tượng | Cách xử lý |
|------------|------------|
| Text trống / `$tc...$` hiện nguyên | Sai cú pháp hoặc thiếu KWGT Pro; thử formula mẫu từng field |
| `not_found` trong JSON | Sai mã mời |
| Function SQL thiếu | Chưa chạy `sql_widget_by_invite.sql` |
| Avatar không load | URL rỗng (chưa có ảnh hồ sơ) hoặc máy chặn HTTP ảnh — kiểm tra JSON `avatarUrl` |
| Widget không tự cập nhật | Bật unrestricted battery cho KWGT |

---

## iOS vs Android

| | iOS | Android |
|--|-----|---------|
| App | **Scriptable** | **KWGT** |
| Script/preset | [`scriptable/OurMemoryWidget.js`](scriptable/OurMemoryWidget.js) | Làm trong editor (hướng dẫn này) |
| API | Giống nhau `/api/widget?code=` | Giống nhau |

Hướng dẫn iOS: [SCRIPTABLE_WIDGET.md](./SCRIPTABLE_WIDGET.md)
