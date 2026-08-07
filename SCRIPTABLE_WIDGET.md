# Widget iPhone bằng Scriptable (không cần Mac)

Hiển thị: **avatar user_1 | số ngày | avatar user_2**.

## Bạn cần làm 3 bước

### A. Supabase — chạy SQL một lần

Supabase → **SQL Editor** → chạy toàn bộ file:

[`scripts/sql_widget_by_invite.sql`](scripts/sql_widget_by_invite.sql)

### B. Deploy API (GitHub → Vercel)

Sau khi push, Vercel có endpoint:

`https://our--memory.vercel.app/api/widget?code=MÃ_MỜI`

Thử trên Safari iPhone: thay `MÃ_MỜI` bằng invite code thật → phải thấy JSON `ok: true`, `days`, `user1`, `user2`.

### C. Scriptable trên iPhone

1. App Store → tải **Scriptable**
2. Mở script mẫu trên máy tính: [`scriptable/OurMemoryWidget.js`](scriptable/OurMemoryWidget.js)  
   (hoặc mở file trên GitHub → raw → copy)
3. Đổi dòng:
   ```js
   const INVITE_CODE = "PASTE_INVITE_CODE_HERE";
   ```
   thành mã mời (trong app: **Cài đặt** → link dạng `/invite/XXXX` → lấy `XXXX`)
4. Scriptable → **+** → dán hết → tên script: `Our Memory` → Done
5. Bấm **▶** chạy thử → phải thấy preview widget
6. Home Screen → giữ chỗ trống → **Edit** → **Add Widget** → **Scriptable** → size **Small** → chọn script **Our Memory** → Done

## Refresh

Script đặt `refreshAfterDate` ~1 giờ. Muốn cập nhật ngay: mở Scriptable → chạy lại script, hoặc sửa ngày yêu trong app rồi đợi refresh.

Chạm widget → mở web Our Memory.

## Bảo mật

- Chỉ cần **mã mời** (ai có link mời cũng xem được snapshot widget — giống trang invite).
- API không trả email/password; chỉ nickname + avatar URL + số ngày.
- Không nhét `service_role` vào Scriptable.

## Lỗi thường gặp

| Hiện tượng | Cách xử lý |
|------------|------------|
| `not_found` | Sai mã mời / chưa tạo Space |
| `function get_widget_by_invite does not exist` | Chưa chạy SQL bước A |
| Avatar trống | Chưa upload avatar trong hồ sơ; widget hiện chữ cái |
| API 500 thiếu Supabase | Kiểm tra env Vercel `VITE_SUPABASE_URL` + anon/service key |
