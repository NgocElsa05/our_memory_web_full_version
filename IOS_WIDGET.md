# Our Memory — iOS Widget (Capacitor + WidgetKit)

> **Không có Mac?** Dùng Scriptable thay thế: [SCRIPTABLE_WIDGET.md](./SCRIPTABLE_WIDGET.md)

Widget Home Screen: **2 avatar + số ngày yêu ở giữa**.

> Máy Windows chỉ chuẩn bị code. **Build & cài lên iPhone cần Mac + Xcode + Apple Developer.**

## Kiến trúc nhanh

1. App Capacitor (web Vite trong WebView) khi đã vào Space → JS gọi `CoupleWidget.sync(...)`
2. Plugin Swift ghi snapshot + cache ảnh vào App Group `group.com.ourmemory.app`
3. Widget Extension đọc App Group → vẽ UI → tap mở `ourmemory://home`

File mẫu Swift: [`native/ios-widget/`](native/ios-widget/)

| File | Target |
|------|--------|
| `CoupleWidgetPlugin.swift` | **App** |
| `CoupleWidgetReloader.swift` | **App** (optional) |
| `WidgetDataStore.swift` | **App + Widget** (shared) |
| `OurMemoryWidget.swift` | **Widget** |
| `OurMemoryWidgetBundle.swift` | **Widget** (`@main`) |

## 1. Trên Mac — tạo project iOS

```bash
cd our_memory_web_full_version
npm install
npm run build
npx cap add ios
npx cap sync ios
npx cap open ios
```

Mở `ios/App/App.xcworkspace` (không mở `.xcodeproj` đơn).

## 2. Signing & App Group

1. Xcode → target **App** → Signing & Capabilities  
   - Team: Apple Developer của bạn  
   - Bundle ID: `com.ourmemory.app`  
2. **+ Capability → App Groups** → thêm `group.com.ourmemory.app`  
3. File → New → Target → **Widget Extension**  
   - Product Name: `OurMemoryWidget`  
   - Include Configuration Intent: **không** (Static)  
   - Embed in application: App  
4. Target Widget → Signing → cùng Team  
5. Widget → **+ App Groups** → cùng `group.com.ourmemory.app`

## 3. Copy Swift vào Xcode

1. Kéo `CoupleWidgetPlugin.swift` (+ optional Reloader) vào group **App/App** (target **App** checked)  
2. Kéo `WidgetDataStore.swift` vào project — check **cả App và OurMemoryWidget**  
3. Xóa file widget template Xcode tạo sẵn; kéo `OurMemoryWidget.swift` + `OurMemoryWidgetBundle.swift` vào target **OurMemoryWidget**  
4. Đảm bảo Widget target không còn `@main` trùng (chỉ `OurMemoryWidgetBundle`)

Capacitor 8 tự discover plugin nếu class `CoupleWidgetPlugin` nằm trong App target và conform `CAPBridgedPlugin`.

## 4. Deep link `ourmemory://`

Target **App** → Info → URL Types:

- Identifier: `ourmemory`
- URL Schemes: `ourmemory`

Widget đã set `.widgetURL(URL(string: "ourmemory://home"))`.

## 5. Build lên iPhone

1. Cắm iPhone, Trust máy  
2. Xcode chọn device → Run (▶) target **App**  
3. Lần đầu: Settings → General → VPN & Device Management → Trust developer  
4. Mở app → đăng nhập Space (để JS sync avatar + ngày)  
5. Home Screen → giữ chỗ trống → **Edit** → **Add Widget** → **Our Memory**

## 6. Sync lại web → native sau khi sửa frontend

```bash
npm run cap:ios
# hoặc
npm run build && npx cap sync ios
```

Rồi Run lại từ Xcode.

## 7. Test checklist

- [ ] App chạy trên iPhone (không chỉ Simulator nếu muốn widget thật)  
- [ ] Vào Home trong app → xem console không lỗi `[CoupleWidget]`  
- [ ] Widget hiện 2 avatar (hoặc chữ cái nếu chưa có ảnh) + số ngày giữa  
- [ ] Qua ngày hôm sau (hoặc đổi `together_since`) → mở app 1 lần → widget cập nhật  
- [ ] Chạm widget → mở app  

## 8. TestFlight (sau khi ổn)

1. Xcode → Product → Archive  
2. Distribute → App Store Connect / TestFlight  
3. Thêm tester nội bộ → cài qua TestFlight → thêm widget như trên  

## Lưu ý

- Widget **không** gọi Supabase trực tiếp; cần mở app ít nhất một lần sau khi đổi avatar/ngày.  
- PWA “Add to Home Screen” từ Safari **không** có widget này — phải cài bản Capacitor.  
- Low Power Mode / hạn chế background không chặn widget đã trên Home; chỉ ảnh hưởng tần suất refresh timeline.
