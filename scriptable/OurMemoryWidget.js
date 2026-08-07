// Our Memory — Scriptable widget (2 avatar + ❤ + số ngày, nền trong suốt)
// 1) Scriptable → + → dán file này → Done → tên "Our Memory"
// 2) Bấm ▶ chạy thử (preview Medium)
// 3) Home Screen → Add Widget → Scriptable → Medium → chọn "Our Memory"
// 4) Chạm widget mở Safari. Đăng nhập 1 lần trên Safari → lần sau vào thẳng Space.

const INVITE_CODE = "TDVVRG6J";
const API_BASE = "https://our--memory.vercel.app";

const ACCENT = new Color("#7ca1d9");
const HEART = new Color("#e85a7a");
const WHITE = Color.white();
const RING = Color.white();

/** Small ≈ vuông; Medium/Large ≈ chữ nhật ngang trên iPhone */
function layoutForFamily(family) {
  const f = family || "medium";
  if (f === "small") {
    return {
      avatar: 62,
      border: 3,
      padV: 10,
      padH: 12,
      heart: 16,
      days: 26,
      label: 11,
      name: 11,
      letter: 22,
      midW: 64,
      present: "small",
    };
  }
  if (f === "large") {
    return {
      avatar: 120,
      border: 4,
      padV: 20,
      padH: 24,
      heart: 30,
      days: 52,
      label: 15,
      name: 14,
      letter: 40,
      midW: 120,
      present: "large",
    };
  }
  // medium — hình chữ nhật, layout kiểu Android (avatar hai mép, tim giữa)
  return {
    avatar: 108,
    border: 3,
    padV: 12,
    padH: 16,
    heart: 24,
    days: 42,
    label: 13,
    name: 12,
    letter: 34,
    midW: 88,
    present: "medium",
  };
}

async function fetchSnapshot(code) {
  const url = `${API_BASE}/api/widget?code=${encodeURIComponent(code)}`;
  const req = new Request(url);
  req.headers = { Accept: "application/json" };
  const res = await req.loadJSON();
  if (!res || !res.ok) {
    throw new Error((res && res.error) || "Không tải được dữ liệu");
  }
  return res;
}

async function loadAvatar(url) {
  if (!url) return null;
  try {
    return await new Request(url).loadImage();
  } catch (e) {
    return null;
  }
}

function addSoftShadow(text) {
  text.shadowColor = new Color("#000000", 0.6);
  text.shadowRadius = 3;
  text.shadowOffset = new Point(0, 1);
}

/** Avatar tròn + viền trắng; tên canh giữa dưới ảnh */
function addPersonColumn(parent, img, nickname, L) {
  const outer = L.avatar + L.border * 2;
  const colW = Math.max(outer + 4, 78);

  const col = parent.addStack();
  col.layoutVertically();
  col.centerAlignContent();
  col.size = new Size(colW, outer + L.name + 14);

  // Viền trắng bao quanh ảnh
  const frame = col.addStack();
  frame.size = new Size(outer, outer);
  frame.cornerRadius = outer / 2;
  frame.backgroundColor = RING;
  frame.layoutHorizontally();
  frame.centerAlignContent();

  if (img) {
    const image = frame.addImage(img);
    image.imageSize = new Size(L.avatar, L.avatar);
    image.cornerRadius = L.avatar / 2;
    image.applyFillingContentMode();
  } else {
    const circle = frame.addStack();
    circle.size = new Size(L.avatar, L.avatar);
    circle.cornerRadius = L.avatar / 2;
    circle.backgroundColor = new Color("#e4e0ef");
    circle.layoutHorizontally();
    circle.centerAlignContent();
    const letter = circle.addText(String(nickname || "?").trim().charAt(0).toUpperCase() || "?");
    letter.font = Font.blackSystemFont(L.letter);
    letter.textColor = ACCENT;
    letter.centerAlignText();
  }

  col.addSpacer(6);

  // Tên: stack ngang + spacer hai bên → luôn giữa dưới avatar
  const nameRow = col.addStack();
  nameRow.layoutHorizontally();
  nameRow.centerAlignContent();
  nameRow.size = new Size(colW, L.name + 6);
  nameRow.addSpacer();
  const name = nameRow.addText(String(nickname || "").split(/\s+/)[0] || "");
  name.font = Font.boldSystemFont(L.name);
  name.textColor = WHITE;
  name.lineLimit = 1;
  name.centerAlignText();
  addSoftShadow(name);
  nameRow.addSpacer();
}

function emptyWidget(message, isError, L) {
  const w = new ListWidget();
  w.backgroundColor = new Color("#000000", 0);
  w.setPadding(L.padV, L.padH, L.padV, L.padH);
  const t = w.addText(message);
  t.font = Font.boldSystemFont(13);
  t.textColor = isError ? Color.red() : WHITE;
  addSoftShadow(t);
  return w;
}

async function createWidget(data, L) {
  const w = new ListWidget();
  w.backgroundColor = new Color("#000000", 0);
  w.setPadding(L.padV, L.padH, L.padV, L.padH);
  // Mở Safari (không mở được PWA Add to Home). User đăng nhập 1 lần trên Safari là đủ.
  w.url = `${API_BASE}/`;

  const row = w.addStack();
  row.layoutHorizontally();
  row.centerAlignContent();

  const img1 = await loadAvatar(data.user1?.avatarUrl);
  const img2 = await loadAvatar(data.user2?.avatarUrl);

  // space-between: avatar trái | spacer linh hoạt | tim+ngày | spacer | avatar phải
  addPersonColumn(row, img1, data.user1?.nickname, L);

  row.addSpacer();

  const mid = row.addStack();
  mid.layoutVertically();
  mid.centerAlignContent();
  mid.size = new Size(L.midW, L.avatar + L.border * 2 + L.name + 8);

  mid.addSpacer();
  const heart = mid.addText("❤");
  heart.font = Font.systemFont(L.heart);
  heart.textColor = HEART;
  heart.centerAlignText();
  addSoftShadow(heart);

  mid.addSpacer(2);
  const days = mid.addText(String(data.days ?? 0));
  days.font = Font.blackRoundedSystemFont(L.days);
  days.textColor = WHITE;
  days.centerAlignText();
  days.minimumScaleFactor = 0.6;
  addSoftShadow(days);

  const label = mid.addText("ngày");
  label.font = Font.boldSystemFont(L.label);
  label.textColor = WHITE;
  label.centerAlignText();
  addSoftShadow(label);
  mid.addSpacer();

  row.addSpacer();

  addPersonColumn(row, img2, data.user2?.nickname, L);

  w.refreshAfterDate = new Date(Date.now() + 60 * 60 * 1000);
  return w;
}

async function present(w, presentSize) {
  if (config.runsInWidget) {
    Script.setWidget(w);
    return;
  }
  if (presentSize === "large") await w.presentLarge();
  else if (presentSize === "small") await w.presentSmall();
  else await w.presentMedium();
}

async function main() {
  const family = config.widgetFamily || "medium";
  const L = layoutForFamily(family);

  const code = String(INVITE_CODE || "").trim().toUpperCase();
  if (!code || code === "PASTE_INVITE_CODE_HERE") {
    await present(emptyWidget("Sửa INVITE_CODE trong script", false, L), L.present);
    Script.complete();
    return;
  }

  try {
    const data = await fetchSnapshot(code);
    const w = await createWidget(data, L);
    await present(w, L.present);
  } catch (e) {
    await present(emptyWidget(String(e.message || e), true, L), L.present);
  }
}

await main();
Script.complete();
