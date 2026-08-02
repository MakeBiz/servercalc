/**
 * Проверка собранного сайта против ограничений брифа.
 * Запуск: npm run build && npm run start, затем node scripts/check.mjs http://localhost:3000
 *
 * Проверяется то, что легко нарушить незаметно при правке текстов:
 *  1. на русской версии нет темы VPN и обхода блокировок
 *  2. нигде не упоминаются способы оплаты картой и рублями
 *  3. нет превосходной степени без ссылки на методологию
 *  4. партнёрские ссылки собраны верно, метка стоит до якоря
 *  5. у партнёрских ссылок проставлен rel sponsored nofollow
 *  6. счётчик Метрики на месте
 */

const BASE = process.argv[2] || 'http://localhost:3000';

const PAGES = [
  '/', '/catalog', '/provajdery', '/vps-dlya', '/vps', '/novosti',
  '/metodologiya', '/kak-my-zarabatyvaem', '/o-proekte',
  '/politika-konfidencialnosti', '/cookie',
  '/provajdery/timeweb', '/provajdery/ultahost', '/provajdery/regru',
  '/vps-dlya/1c-bitrix', '/vps-dlya/n8n', '/vps/rossiya', '/vps/evropa',
  '/novosti/nvme-protiv-ssd-kogda-raznica-zametna',
];

const FORBIDDEN = [
  { re: /\bvpn\b/i, why: 'тема VPN закрыта на русской версии (раздел 3.1 брифа)' },
  { re: /впн/i, why: 'тема VPN закрыта на русской версии' },
  { re: /обход\w* блокиров/i, why: 'обход блокировок закрыт на русской версии' },
  { re: /карт(ой|ы|а) РФ/i, why: 'упоминания оплаты картой РФ убраны по решению владельца' },
  { re: /оплат\w* рублями/i, why: 'ось способов оплаты убрана целиком' },
  { re: /российской картой/i, why: 'ось способов оплаты убрана целиком' },
  { re: /\bлучший хостинг\b/i, why: 'превосходная степень без критерия сравнения' },
  { re: /номер один/i, why: 'превосходная степень без критерия сравнения' },
];

let errors = 0;
let warnings = 0;
const fail = (msg) => { errors += 1; console.log(`  ОШИБКА  ${msg}`); };
const warn = (msg) => { warnings += 1; console.log(`  внимание ${msg}`); };

function strip(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
}

console.log(`Проверка сборки на ${BASE}\n`);

const pages = new Map();
for (const path of PAGES) {
  const res = await fetch(BASE + path);
  if (!res.ok) { fail(`${path} отвечает ${res.status}`); continue; }
  pages.set(path, await res.text());
}
console.log(`1. Страницы отвечают: ${pages.size} из ${PAGES.length}`);

// 1-3. запрещённые формулировки в видимом тексте
console.log('\n2. Запрещённые темы и формулировки');
for (const [path, html] of pages) {
  const text = strip(html);
  for (const { re, why } of FORBIDDEN) {
    const hit = text.match(re);
    if (hit) fail(`${path}: «${hit[0]}» — ${why}`);
  }
}
if (errors === 0) console.log('  чисто');

// 4. партнёрские ссылки
console.log('\n3. Партнёрские ссылки и метки');
const ULTA = /https:\/\/ultahost\.com\/\?[^"']*#MakeBiz/;
const ultaPage = pages.get('/provajdery/ultahost') || '';
if (ULTA.test(ultaPage)) {
  console.log('  UltaHost: метка стоит до якоря, реферальный идентификатор цел');
} else if (/ultahost\.com\/#MakeBiz\?/.test(ultaPage)) {
  fail('UltaHost: метка попала ПОСЛЕ якоря, реферальный идентификатор сломан');
} else {
  warn('UltaHost: ссылку в разметке найти не удалось, проверить вручную');
}

const allHtml = [...pages.values()].join('\n');
const outLinks = [...allHtml.matchAll(/<a[^>]+href="(https?:\/\/[^"]+)"[^>]*>/g)];
const external = outLinks.filter(([, href]) => !href.includes('localhost') && !href.includes('mc.yandex'));
const withSource = external.filter(([, href]) => href.includes('utm_source=servercalc'));
console.log(`  внешних ссылок: ${external.length}, из них с меткой servercalc: ${withSource.length}`);

const badRel = external.filter(([tag, href]) => href.includes('utm_source=') && !/rel="sponsored nofollow noopener"/.test(tag));
if (badRel.length) fail(`${badRel.length} партнёрских ссылок без rel="sponsored nofollow noopener"`);
else console.log('  у всех партнёрских ссылок проставлен rel sponsored nofollow noopener');

const campaigns = new Set(
  external.map(([, href]) => (href.match(/utm_campaign=([^&#]+)/) || [])[1]).filter(Boolean)
);
console.log(`  разрезы utm_campaign: ${[...campaigns].join(', ') || 'нет'}`);

// 5. непартнёрские провайдеры не должны получать метку
const regru = pages.get('/provajdery/regru') || '';
if (/reg\.ru[^"']*utm_source=servercalc/.test(regru)) {
  fail('Reg.ru без партнёрства, а ссылка помечена как партнёрская');
} else {
  console.log('  провайдеры без партнёрства отдают обычную ссылку без метки');
}

// 6. счётчик
console.log('\n4. Аналитика и техника');
const home = pages.get('/') || '';
if (home.includes('mc.yandex.ru/metrika/tag.js?id=111249191')) console.log('  счётчик Метрики 111249191 на месте');
else fail('счётчик Метрики не найден на главной');
if (home.includes('mc.yandex.ru/watch/111249191')) console.log('  noscript-пиксель на месте');
else warn('noscript-пиксель Метрики не найден');

// 7. SEO-обвязка
const sitemap = await (await fetch(BASE + '/sitemap.xml')).text();
const urls = (sitemap.match(/<loc>/g) || []).length;
console.log(`  sitemap.xml: ${urls} адресов`);
if (urls < 40) warn('в карте сайта меньше сорока адресов, проверить генерацию');

const robots = await (await fetch(BASE + '/robots.txt')).text();
if (robots.includes('Sitemap:')) console.log('  robots.txt ссылается на карту сайта');
else fail('robots.txt без ссылки на sitemap');

let noCanonical = 0;
for (const [path, html] of pages) {
  if (!/rel="canonical"/.test(html)) { noCanonical += 1; warn(`${path}: нет канонического адреса`); }
}
if (!noCanonical) console.log('  канонические адреса проставлены на всех проверенных страницах');

const ld = (allHtml.match(/application\/ld\+json/g) || []).length;
console.log(`  блоков микроразметки на проверенных страницах: ${ld}`);

// 8. свежесть
console.log('\n5. Свежесть данных');
if (home.includes('Демонстрационные данные')) console.log('  плашка демо-режима показана, как и должно быть до подключения парсера');
else warn('плашка демо-режима не найдена, проверить meta.dataStatus');
if ((pages.get('/catalog') || '').includes('Проверено')) console.log('  в каталоге есть колонка с датой проверки');
else fail('в каталоге нет колонки с датой проверки');

console.log(`\nИтог: ошибок ${errors}, предупреждений ${warnings}`);
process.exit(errors ? 1 : 0);
