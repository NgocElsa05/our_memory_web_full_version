/**
 * Cập nhật các khối đánh dấu trong README.md từ source thực tế:
 * - ROUTES: <Route path="..." element={<Name />} /> trong src/App.jsx
 * - SUPABASE: supabase.from('table') + supabase.storage … .from('bucket')
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const README = path.join(ROOT, 'README.md');
const APP = path.join(ROOT, 'src', 'App.jsx');
const SRC = path.join(ROOT, 'src');

const MARK = {
  routes: ['<!-- README_SYNC:ROUTES_START -->', '<!-- README_SYNC:ROUTES_END -->'],
  supabase: ['<!-- README_SYNC:SUPABASE_START -->', '<!-- README_SYNC:SUPABASE_END -->'],
};

function walkJsxFiles(dir, acc = []) {
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, name.name);
    if (name.isDirectory()) walkJsxFiles(p, acc);
    else if (name.isFile() && /\.(jsx|tsx|js|ts)$/.test(name.name)) acc.push(p);
  }
  return acc;
}

function rel(p) {
  return path.relative(ROOT, p).split(path.sep).join('/');
}

/** supabase.from('x') hoặc supabase.from("x") — chỉ client DB, không phải storage */
function collectDbFroms(content, filePath) {
  const re = /supabase\.from\(\s*['"]([^'"]+)['"]\s*\)/g;
  const out = [];
  let m;
  while ((m = re.exec(content)) !== null) out.push(m[1]);
  return out.map((name) => ({ kind: 'table', name, file: filePath }));
}

/** supabase.storage … .from('bucket') (xuống dòng được) */
function collectStorageFroms(content, filePath) {
  const re = /supabase\.storage[\s\S]{0,200}?\.from\(\s*['"]([^'"]+)['"]\s*\)/g;
  const out = [];
  let m;
  while ((m = re.exec(content)) !== null) out.push(m[1]);
  return out.map((name) => ({ kind: 'storage', name, file: filePath }));
}

function mergeRefs(rows) {
  /** @type {Map<string, { kind: string, name: string, files: Set<string> }>} */
  const map = new Map();
  for (const { kind, name, file } of rows) {
    const key = `${kind}:${name}`;
    if (!map.has(key)) map.set(key, { kind, name, files: new Set() });
    map.get(key).files.add(rel(file));
  }
  return [...map.values()].sort((a, b) => {
    const c = a.name.localeCompare(b.name, 'en');
    if (c !== 0) return c;
    return a.kind.localeCompare(b.kind);
  });
}

function formatSupabaseBlock(refs) {
  if (refs.length === 0) {
    return '_Không tìm thấy `supabase.from` hoặc storage `.from` trong `src/`._';
  }
  const lines = [
    '| Bảng / bucket | Loại | File (tham chiếu) |',
    '| --- | --- | --- |',
  ];
  for (const r of refs) {
    const files = [...r.files].sort().map((f) => '`' + f + '`').join(', ');
    const kind = r.kind === 'storage' ? 'Storage bucket' : 'Bảng';
    lines.push(`| \`${r.name}\` | ${kind} | ${files} |`);
  }
  return lines.join('\n');
}

function parseRoutes(appSource) {
  const re = /<Route\s+path="([^"]+)"\s+element=\{<(\w+)\s*\/>\}\s*\/>/g;
  const rows = [];
  let m;
  while ((m = re.exec(appSource)) !== null) {
    const [, routePath, component] = m;
    const file = path.join(ROOT, 'src', 'pages', `${component}.jsx`);
    const exists = fs.existsSync(file);
    const fileCell = exists ? `\`src/pages/${component}.jsx\`` : `_không thấy \`src/pages/${component}.jsx\`_`;
    rows.push({ routePath, component, fileCell });
  }
  return rows;
}

function formatRoutesBlock(routes) {
  if (routes.length === 0) {
    return '_Không parse được `<Route />` trong `src/App.jsx`._';
  }
  const lines = [
    '| Đường dẫn | Component | File |',
    '| --- | --- | --- |',
    ...routes.map(
      (r) => `| \`${r.routePath}\` | ${r.component} | ${r.fileCell} |`
    ),
  ];
  return lines.join('\n');
}

function replaceMarkedSection(readme, [startMark, endMark], body) {
  const i0 = readme.indexOf(startMark);
  const i1 = readme.indexOf(endMark);
  if (i0 === -1 || i1 === -1 || i1 <= i0) {
    throw new Error(`Thiếu marker trong README: ${startMark} … ${endMark}`);
  }
  return (
    readme.slice(0, i0 + startMark.length) +
    '\n\n' +
    body.trim() +
    '\n\n' +
    readme.slice(i1)
  );
}

function main() {
  const files = walkJsxFiles(SRC);
  const allRefs = [];
  for (const f of files) {
    const content = fs.readFileSync(f, 'utf8');
    allRefs.push(...collectDbFroms(content, f));
    allRefs.push(...collectStorageFroms(content, f));
  }
  const merged = mergeRefs(allRefs);

  const appSource = fs.readFileSync(APP, 'utf8');
  const routes = parseRoutes(appSource);

  let readme = fs.readFileSync(README, 'utf8');
  readme = replaceMarkedSection(readme, MARK.routes, formatRoutesBlock(routes));
  readme = replaceMarkedSection(readme, MARK.supabase, formatSupabaseBlock(merged));
  fs.writeFileSync(README, readme, 'utf8');
  console.log('README.md đã đồng bộ: routes (%d), supabase refs (%d).', routes.length, merged.length);
}

main();
