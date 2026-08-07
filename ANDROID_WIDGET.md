# Android widget — easy path (like Scriptable)

KWGT **cannot** run a JS script like Scriptable on iOS. You would have to build the layout by hand.

So instead we ship a **ready widget page**. You only paste one URL — same idea as changing `INVITE_CODE` in Scriptable.

```text
https://our--memory.vercel.app/w/YOUR_INVITE_CODE
```

Example: invite link is `/invite/AB12CD` → open:

```text
https://our--memory.vercel.app/w/AB12CD
```

Same data as iOS: **avatar | days | avatar**.

> Still need [`scripts/sql_widget_by_invite.sql`](scripts/sql_widget_by_invite.sql) on Supabase if you have not run it.

---

## Steps (≈ 2 minutes)

### 1. Get your code
Our Memory → Settings → invite link → copy the part after `/invite/`.

### 2. Install a Web Widget app
Play Store → search **“Web Widget”** or **“Website Widget”** → install any simple one that shows a URL on the home screen.

Examples of what to look for (names vary by store/region):

- Web Widgets  
- Website Widget  
- Webpage Widget  

### 3. Add the widget
1. Long-press Home → **Widgets** → add that app’s widget  
2. Set **URL** to:
   ```text
   https://our--memory.vercel.app/w/YOUR_INVITE_CODE
   ```
3. Prefer a **small / 2×2** size  
4. Turn off zoom / show browser chrome if the app has those options (full-bleed page looks best)

### 4. Done
Open the URL once in Chrome first to confirm it shows avatars + days. Then the home widget will show the same page.

Tap the widget → opens Our Memory (link on the page).

---

## Refresh
Most Web Widget apps reload on an interval or when you tap refresh. If numbers look stale, open the widget settings → **Reload** / shorter refresh interval.

---

## vs KWGT / Scriptable

| | iOS Scriptable | Android (this guide) | KWGT |
|--|----------------|----------------------|------|
| Effort | Paste 1 script, set code | Paste 1 URL | Build every layer by hand |
| File | [`scriptable/OurMemoryWidget.js`](scriptable/OurMemoryWidget.js) | [`public/w.html`](public/w.html) | [KWGT_WIDGET.md](./KWGT_WIDGET.md) |
| API | `/api/widget?code=` | same | same |

Use KWGT only if you want heavy custom design. For “just show our days,” use this URL widget.
