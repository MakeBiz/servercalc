// Перед сборкой: скачать из кабинета MakeBiz опубликованный каталог провайдеров
// этого сайта (кто скрыт, приоритет, закреп) в data/catalog-publish.json.
// Кабинет не ответил: оставляем прошлый файл, сборка не падает.
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const SITE = process.env.CATALOG_SITE || 'servercalc-ru';
const BASE = (process.env.CATALOG_URL || 'https://makebiz-makebiz-platform-3628.twc1.net').replace(/\/$/, '');
const file = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'catalog-publish.json');

try {
  const res = await fetch(`${BASE}/catalog/${SITE}.json`, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error('код ' + res.status);
  const doc = await res.json();
  if (!Array.isArray(doc.hidden)) throw new Error('не тот ответ');
  writeFileSync(file, JSON.stringify(doc, null, 2) + '\n');
  console.log(`каталог: версия ${doc.version}, скрыто ${doc.hidden.length}, закреп ${(doc.pinned || []).join(', ') || 'нет'}`);
} catch (e) {
  if (!existsSync(file)) writeFileSync(file, '{}\n');
  let v = '';
  try { v = JSON.parse(readFileSync(file, 'utf8')).version; } catch { /* пустой */ }
  console.warn(`каталог: кабинет не ответил (${e.message}), беру ${v ? 'прошлую версию ' + v : 'списки из кода'}`);
}
