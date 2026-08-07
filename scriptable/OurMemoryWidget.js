// Our Memory — Scriptable widget (2 avatar + ❤ + số ngày, nền trong suốt)
// 1) Đổi INVITE_CODE thành mã mời Space (Cài đặt → link mời, lấy đoạn sau /invite/)
// 2) Scriptable → + → dán file này → Done → đặt tên "Our Memory"
// 3) Bấm ▶ chạy thử
// 4) Home Screen → Add Widget → Scriptable → Small → chọn "Our Memory"

const INVITE_CODE = "PASTE_INVITE_CODE_HERE";
const API_BASE = "https://our--memory.vercel.app";

const ACCENT = new Color("#7ca1d9");
const HEART = new Color("#e85a7a");
const MUTED = new Color("#6b6570");
const INK = new Color("#1a1a1a");

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
  text.shadowColor = new Color("#ffffff", 0.85);
  text.shadowRadius = 2;
  text.shadowOffset = new Point(0, 0.5);
}

function addPersonColumn(parent, img, nickname) {
  const col = parent.addStack();
  col.layoutVertically();
  col.centerAlignContent();
  col.size = new Size(56, 72);

  if (img) {
    const image = col.addImage(img);
    image.imageSize = new Size(52, 52);
    image.cornerRadius = 26;
  } else {
    const circle = col.addStack();
    circle.size = new Size(52, 52);
    circle.cornerRadius = 26;
    circle.backgroundColor = new Color("#e4e0ef", 0.92);
    circle.centerAlignContent();
    const letter = circle.addText(String(nickname || "?").trim().charAt(0).toUpperCase() || "?");
    letter.font = Font.blackSystemFont(18);
    letter.textColor = ACCENT;
  }

  col.addSpacer(4);
  const name = col.addText(String(nickname || "").split(/\s+/)[0] || "");
  name.font = Font.boldSystemFont(9);
  name.textColor = MUTED;
  name.lineLimit = 1;
  name.centerAlignText();
  addSoftShadow(name);
}

function emptyWidget(message, isError) {
  const w = new ListWidget();
  w.backgroundColor = Color.clear();
  w.setPadding(12, 10, 12, 10);
  const t = w.addText(message);
  t.font = Font.boldSystemFont(12);
  t.textColor = isError ? Color.red() : INK;
  addSoftShadow(t);
  return w;
}

async function createWidget(data) {
  const w = new ListWidget();
  w.backgroundColor = Color.clear();
  w.setPadding(12, 10, 12, 10);
  w.url = `${API_BASE}/`;

  const row = w.addStack();
  row.layoutHorizontally();
  row.centerAlignContent();

  const img1 = await loadAvatar(data.user1?.avatarUrl);
  const img2 = await loadAvatar(data.user2?.avatarUrl);

  addPersonColumn(row, img1, data.user1?.nickname);
  row.addSpacer();

  const mid = row.addStack();
  mid.layoutVertically();
  mid.centerAlignContent();

  const heart = mid.addText("❤");
  heart.font = Font.systemFont(14);
  heart.textColor = HEART;
  heart.centerAlignText();
  addSoftShadow(heart);

  mid.addSpacer(2);
  const days = mid.addText(String(data.days ?? 0));
  days.font = Font.blackRoundedSystemFont(24);
  days.textColor = INK;
  days.centerAlignText();
  addSoftShadow(days);

  const label = mid.addText("ngày");
  label.font = Font.boldSystemFont(10);
  label.textColor = MUTED;
  label.centerAlignText();
  addSoftShadow(label);

  row.addSpacer();
  addPersonColumn(row, img2, data.user2?.nickname);

  w.refreshAfterDate = new Date(Date.now() + 60 * 60 * 1000);
  return w;
}

async function main() {
  const code = String(INVITE_CODE || "").trim().toUpperCase();
  if (!code || code === "PASTE_INVITE_CODE_HERE") {
    const w = emptyWidget("Sửa INVITE_CODE trong script", false);
    if (config.runsInWidget) Script.setWidget(w);
    else await w.presentSmall();
    Script.complete();
    return;
  }

  try {
    const data = await fetchSnapshot(code);
    const w = await createWidget(data);
    if (config.runsInWidget) Script.setWidget(w);
    else await w.presentSmall();
  } catch (e) {
    const w = emptyWidget(String(e.message || e), true);
    if (config.runsInWidget) Script.setWidget(w);
    else await w.presentSmall();
  }
}

await main();
Script.complete();
