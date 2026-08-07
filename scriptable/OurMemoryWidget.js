// Our Memory — Scriptable widget (2 avatar + ❤ + số ngày, nền trong suốt)
// 1) Scriptable → + → dán file này → Done → tên "Our Memory"
// 2) Bấm ▶ chạy thử (preview Medium)
// 3) Home Screen → Add Widget → Scriptable → Medium (hình chữ nhật) → chọn "Our Memory"

const INVITE_CODE = "TDVVRG6J";
const API_BASE = "https://our--memory.vercel.app";

const ACCENT = new Color("#7ca1d9");
const HEART = new Color("#e85a7a");
const WHITE = Color.white();

/** Small ≈ vuông; Medium/Large ≈ chữ nhật ngang trên iPhone */
function layoutForFamily(family) {
  const f = family || "medium";
  if (f === "small") {
    return {
      avatar: 58,
      pad: 8,
      gap: 6,
      heart: 15,
      days: 24,
      label: 10,
      name: 10,
      letter: 20,
      present: "small",
    };
  }
  if (f === "large") {
    return {
      avatar: 110,
      pad: 18,
      gap: 16,
      heart: 28,
      days: 48,
      label: 14,
      name: 13,
      letter: 36,
      present: "large",
    };
  }
  // medium — mặc định hình chữ nhật
  return {
    avatar: 96,
    pad: 14,
    gap: 12,
    heart: 22,
    days: 40,
    label: 13,
    name: 12,
    letter: 30,
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
  text.shadowColor = new Color("#000000", 0.55);
  text.shadowRadius = 3;
  text.shadowOffset = new Point(0, 1);
}

function addPersonColumn(parent, img, nickname, L) {
  const col = parent.addStack();
  col.layoutVertically();
  col.centerAlignContent();
  col.size = new Size(L.avatar + 8, L.avatar + L.name + 14);

  if (img) {
    const image = col.addImage(img);
    image.imageSize = new Size(L.avatar, L.avatar);
    image.cornerRadius = L.avatar / 2;
  } else {
    const circle = col.addStack();
    circle.size = new Size(L.avatar, L.avatar);
    circle.cornerRadius = L.avatar / 2;
    circle.backgroundColor = new Color("#e4e0ef", 0.92);
    circle.centerAlignContent();
    const letter = circle.addText(String(nickname || "?").trim().charAt(0).toUpperCase() || "?");
    letter.font = Font.blackSystemFont(L.letter);
    letter.textColor = ACCENT;
  }

  col.addSpacer(5);
  const name = col.addText(String(nickname || "").split(/\s+/)[0] || "");
  name.font = Font.boldSystemFont(L.name);
  name.textColor = WHITE;
  name.lineLimit = 1;
  name.centerAlignText();
  addSoftShadow(name);
}

function emptyWidget(message, isError, L) {
  const w = new ListWidget();
  w.backgroundColor = Color.clear();
  w.setPadding(L.pad, L.pad, L.pad, L.pad);
  const t = w.addText(message);
  t.font = Font.boldSystemFont(13);
  t.textColor = isError ? Color.red() : WHITE;
  addSoftShadow(t);
  return w;
}

async function createWidget(data, L) {
  const w = new ListWidget();
  w.backgroundColor = Color.clear();
  w.setPadding(L.pad, L.pad + 4, L.pad, L.pad + 4);
  w.url = `${API_BASE}/`;

  const row = w.addStack();
  row.layoutHorizontally();
  row.centerAlignContent();

  const img1 = await loadAvatar(data.user1?.avatarUrl);
  const img2 = await loadAvatar(data.user2?.avatarUrl);

  addPersonColumn(row, img1, data.user1?.nickname, L);
  row.addSpacer(L.gap);

  const mid = row.addStack();
  mid.layoutVertically();
  mid.centerAlignContent();

  const heart = mid.addText("❤");
  heart.font = Font.systemFont(L.heart);
  heart.textColor = HEART;
  heart.centerAlignText();
  addSoftShadow(heart);

  mid.addSpacer(4);
  const days = mid.addText(String(data.days ?? 0));
  days.font = Font.blackRoundedSystemFont(L.days);
  days.textColor = WHITE;
  days.centerAlignText();
  addSoftShadow(days);

  const label = mid.addText("ngày");
  label.font = Font.boldSystemFont(L.label);
  label.textColor = WHITE;
  label.centerAlignText();
  addSoftShadow(label);

  row.addSpacer(L.gap);
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
