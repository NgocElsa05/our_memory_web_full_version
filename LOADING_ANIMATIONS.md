# Loading & thông báo — Our Memory

## Concept (overview)

App như **hai người bay vào một không gian riêng tư chỉ của đôi mình**.  
Copy loading / thông báo nên dịu, gần gũi — không lạnh kiểu “Loading…”, mà như thì thầm: *đợi tí nhé, mình sắp bước vào thế giới của hai đứa rồi*.


|                     |                                                                                              |
| ------------------- | -------------------------------------------------------------------------------------------- |
| **Tone**            | Ấm, riêng tư, nhẹ nhàng — như người yêu nói với nhau                                         |
| **Animation (tạm)** | Chỉ hiện **chữ load / dòng text** — chưa làm motion fancy. Sẽ bổ sung sau khi bạn chốt copy. |
| **Bạn chỉnh sau**   | Sửa thẳng cột **Text đề xuất** ở dưới, rồi báo lại để implement.                             |


---

## 1. Full-screen — đang mở cánh cửa vào Space


| ID    | Khi nào                                     | Text hiện tại                         | Text đề xuất                                   | Animation (tạm)                  |
| ----- | ------------------------------------------- | ------------------------------------- | ---------------------------------------------- | -------------------------------- |
| FS-01 | Welcome/login đang kiểm tra session         | Đang tải…                             | Tình yêu đợi tí nhé…                           | Hiện chữ                         |
| FS-02 | Vào trang cần đăng nhập, đang nhận diện bạn | Đang tải…                             | Tình yêu đợi tí nhé…                           | Hiện chữ                         |
| FS-03 | Đang tải Space / bước onboarding            | Đang tải…                             | Đang mở cửa không gian của hai mình…           | Hiện chữ                         |
| FS-04 | AuthContext `loading` (không UI riêng)      | —                                     | *(dùng chung FS-01/02)*                        | —                                |
| FS-05 | SpaceContext `loading` (không UI riêng)     | —                                     | *(dùng chung FS-01/03)*                        | —                                |
| FS-06 | Google OAuth đang xử lý                     | Đang đăng nhập bằng Google…           | Tình yêu đợi tí nhé…                           | Hiện chữ                         |
| FS-07 | Đăng nhập xong, chuẩn bị vào Space          | Đăng nhập thành công, đang vào Space… | Xong rồi, đang bay vào Space của hai đứa mình… | Hiện chữ                         |
| FS-08 | OAuth lỗi                                   | *(message động)*                      | Ồ, cửa chưa mở được… thử lại giúp mình nhé.    | Hiện chữ (lỗi, không “đang tải”) |


**File chính:** `App.jsx` (`LoadingScreen`), `AuthCallback.jsx`, context Auth/Space.

---

## 2. Auth / onboarding — dựng tổ ấm từng bước


| ID    | Khi nào                        | Text hiện tại                  | Text đề xuất                           | Animation (tạm)   |
| ----- | ------------------------------ | ------------------------------ | -------------------------------------- | ----------------- |
| AO-01 | Đăng nhập email                | Đang vào…                      | Đang vào…                              | Hiện chữ trên nút |
| AO-02 | Login bằng Google              | *(nút disable, không đổi chữ)* | *(nút disable, không đổi chữ)*         |                   |
| AO-03 | Tạo tài khoản                  | Đang tạo…                      | Đang chuẩn bị chìa khóa…               | Hiện chữ trên nút |
| AO-04 | Signup bằng Google             | *(nút disable)*                | *(nút disable)*                        |                   |
| AO-05 | Đang đọc lời mời / fetch Space | Đang tải…                      | Đang tìm lời mời của người ấy…         | Hiện chữ          |
| AO-06 | Đang join Space                | Đang tham gia…                 | Đang bước vào nhà với người ấy…        | Hiện chữ trên nút |
| AO-07 | Tạo Space mới                  | Đang tạo…                      | Đang dựng tổ ấm của hai đứa mình…      | Hiện chữ trên nút |
| AO-08 | Lưu ngày đặc biệt              | Đang lưu…                      | Đang khắc những ngày của hai đứa mình… | Hiện chữ trên nút |
| AO-09 | Lưu theme màu                  | Đang lưu…                      | Đang tô màu thế giới riêng…            | Hiện chữ trên nút |
| AO-10 | Lưu hồ sơ / avatar             | Đang lưu…                      | Đang ghi tên bạn vào căn nhà này…      | Hiện chữ trên nút |
| AO-11 | SpacePreview chờ data          | Đang tải…                      | Đang mở cửa…                           | Hiện chữ          |


**File chính:** Login, Signup, Invite, CreateSpace, Dates, ThemePicker, CreateProfile, SpacePreview.

---

## 3. Settings — chỉnh nhà nhỏ / nguy hiểm


| ID    | Khi nào                          | Text hiện tại                       | Text đề xuất                                  | Animation (tạm)         |
| ----- | -------------------------------- | ----------------------------------- | --------------------------------------------- | ----------------------- |
| IN-01 | Đang lưu theme / thông tin Space | Đang lưu…                           | Đang xếp lại góc nhỏ của hai đứa mình…        | Hiện chữ trên nút       |
| IN-02 | Lưu thành công                   | Đã lưu thay đổi.                    | Nhà nhỏ đã được lưu lại rồi.                  | Hiện chữ (toast/banner) |
| IN-03 | Đang bật Web Push                | Đang bật…                           | Đang mở chuông thông báo cho nhau…            | Hiện chữ trên nút       |
| IN-04 | Bật push OK                      | Đã bật thông báo trên thiết bị này. | Chuông đã mở, người ấy nhắn là bạn biết ngay. | Hiện chữ                |
| IN-05 | Bật push lỗi                     | *(lỗi)*                             | Chuông chưa mở được… thử lại sau nhé.         | Hiện chữ (lỗi)          |
| IN-06 | Đang rời Space                   | Đang rời…                           | Đang khép cửa lại…                            | Hiện chữ                |
| IN-07 | Đang xóa Space                   | Đang xóa…                           | Đang xóa thế giới này…                        | Hiện chữ                |


**File chính:** `Settings.jsx`.

---

## 4. Mailbox — gửi yêu thương qua lại

> Hiện đa số chỉ `alert` / chưa có loading. Spec dưới đây để sau này làm nút busy + toast.


| ID    | Khi nào                   | Text / UI hiện tại         | Text đề xuất                            | Animation (tạm)       |
| ----- | ------------------------- | -------------------------- | --------------------------------------- | --------------------- |
| MB-01 | Đang gửi thư              | *(chưa có)*                | Tim đang bay tới người ấy…              | Dưới dòng text: lá thư bay vào hộp thư (envelope → mailbox). Nút gửi disable lúc gửi. |
| MB-02 | Gửi thành công            | alert “Đã gửi yêu thương…” | Đã gửi yêu thương vào hộp thư người ấy. | Hiện chữ (toast)      |
| MB-03 | Gửi lỗi / chưa đủ 2 người | alert                      | Thư chưa cất cánh được… thử lại nhé.    | Hiện chữ (lỗi)        |
| MB-04 | Đang tải danh sách thư    | *(chưa có)*                | Đang mở hộp thư của hai mình…           | Hiện chữ              |
| MB-05 | Confirm xóa thư           | `confirm` hiện tại         | Giữ lại hay xóa lá thư này đi?          | Hiện chữ (dialog)     |
| MB-06 | Đang xóa thư              | *(chưa có)*                | Đang cất lá thư ấy đi…                  | Hiện chữ              |
| MB-07 | Push nền sau khi gửi      | silent                     | *(không hiện UI)*                       | —                     |


**File chính:** `Mailbox.jsx`, `useLoveLetters.js`.

---

## 5. Gallery / Discovery / khác


| ID    | Khi nào                    | Text hiện tại         | Text đề xuất                  | Animation (tạm)          |
| ----- | -------------------------- | --------------------- | ----------------------------- | ------------------------ |
| AP-01 | Upload ảnh Gallery (nhiều ảnh — chờ lâu) | Spinner không chữ | Đang treo kỷ niệm lên tường… | Overlay: khung thẻ theo theme — thẻ nhỏ bay vào thẻ chính (bỏ cục bông). Dưới là dòng text. |
| AP-02 | Upload mood Discovery      | Spinner nhỏ           | Đang ghi lại cảm xúc hôm nay… | Hiện chữ                 |
| AP-03 | Upload overlay Discovery   | Spinner lớn           | Tình yêu đợi tí nhé…          | Hiện chữ                 |
| AP-04 | Load biệt danh             | Đang tải biệt danh…   | Đang gọi tên nhau…            | Hiện chữ                 |
| AP-05 | Home — tựa nhạc chưa sẵn   | Đang tải giai điệu... | Đang tải giai điệu chung...   | Hiện chữ                 |
| AP-06 | MusicPlayer fallback title | Đang tải...           | Đang tìm giai điệu…           | Hiện chữ                 |


---

## 6. Style chung (placeholder — bạn chốt sau)


| Mục            | Đề xuất tạm                                                            |
| -------------- | ---------------------------------------------------------------------- |
| Màu chữ load   | Theo theme Space trong app; auth/onboarding: xám trung tính            |
| Mascot / icon  | Tim hồng — **chưa animate**, chỉ chữ trước                             |
| Fullscreen nền | Như trang hiện tại (`om-bg-page` / tint nhạt)                          |
| Lặp chữ        | Có thể thêm `…` nhịp sau; giai đoạn này **static text**                |
| Sound          | Không                                                                  |
| Ghi chú        | Bạn sửa bất kỳ dòng **Text đề xuất** rồi báo ID (vd. `MB-01`, `FS-07`) |


---

## 7. Checklist implement

- [x] Duyệt / chỉnh copy trong file này
- [x] Tạo `CuteLoader` (fullscreen + inline chữ)
- [x] Gắn FS-* → `App.jsx` / AuthCallback
- [x] Gắn AO-* → auth & onboarding
- [x] Gắn IN-* → Settings
- [x] Gắn MB-* → Mailbox (thêm state gửi/tải + letter flight)
- [x] Gắn AP-* → Gallery fluff overlay / Discovery / nhạc
- [ ] Animation polish thêm (nếu muốn) — sau khi bạn feedback