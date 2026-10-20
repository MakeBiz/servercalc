/**
 * После статического экспорта Next кладёт страницы файлами вида catalog.html.
 * Часть хостингов умеет отдавать их по адресу /catalog сама (Vercel, Cloudflare,
 * nginx с try_files), часть нет. Чтобы сайт заводился на ЛЮБОМ статическом
 * хостинге без конфигурации, дублируем каждую страницу в catalog/index.html
 *
 * С 17.10.2026 сборка сама кладёт страницы папками (trailingSlash: true), и
 * канонические адреса, ссылки и карта сайта идут со слешем на конце: так же,
 * как хостинг отдаёт страницы. Дублирование осталось страховкой для файлов,
 * которые Next всё ещё кладёт вида name.html
 */
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.join(process.cwd(), 'out');

if (!fs.existsSync(OUT)) {
  console.log('[postbuild] папки out нет, статический экспорт выключен, пропускаем');
  process.exit(0);
}

let made = 0;

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '_next') continue;
      walk(full);
    } else if (entry.name.endsWith('.html') && entry.name !== 'index.html') {
      const base = entry.name.slice(0, -5);
      const target = path.join(dir, base, 'index.html');
      if (!fs.existsSync(target)) {
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.copyFileSync(full, target);
        made += 1;
      }
    }
  }
}

walk(OUT);
console.log(`[postbuild] продублировано страниц в index.html: ${made}`);

/**
 * og:url, og:title и og:description у каждой страницы свои (21.10.2026).
 * Next берёт openGraph из корневого layout целиком, если страница не задаёт
 * свой, поэтому до этой правки og:url всех страниц вёл на главную, а og:title
 * был названием сайта. Ссылки в ChatGPT и мессенджерах показывали главную.
 * Берём адрес из rel=canonical, заголовок из <title>, описание из meta description
 */
let ogFixed = 0;
const attr = (tag, name) => {
  const m = tag.match(new RegExp(`${name}="([^"]*)"`));
  return m ? m[1] : null;
};
function fixOg(file) {
  let html = fs.readFileSync(file, 'utf8');
  const canon = html.match(/<link[^>]+rel="canonical"[^>]*>/);
  if (!canon) return;
  const url = attr(canon[0], 'href');
  if (!url || /noindex/.test(html.slice(0, 4000)) && /http-equiv="refresh"/.test(html)) return;
  const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || null;
  const descTag = html.match(/<meta[^>]+name="description"[^>]*>/);
  const desc = descTag ? attr(descTag[0], 'content') : null;
  const set = (prop, value) => {
    if (value == null) return;
    const re = new RegExp(`<meta[^>]+property="${prop}"[^>]*>`);
    const tag = `<meta property="${prop}" content="${String(value).replace(/"/g, '&quot;')}"/>`;
    if (re.test(html)) html = html.replace(re, tag);
    else html = html.replace('</head>', `${tag}</head>`);
  };
  const before = html;
  set('og:url', url);
  set('og:title', title);
  set('og:description', desc);
  if (html !== before) {
    fs.writeFileSync(file, html);
    ogFixed += 1;
  }
}
function walkOg(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '_next') continue;
      walkOg(full);
    } else if (entry.name.endsWith('.html')) {
      fixOg(full);
    }
  }
}
walkOg(OUT);
console.log(`[postbuild] og:url/og:title/og:description по странице: ${ogFixed} файлов`);
