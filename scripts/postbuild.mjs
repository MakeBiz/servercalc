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
 * Скрытые страницы не отдают 404 (24.10.2026). Провайдер, скрытый в кабинете
 * (Маркетинг · Провайдеры на сайтах), регион с page: false или сравнение со
 * скрытым провайдером не собираются, а показы в поиске у адресов остаются
 * (/provajdery/alphavps/ 352 показа, /provajdery/selectel/ 51). На каждый такой
 * адрес кладём заглушку на раздел: canonical, noindex, мгновенный переход с
 * сохранением меток. Вернули провайдера, страница соберётся и заглушки не будет
 */
let siteCfg = { url: 'https://servercalc.ru' };
try { siteCfg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', 'site.json'), 'utf8')); } catch {}
const BASE = (process.env.NEXT_PUBLIC_SITE_URL || siteCfg.url || 'https://servercalc.ru').replace(/\/$/, '');
function stub(toPath) {
  const abs = BASE + toPath + (toPath.endsWith('/') ? '' : '/');
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8">` +
    `<title>Переадресация…</title>` +
    `<link rel="canonical" href="${abs}">` +
    `<meta name="robots" content="noindex,follow">` +
    `<meta http-equiv="refresh" content="1; url=${abs}">` +
    `<script>location.replace(${JSON.stringify(abs)}+location.search+location.hash)</script>` +
    `</head><body>Страница переехала: <a href="${abs}">${abs}</a></body></html>`;
}
let gone = 0;
function stubIfMissing(rel, to) {
  const dir = path.join(OUT, rel);
  if (fs.existsSync(path.join(dir, 'index.html'))) return;
  const html = stub(to);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html);
  fs.writeFileSync(path.join(OUT, rel + '.html'), html);
  gone += 1;
}
try {
  const read = (n) => JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', n), 'utf8'));
  for (const p of read('providers.json')) if (p && p.slug) stubIfMissing(`provajdery/${p.slug}`, '/provajdery');
  const tax = read('taxonomy.json');
  for (const g of tax.geos || []) if (g && g.slug) stubIfMissing(`vps/${g.slug}`, '/vps');
  for (const t of tax.tasks || []) if (t && t.slug) stubIfMissing(`vps-dlya/${t.slug}`, '/vps-dlya');
  for (const c of read('comparisons.json').pairs || []) stubIfMissing(`sravnenie/${c.slug}`, '/sravnenie');
} catch (e) {
  console.log(`[postbuild] заглушки скрытых страниц пропущены: ${e.message}`);
}
console.log(`[postbuild] заглушек скрытых страниц: ${gone}`);

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
