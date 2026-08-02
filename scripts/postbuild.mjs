/**
 * После статического экспорта Next кладёт страницы файлами вида catalog.html.
 * Часть хостингов умеет отдавать их по адресу /catalog сама (Vercel, Cloudflare,
 * nginx с try_files), часть нет. Чтобы сайт заводился на ЛЮБОМ статическом
 * хостинге без конфигурации, дублируем каждую страницу в catalog/index.html
 *
 * Канонические адреса на страницах остаются без слеша на конце, так что
 * дублей в индексе не возникает
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
