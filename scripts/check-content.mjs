/**
 * Проверка текстов по методу журнала (с 09.11.2026). Первый из четырёх проходов вычитки:
 * механику проверяет скрипт, остальные три прохода делает человек или отдельный агент
 * (регламент: content/news/README.md на servercalc.ru, content/news-en/_PLAYBOOK.md на servercalc.com).
 *
 * Работает по собранной папке out/ и исходникам content/, сервер не нужен:
 *   node scripts/check-content.mjs            (после npm run build)
 * Также вызывается в конце scripts/check.mjs.
 *
 * Что проверяется:
 *  1. JSON-LD на всех страницах карты сайта разбирается и заполнен (FAQPage, Article, ItemList)
 *  2. Дубли: одинаковый <title> у двух страниц, один ведущий запрос у двух материалов
 *     или у материала и чужой страницы из паспорта тем data/topics.json
 *  3. Нет длинного тире в видимом тексте (новые материалы: ошибка, старые: сводка)
 *  4. Цены «от N» у провайдера в тексте материала совпадают с каталогом data/plans.json
 *  5. Механика новых материалов: kind и query во фронтматтере, объём, таблица,
 *     абзац-ответ с цифрой, FAQ 4-6 вопросов с разметкой, внутренние ссылки без UTM
 *
 * «Новые материалы» это файлы с date не раньше START. Старые тексты правятся при плановом
 * обновлении (refresh), до того по ним выводятся только предупреждения
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

export const START = '2026-11-09';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EN = fs.existsSync(path.join(ROOT, 'content', 'news-en'));
const CONTENT = path.join(ROOT, 'content', EN ? 'news-en' : 'news');
const NEWS_BASE = EN ? '/news/' : '/novosti/';
const OUT = path.join(ROOT, 'out');

const LIMITS = { news: [350, 700], guide: [1000, 1300], landing: [600, 1000] };
const DASH = /—/g;

const readJson = (rel, fallback) => {
  try { return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8')); } catch { return fallback; }
};
const norm = (s) => String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

function visible(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ');
}

function pageFile(p) {
  const rel = p.replace(/^\/|\/$/g, '');
  const a = path.join(OUT, rel, 'index.html');
  if (fs.existsSync(a)) return a;
  const b = path.join(OUT, rel + '.html');
  return fs.existsSync(b) ? b : null;
}

function checkLd(block, where, fail) {
  let data;
  try { data = JSON.parse(block); } catch (e) { fail(`${where}: JSON-LD не разбирается (${e.message.slice(0, 60)})`); return; }
  const items = Array.isArray(data) ? data : data['@graph'] || [data];
  for (const it of items) {
    if (!it || typeof it !== 'object') { fail(`${where}: пустой узел JSON-LD`); continue; }
    if (!it['@type']) fail(`${where}: JSON-LD без @type`);
    if (!Array.isArray(data) && !data['@graph'] && !String(it['@context'] || '').includes('schema.org')) fail(`${where}: JSON-LD без @context schema.org`);
    const type = [].concat(it['@type'] || []);
    if (type.includes('FAQPage')) {
      const q = [].concat(it.mainEntity || []);
      if (!q.length) fail(`${where}: FAQPage без вопросов`);
      for (const x of q) {
        if (!x || !x.name || !(x.acceptedAnswer && String(x.acceptedAnswer.text || '').trim())) { fail(`${where}: в FAQPage вопрос без name или acceptedAnswer.text`); break; }
      }
    }
    if ((type.includes('Article') || type.includes('NewsArticle')) && !it.headline) fail(`${where}: ${type[0]} без headline`);
    if (type.includes('ItemList') && !(it.itemListElement || []).length) fail(`${where}: ItemList без элементов`);
  }
}

/** минимальные и все цены провайдеров из каталога, только видимые на сайте */
function catalogPrices() {
  let USD_RATE = 1;
  try { USD_RATE = Number((fs.readFileSync(path.join(ROOT, 'lib', 'format.js'), 'utf8').match(/USD_RATE\s*=\s*([\d.]+)/) || [])[1]) || 1; } catch { /* нет файла */ }
  const plans = readJson('data/plans.json', []);
  const providers = readJson('data/providers.json', []);
  const hidden = new Set((readJson('data/catalog-publish.json', {}).hidden) || []);
  const map = new Map();
  for (const p of providers) {
    if (hidden.has(p.slug) || (EN && p.enHidden)) continue;
    const own = plans.filter((x) => x.providerSlug === p.slug && x.billing !== 'hour' && x.dataStatus !== 'withdrawn');
    if (!own.length) continue;
    // на servercalc.com цена показывается как priceRub / USD_RATE (lib/format.js), так и сверяем
    const vals = own.map((x) => (EN ? Math.round((Number(x.priceRub) / USD_RATE) * 100) / 100 : Number(x.priceRub))).filter((v) => Number.isFinite(v) && v > 0);
    if (!vals.length) continue;
    const names = [p.name, p.slug].filter(Boolean).map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    map.set(p.slug, { names, min: Math.min(...vals), all: new Set(vals.map((v) => Math.round(v * 100) / 100)) });
  }
  return map;
}

function wordCount(md) {
  const body = md
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\]\([^)]*\)/g, ']')
    .replace(/[#>*_`|\-]/g, ' ');
  return (body.match(/[\p{L}\p{N}][\p{L}\p{N}'’.,-]*/gu) || []).length;
}

export async function runContentCheck({ quiet = false } = {}) {
  let errors = 0;
  let warnings = 0;
  const log = (s) => { if (!quiet) console.log(s); };
  const fail = (m) => { errors += 1; console.log(`  ОШИБКА  ${m}`); };
  const warn = (m) => { warnings += 1; console.log(`  внимание ${m}`); };

  if (!fs.existsSync(path.join(OUT, 'sitemap.xml'))) {
    fail('нет out/sitemap.xml: сначала npm run build');
    return { errors, warnings };
  }
  const sitemap = fs.readFileSync(path.join(OUT, 'sitemap.xml'), 'utf8');
  const paths = [...new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(/^https?:\/\/[^/]+/, '').replace(/\/$/, '') || '/'))];

  // ── материалы из content/
  const materials = fs.existsSync(CONTENT)
    ? fs.readdirSync(CONTENT).filter((f) => f.endsWith('.md') && !f.startsWith('_') && !f.startsWith('-') && f.toLowerCase() !== 'readme.md').map((f) => {
        const raw = fs.readFileSync(path.join(CONTENT, f), 'utf8');
        let fm = {}; let body = raw;
        try { const m = matter(raw); fm = m.data; body = m.content; } catch { /* фронтматтер проверяет сборка */ }
        const date = fm.date instanceof Date ? fm.date.toISOString().slice(0, 10) : String(fm.date || '').slice(0, 10);
        return { file: f, slug: f.replace(/\.md$/, ''), url: NEWS_BASE + f.replace(/\.md$/, ''), fm, body, date, fresh: date >= START };
      })
    : [];

  log(`\nМетод журнала: проверка текстов (новые материалы с ${START}: ${materials.filter((m) => m.fresh).length} из ${materials.length})`);

  // 1. JSON-LD
  let ldCount = 0;
  const titles = new Map();
  let dashPages = 0; let dashTotal = 0;
  const topics = readJson('data/topics.json', { topics: [] }).topics || [];
  // посадочные в коде (не markdown) считаются новыми, если паспорт отмечен выпущенным после START
  const freshUrls = new Set([
    ...materials.filter((m) => m.fresh).map((m) => m.url),
    ...topics.filter((t) => t.status === 'done' && t.action !== 'boost' && String(t.published || '') >= START && t.url).map((t) => t.url.replace(/\/$/, '')),
  ]);
  for (const p of paths) {
    const f = pageFile(p);
    if (!f) continue;
    const html = fs.readFileSync(f, 'utf8');
    for (const [, block] of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
      ldCount += 1;
      checkLd(block, p, fail);
    }
    const t = (html.match(/<title>([\s\S]*?)<\/title>/) || [])[1];
    if (t && !/noindex/.test((html.match(/<meta name="robots"[^>]*>/) || [''])[0])) {
      const k = norm(t);
      titles.set(k, [...(titles.get(k) || []), p]);
    }
    const dashes = (visible(html).match(DASH) || []).length;
    if (dashes) {
      if (freshUrls.has(p)) fail(`${p}: длинное тире в тексте страницы (${dashes})`);
      else { dashPages += 1; dashTotal += dashes; }
    }
  }
  log(`  1. JSON-LD: проверено блоков ${ldCount}`);

  // 2. дубли
  for (const [, list] of titles) if (list.length > 1) fail(`одинаковый title у страниц: ${list.join(', ')}`);
  const byQuery = new Map();
  for (const t of topics) {
    if (!t.query) continue;
    const k = norm(t.query);
    if (byQuery.has(k) && byQuery.get(k).url !== t.url) fail(`паспорт тем: запрос «${t.query}» у двух страниц (${byQuery.get(k).url} и ${t.url})`);
    byQuery.set(k, t);
  }
  const matByQuery = new Map();
  for (const m of materials) {
    const q = m.fm.query;
    if (!q) { if (m.fresh) fail(`${m.file}: нет поля query (ведущий запрос из паспорта темы)`); continue; }
    const k = norm(q);
    if (matByQuery.has(k)) fail(`${m.file} и ${matByQuery.get(k)}: один ведущий запрос «${q}», страницы отберут показы друг у друга`);
    matByQuery.set(k, m.file);
    const t = byQuery.get(k);
    if (t && t.url && t.url.replace(/\/$/, '') !== m.url) fail(`${m.file}: запрос «${q}» в паспорте закреплён за ${t.url}`);
    if (!t && m.fresh) warn(`${m.file}: запроса «${q}» нет в data/topics.json, добавьте паспорт`);
  }
  const inMap = new Set(paths);
  for (const t of topics) {
    if (t.status === 'done' && t.url && !inMap.has(t.url.replace(/\/$/, '') || '/')) warn(`паспорт ${t.id}: статус done, а ${t.url} нет в sitemap.xml`);
  }
  log(`  2. Дубли: title ${titles.size} уникальных, паспортов тем ${topics.length}, ведущих запросов у материалов ${matByQuery.size}`);

  // 3. длинное тире в исходниках новых материалов
  for (const m of materials.filter((x) => x.fresh)) {
    const src = (m.fm.title || '') + ' ' + (m.fm.description || '') + ' ' + m.body.replace(/<script[\s\S]*?<\/script>/gi, ' ');
    const n = (src.match(DASH) || []).length;
    if (n) fail(`${m.file}: длинное тире в тексте (${n}), заменить на точку, двоеточие или запятую`);
  }
  if (dashTotal) warn(`длинное тире на старых страницах: ${dashTotal} на ${dashPages} страницах, убрать при плановом обновлении`);
  log('  3. Длинное тире: проверено');

  // 4. цены против каталога
  const prices = catalogPrices();
  const fromRe = EN ? /from\s*\$\s?(\d+(?:\.\d{1,2})?)/gi : /от\s*(\d[\d\s  ]*(?:,\d{1,2})?)\s*(?:₽|руб)/gi;
  let priceHits = 0;
  for (const m of materials) {
    const sentences = m.body.replace(/<script[\s\S]*?<\/script>/gi, ' ').split(/(?<=[.!?\n])\s+/);
    for (const s of sentences) {
      if (/промокод|скидк|бонус|акци|promo|discount|coupon|bonus|первый месяц|first month|продлени|renewal|в год|per year|\/yr|за год/i.test(s)) continue;
      for (const [slug, pr] of prices) {
        if (!new RegExp(`(^|[^\\p{L}])(${pr.names.join('|')})([^\\p{L}]|$)`, 'iu').test(s)) continue;
        // в предложении про несколько провайдеров цену не приписать однозначно
        const others = [...prices.entries()].filter(([o, op]) => o !== slug && new RegExp(`(^|[^\\p{L}])(${op.names.join('|')})([^\\p{L}]|$)`, 'iu').test(s));
        if (others.length) continue;
        for (const [, num] of s.matchAll(fromRe)) {
          const v = Number(num.replace(/[\s  ]/g, '').replace(',', '.'));
          if (!Number.isFinite(v)) continue;
          priceHits += 1;
          if (Math.abs(v - pr.min) <= Math.max(1, pr.min * 0.005)) continue;
          const msg = `${m.file}: «от ${num.trim()}» у ${slug}, в каталоге сейчас от ${pr.min}`;
          if (m.fresh) fail(msg); else warn(msg);
        }
      }
    }
  }
  log(`  4. Цены «от» у провайдеров в материалах: найдено ${priceHits}, сверено с data/plans.json`);

  // 5. механика новых материалов
  for (const m of materials.filter((x) => x.fresh)) {
    const kind = m.fm.kind;
    if (!LIMITS[kind]) { fail(`${m.file}: поле kind должно быть news, guide или landing`); continue; }
    const words = wordCount(m.body);
    const [lo, hi] = LIMITS[kind];
    if (words < lo * 0.85) fail(`${m.file}: ${words} слов, для ${kind} нужно ${lo}-${hi}`);
    else if (words < lo || words > hi * 1.15) warn(`${m.file}: ${words} слов, норма для ${kind} ${lo}-${hi}`);
    if (kind !== 'news' && !/^\|.*\|\s*$\n^\|\s*:?-{3,}/m.test(m.body)) fail(`${m.file}: нет таблицы`);
    const lead = (m.body.trim().split(/\n\s*\n/)[0] || '');
    if (/^#/.test(lead) || !/\d/.test(lead)) fail(`${m.file}: первый абзац не абзац-ответ с цифрой`);
    const h2 = (m.body.match(/^## /gm) || []).length;
    if (h2 < 4) warn(`${m.file}: H2 ${h2}, по шаблону 5-7`);
    const faqHead = EN ? /^## (Frequently asked questions|FAQ)/im : /^## (Частые вопросы|Коротко)/im;
    const faqPart = (m.body.split(faqHead)[2] || '').split(/^## /m)[0];
    const faqQ = (faqPart.match(/^### /gm) || []).length;
    if (faqQ < 4 || faqQ > 6) fail(`${m.file}: в FAQ ${faqQ} вопросов, нужно 4-6`);
    if (!/"FAQPage"/.test(m.body)) fail(`${m.file}: нет блока JSON-LD FAQPage в конце файла`);
    const links = [...m.body.matchAll(/\]\((\/[^)\s]*)\)/g)].map((x) => x[1]);
    if (links.length < 3) fail(`${m.file}: внутренних ссылок ${links.length}, нужно не меньше 3`);
    const utm = links.filter((l) => /utm_/.test(l));
    if (utm.length) fail(`${m.file}: UTM во внутренних ссылках (${utm[0]})`);
    if (/[?&](i|ref|from|partner_id|aff)=/.test(m.body.replace(/<script[\s\S]*?<\/script>/gi, ''))) fail(`${m.file}: похоже на реф-ссылку в тексте, кнопка провайдера только через provider:`);
    if (!m.fm.query) fail(`${m.file}: нет query`);
  }
  log('  5. Механика новых материалов: проверено');

  return { errors, warnings };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const { errors, warnings } = await runContentCheck();
  console.log(`\nТексты: ошибок ${errors}, предупреждений ${warnings}`);
  process.exit(errors ? 1 : 0);
}
