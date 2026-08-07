# KWGT Android widget (advanced / optional)

> **Want it easy like Scriptable?** Use the URL widget instead — 1 link, no layer editing:  
> **[ANDROID_WIDGET.md](./ANDROID_WIDGET.md)** → `https://our--memory.vercel.app/w/YOUR_CODE`

KWGT has **no JavaScript runtime**. You cannot paste one script that builds the whole widget. This file is only if you still want a native KWGT layout.

API: `https://our--memory.vercel.app/api/widget?code=YOUR_CODE`

> Run [`scripts/sql_widget_by_invite.sql`](scripts/sql_widget_by_invite.sql) on Supabase first (if you haven’t).

**Tip:** Labels below match the **English UI** in KWGT. Tap the formula field → switch to **Formula** (ƒx) when you see a lock / plain text toggle.

---

## 0. Prep

1. Play Store → install **KWGT** (Kustom Widget Maker)  
2. Also install **KWGT Pro** if free version locks **Save** / formulas  
3. In Our Memory: get invite code from `/invite/XXXX` → use `XXXX`  
4. Open in Chrome to test:
   ```text
   https://our--memory.vercel.app/api/widget?code=XXXX
   ```
   You should see `"ok":true`, `"days"`, `"user1"`, `"user2"`.

Replace every `XXXX` below with your real code.

---

## 1. Put an empty KWGT on the home screen

1. Long-press Home → **Widgets**  
2. Find **KWGT** → drag a size (e.g. **2×2**) onto the home screen  
3. Tap the empty widget → opens KWGT → **Create** / pick a blank preset → opens the **Editor**

---

## 2. Background

1. Bottom bar: **Items** → **+** (Add) → **Shape**  
2. Open the Shape item → tab **Layer**  
   - **Shape** → **Rectangle**  
3. Tab **Paint**  
   - **Color** → e.g. `#F8F5FA`  
4. Tab **Position** / size  
   - Width / Height → `100%` (or fill the widget)  
5. Tab **Layer** again (optional)  
   - **Corner Radius** → `24`–`32`

---

## 3. Best formulas (copy-paste)

KWGT can parse JSON in one step with **`wg`**:

| What | Formula |
|------|---------|
| Days | `$wg("https://our--memory.vercel.app/api/widget?code=XXXX", json, .days)$` |
| Avatar 1 URL | `$wg("https://our--memory.vercel.app/api/widget?code=XXXX", json, .user1.avatarUrl)$` |
| Avatar 2 URL | `$wg("https://our--memory.vercel.app/api/widget?code=XXXX", json, .user2.avatarUrl)$` |
| Nickname 1 | `$wg("https://our--memory.vercel.app/api/widget?code=XXXX", json, .user1.nickname)$` |
| Nickname 2 | `$wg("https://our--memory.vercel.app/api/widget?code=XXXX", json, .user2.nickname)$` |

Tap the value field → choose **Formula** (not plain text) → paste.

---

## 4. Layout: left avatar | days | right avatar

### A) Left avatar (user 1)

1. **Items** → **+** → **Image**  
2. Open that **Image** → tab **Bitmap** (or property **Bitmap**)  
3. Tap **Bitmap** → switch mode to **Formula** → paste:
   ```text
   $wg("https://our--memory.vercel.app/api/widget?code=XXXX", json, .user1.avatarUrl)$
   ```
4. Still on **Image**:
   - **Layer** → **Mask** / shape → **Circle** (or high **Corner Radius**)  
   - Size ≈ `52` × `52`  
   - Place on the **left**
5. (Optional) **Items** → **+** → **Text** under the avatar  
   - Tab **Text** → **Content** → **Formula**:
     ```text
     $wg("https://our--memory.vercel.app/api/widget?code=XXXX", json, .user1.nickname)$
     ```
   - **Paint** → smaller font, center align

### B) Center — days

1. **Items** → **+** → **Text**  
2. Tab **Text** → **Content** → **Formula**:
   ```text
   $wg("https://our--memory.vercel.app/api/widget?code=XXXX", json, .days)$
   ```
3. **Paint** → bold, large (~`26`–`32`)  
4. Another **Text** under it with fixed content: `days` (plain text, not Formula)

### C) Right avatar (user 2)

Same as left, but formulas use:

```text
.user2.avatarUrl
.user2.nickname
```

---

## 5. Optional: Globals (edit code in one place)

On the **root** item (top of the layer tree):

1. Open **Root** → tab **Globals**  
2. **+** → type **Text** → name e.g. `code` → value `XXXX`  
3. Then formulas become:

```text
$wg("https://our--memory.vercel.app/api/widget?code=" + gv(code), json, .days)$
```

(If `+` concat fails on your build, keep the full URL with `XXXX` hard-coded — simpler.)

---

## 6. Tap widget → open Our Memory

1. Select **Root** (or the background **Shape**)  
2. Tab **Touch**  
3. **+** → **Touch action** → **Open URL**  
4. URL:
   ```text
   https://our--memory.vercel.app/
   ```

---

## 7. Save & assign

1. Top of Editor → **Save** / floppy icon → name preset `Our Memory`  
2. Back to Home → tap the empty KWGT widget → pick **Our Memory**  
3. If avatars blank: wait a few seconds, or in Editor use refresh / **Touch** → **Kustom Action** → **Force RSS/Text/Web Update**

---

## 8. Auto refresh

In the **KWGT** app:

1. Open **Settings** (gear)  
2. Check **Update** / background refresh options  
3. On phone **Settings** → **Apps** → **KWGT** → **Battery** → **Unrestricted** (Xiaomi / Oppo / Vivo often kill background apps — see [dontkillmyapp.com](https://dontkillmyapp.com))

Reasonable interval: every 30–60 minutes.

---

## Common issues

| Symptom | Fix |
|---------|-----|
| Formula shows as raw `$wg...$` | Field is still **Text**, not **Formula** (ƒx) |
| Empty / locked Save | Need **KWGT Pro** |
| JSON `not_found` | Wrong invite code |
| SQL / function error | Run `sql_widget_by_invite.sql` on Supabase |
| No avatar | `avatarUrl` empty in JSON — set profile photo in app |
| Never updates | Battery unrestricted + Force Web Update once |

---

## iOS vs Android

| | iOS | Android easy | Android KWGT |
|--|-----|--------------|--------------|
| App | **Scriptable** | **Web Widget** + URL | **KWGT** |
| Setup | [SCRIPTABLE_WIDGET.md](./SCRIPTABLE_WIDGET.md) | [ANDROID_WIDGET.md](./ANDROID_WIDGET.md) | This guide |
| API | `/api/widget?code=` | same | same |
