// Our Memory — Scriptable widget (2 avatar + số ngày giữa)
// 1) Đổi INVITE_CODE thành mã mời Space (Cài đặt → link mời, lấy đoạn sau /invite/)
// 2) Scriptable → + → dán file này → Done → đặt tên "Our Memory"
// 3) Bấm ▶ chạy thử
// 4) Home Screen → Add Widget → Scriptable → Small → chọn "Our Memory"

const INVITE_CODE = "PASTE_INVITE_CODE_HERE";
const API_BASE = "https://our--memory.vercel.app";

const WIDGET_BG = new Color("#f8f5fa");
const ACCENT = new Color("#7ca1d9");
const MUTED = new Color("#8a8790");

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
    circle.backgroundColor = new Color("#e4e0ef");
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
}

async function createWidget(data) {
  const w = new ListWidget();
  w.backgroundColor = WIDGET_BG;
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
  const days = mid.addText(String(data.days ?? 0));
  days.font = Font.blackRoundedSystemFont(26);
  days.textColor = Color.black();
  days.centerAlignText();
  const label = mid.addText("ngày");
  label.font = Font.boldSystemFont(10);
  label.textColor = MUTED;
  label.centerAlignText();

  row.addSpacer();
  addPersonColumn(row, img2, data.user2?.nickname);

  w.refreshAfterDate = new Date(Date.now() + 60 * 60 * 1000);
  return w;
}

async function main() {
  const code = String(INVITE_CODE || "").trim().toUpperCase();
  if (!code || code === "PASTE_INVITE_CODE_HERE") {
    const w = new ListWidget();
    w.backgroundColor = WIDGET_BG;
    const t = w.addText("Sửa INVITE_CODE trong script");
    t.font = Font.boldSystemFont(12);
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
    const w = new ListWidget();
    w.backgroundColor = WIDGET_BG;
    const t = w.addText("Our Memory");
    t.font = Font.boldSystemFont(12);
    w.addSpacer(6);
    const err = w.addText(String(e.message || e));
    err.font = Font.systemFont(11);
    err.textColor = Color.red();
    if (config.runsInWidget) Script.setWidget(w);
    else await w.presentSmall();
  }
}

await main();
Script.complete();
