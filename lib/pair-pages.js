/**
 * Волна посадочных 04.11.2026: сравнения «A или B» по методу VIDNO на
 * механизме lib/pair.js. Каркас общий (ответ первым абзацем, таблица всех
 * тарифов пары, две колонки на одинаковых строках, 6 утвердительных H2,
 * FAQ с разметкой FAQPage), а угол сравнения задаёт конфиг пары.
 * Все цифры считаются из базы при сборке. Пара попадает в /sravnenie/,
 * карту сайта и llms.txt через data/comparisons.json
 */
import { pairOf, cheaperAt } from './pair';
import { planName, priceText, planSentence, yearOf } from './answer-first';
import { price, plural } from './format';
import { getTask } from './data';

const P = (slug, label) => ({ href: `/sravnenie/${slug}/`, label });
export const PAIR_LINKS = {
  twFx: P('timeweb-ili-fornex', 'Timeweb Cloud или Fornex'),
  avFx: P('adminvps-ili-fornex', 'AdminVPS или Fornex'),
  twRu: P('timeweb-ili-ruvds', 'Timeweb Cloud или RUVDS'),
  avFv: P('adminvps-ili-firstvds', 'AdminVPS или FirstVDS'),
  twAv: P('timeweb-ili-adminvps', 'Timeweb Cloud или AdminVPS'),
  twAe: P('timeweb-ili-aeza', 'Timeweb Cloud или Aéza'),
  avAe: P('adminvps-ili-aeza', 'AdminVPS или Aéza'),
  twHs: P('timeweb-ili-hostes', 'Timeweb Cloud или Hostes'),
  avHs: P('adminvps-ili-hostes', 'AdminVPS или Hostes'),
  aeHs: P('aeza-ili-hostes', 'Aéza или Hostes'),
  hsHm: P('hostes-ili-hostman', 'Hostes или Hostman'),
  twHm: P('timeweb-ili-hostman', 'Timeweb Cloud или Hostman'),
  msk: { href: '/deshevye-vps/v-moskve/', label: 'VPS в Москве' },
  ddos: { href: '/deshevye-vps/s-zashchitoj-ot-ddos/', label: 'VPS с защитой от DDoS' },
  cpu4: { href: '/deshevye-vps/4-yadra/', label: 'VPS с 4 ядрами' },
  gb8: { href: '/deshevye-vps/8-gb/', label: 'VPS с 8 ГБ памяти' },
  game: { href: '/vps-dlya/game/', label: 'VPS для игрового сервера' },
  dev: { href: '/vps-dlya/dev/', label: 'VPS для разработки' },
  hub: { href: '/sravnenie/', label: 'Все сравнения' },
  ru: { href: '/vps/rossiya/', label: 'VPS в России' },
  eu: { href: '/vps/evropa/', label: 'VPS в Европе' },
  de: { href: '/deshevye-vps/v-germanii/', label: 'VPS в Германии' },
  bitrix: { href: '/vps-dlya/1c-bitrix/', label: 'VPS для 1С и Битрикс' },
  win: { href: '/vps-dlya/windows/', label: 'VPS на Windows' },
  cheap: { href: '/deshevye-vps/', label: 'Самые дешёвые VPS' },
  r500: { href: '/deshevye-vps/do-500-rublej/', label: 'VPS до 500 ₽' },
  hourly: { href: '/deshevye-vps/pochasovaya-oplata/', label: 'VPS с почасовой оплатой' },
  test: { href: '/deshevye-vps/s-testovym-periodom/', label: 'VPS с тестовым периодом' },
};
const READ = {
  choose: { href: '/novosti/kak-vybrat-vps-hosting/', label: 'Как выбрать VPS-хостинг: чек-лист' },
  rate: { href: '/novosti/kurs-rublya-i-cena-zarubezhnogo-servera-v-rublyah/', label: 'Курс рубля и цена зарубежного сервера' },
  fornex: { href: '/novosti/fornex-vps-v-evrope-cena-v-rublyah-byudzhet-na-god/', label: 'Fornex: VPS в Европе в рублях и бюджет на год' },
  bitrix: { href: '/novosti/skolko-resursov-nuzhno-1c-i-bitriks/', label: 'Сколько ресурсов нужно 1С и Битриксу' },
  tw: { href: '/novosti/skolko-stoit-vps-timeweb-cloud-noyabr-2026/', label: 'Сколько стоит VPS в Timeweb Cloud в ноябре 2026' },
  promoAv: { href: '/novosti/promokod-adminvps-makebiz30-makebizyear-skolko-ekonomit/', label: 'Промокоды AdminVPS: сколько экономит сервер' },
  promoTw: { href: '/novosti/timeweb-udvoenie-pervogo-popolneniya-byudzhet/', label: 'Timeweb: удвоение первого пополнения' },
  nds: { href: '/novosti/nds-na-arendu-servera-chto-platit-yurlico/', label: 'НДС на аренду сервера: что платит юрлицо' },
  nvme: { href: '/novosti/nvme-protiv-ssd-kogda-raznica-zametna/', label: 'NVMe против SSD: когда разница заметна' },
  hostes: { href: '/novosti/hostes-vps-10-gbit-ot-3-5-dollara/', label: 'Hostes: VPS с каналом 10 Гбит/с' },
  save: { href: '/novosti/kak-sekonomit-na-vps/', label: 'Как сэкономить на VPS: 6 способов' },
  n8n: { href: '/novosti/n8n-na-svoem-servere-skolko-stoit/', label: 'n8n на своём сервере: сколько стоит VPS' },
};

/* волна посадочных 25.11.2026: помощники для новых пар */
const PL_RE = /Польш|Варшав/;
const NL_RE = /Нидерланд|Амстердам/;
const DE_RE = /Германи|Франкфурт/;
const cheapestIn = (side, re) => side.plans.find((p) => re.test(p.location || '') || re.test(p.name || '')) || null;
const ruOf = (side) => side.ruPlans[0] || null;
const hourlyOf = (side) => side.features.includes('hourly');
const dailyOf = (side) => (side.pros || []).some((x) => /за дни|посуточн/i.test(x));
const billingOf = (side) => (hourlyOf(side) ? 'по часам' : dailyOf(side) ? 'посуточно' : 'помесячно');
const proOf = (side, re) => (side.pros || []).find((x) => re.test(x)) || '';
const cmpPlans = (x, y) => {
  if (!x || !y) return null;
  const [w, l] = x.priceRub <= y.priceRub ? [x, y] : [y, x];
  return { w, l, diff: l.priceRub - w.priceRub };
};


const same = (c) => c && c.w && c.l && c.w.ram === c.l.ram;
const verdict = (c, gb) =>
  c && !c.tie
    ? same(c)
      ? `На ${c.w.ram} ГБ дешевле ${c.winner.name}: ${planName(c.w)} за ${priceText(c.w)} против ${planName(c.l)} за ${priceText(c.l)}.`
      : `Ближайший тариф от ${gb} ГБ дешевле у ${c.winner.name}: ${planName(c.w)} (${c.w.ram} ГБ) за ${priceText(c.w)} против ${planName(c.l)} (${c.l.ram} ГБ) за ${priceText(c.l)}.`
    : '';
const list = (arr) => arr.join(', ');
const taskNames = (s) => s.tasks.map((t) => getTask(t)?.name).filter(Boolean);
const year = (p) => price(p.priceRub * 12);
const lc1 = (t) => (t ? t[0].toLowerCase() + t.slice(1) : t);
const consOf = (s) => s.cons.filter((c) => !/партн[её]р/i.test(c));
const cons = (s) => consOf(s).map(lc1).join('; ');

/** Каркас страницы сравнения из двух сторон и угла пары */
function build(cfg) {
  const { A, B, plans, checked } = pairOf(cfg.a, cfg.b);
  if (!A || !B) return null;
  const at2 = cheaperAt(A, B, 'gb2');
  const at4 = cheaperAt(A, B, 'gb4');
  const entry = cheaperAt(A, B, 'entry');
  const ctx = { A, B, at2, at4, entry, checked };
  const payBoth = A.pay.filter((x) => B.pay.includes(x));
  const onlyRegA = A.regions.filter((r) => !B.regions.includes(r));
  const onlyRegB = B.regions.filter((r) => !A.regions.includes(r));
  const foreign = [A, B].filter((s) => !s.rub);
  const promoSides = [A, B].filter((s) => s.promos.length);

  const lead = A.entry && B.entry
    ? `${verdict(at2, 2) || verdict(entry, 1) || `${A.name} и ${B.name} на одинаковых строках.`} ${A.name} начинается от ${priceText(A.entry)}, ${B.name} от ${priceText(B.entry)}. ${cfg.leadTail ? cfg.leadTail(ctx) + ' ' : ''}Цены проверены ${checkedDate(checked)}.`
    : `${A.name} и ${B.name} на одинаковых строках, цены проверены ${checkedDate(checked)}.`;

  const sections = [
    {
      h2: at2 && !at2.tie
        ? same(at2)
          ? `На ${at2.w.ram} ГБ памяти ${at2.winner.name} дешевле на ${price(at2.diff)} в месяц`
          : `От 2 ГБ памяти ${at2.winner.name} дешевле: ${price(at2.w.priceRub)} за ${at2.w.ram} ГБ против ${price(at2.l.priceRub)} за ${at2.l.ram} ГБ`
        : entry && !entry.tie ? `На старте дешевле ${entry.winner.name}: от ${price(entry.w.priceRub)}` : `${A.name} и ${B.name} стоят одинаково на старте`,
      paras: [
        [verdict(at2, 2) || verdict(entry, 1) || 'Стартовая цена у провайдеров совпадает.', ' ', at4 && !at4.tie ? verdict(at4, 4) : ''].join('').trim(),
        'Сравнивайте тарифы на одном объёме памяти: у провайдеров разное число ядер и разный диск, поэтому в таблице выше рядом стоят именно ближайшие тарифы от 2, 4 и 8 ГБ.',
      ],
    },
    {
      h2: onlyRegA.length || onlyRegB.length
        ? `Регионы с тарифами: у ${A.name} ${list(A.regions) || 'нет'}, у ${B.name} ${list(B.regions) || 'нет'}`
        : `У ${A.name} и ${B.name} одинаковые регионы: ${list(A.regions)}`,
      paras: [
        `${A.name}${A.locations.length ? `: ${list(A.locations.slice(0, 6))}` : ''}. ${B.name}${B.locations.length ? `: ${list(B.locations.slice(0, 6))}` : ''}. Регион выбирают по тому, где ваши пользователи: задержка растёт с расстоянием, и для сайта с аудиторией в России сервер в России отвечает быстрее европейского.`,
        ['Тарифы по регионам: ', { href: PAIR_LINKS.ru.href, text: PAIR_LINKS.ru.label }, ', ', { href: PAIR_LINKS.eu.href, text: PAIR_LINKS.eu.label }, '.'],
      ],
    },
    ...cfg.sections(ctx),
    {
      h2: foreign.length
        ? `Цена ${list(foreign.map((s) => s.name))} в валюте, бюджет зависит от курса`
        : `Оба провайдера считают цену в рублях`,
      paras: [
        foreign.length
          ? `${list(foreign.map((s) => `${s.name} выставляет цену в ${s.currencies.join(' и ')}`))}, в таблице она пересчитана в рубли по курсу ЦБ на дату сверки. При росте курса на 10% месяц обойдётся на 10% дороже, у рублёвого тарифа сумма не изменится.`
          : 'Сумма в счёте не зависит от курса, а для юрлиц российские провайдеры выставляют счёт и закрывающие документы.',
        payBoth.length ? `Оплатить обоих можно: ${list(payBoth)}.` : `Способы оплаты у ${A.name}: ${list(A.pay) || 'на сайте провайдера'}; у ${B.name}: ${list(B.pay) || 'на сайте провайдера'}.`,
        foreign.length ? ['Как курс меняет бюджет: ', { href: READ.rate.href, text: READ.rate.label }, '.'] : ['Что с НДС для юрлица: ', { href: READ.nds.href, text: READ.nds.label }, '.'],
      ],
    },
    {
      h2: A.gb4 && B.gb4 ? `Год на 4 ГБ: ${year(A.gb4)} у ${A.name} против ${year(B.gb4)} у ${B.name}` : 'Годовой бюджет считайте по ближайшему тарифу',
      paras: [
        A.gb4 && B.gb4
          ? `${planName(A.gb4)} (${A.gb4.cpu} vCPU, ${A.gb4.ram} ГБ): ${price(A.gb4.priceRub)} × 12 = ${year(A.gb4)}${A.gb4.term > 1 ? ', с предоплатой за срок' : ''}. ${planName(B.gb4)} (${B.gb4.cpu} vCPU, ${B.gb4.ram} ГБ): ${price(B.gb4.priceRub)} × 12 = ${year(B.gb4)}${B.gb4.term > 1 ? ', с предоплатой за срок' : ''}. Конфигурации отличаются, поэтому сверяйте ядра и диск в таблице.`
          : 'Умножьте месячную цену ближайшего тарифа на 12 и сравните с годовой предоплатой.',
        promoSides.length
          ? `Промокод есть у ${list(promoSides.map((s) => `${s.name} (${s.promos.map((p) => p.title).join('; ')})`))}: он снижает первый счёт, но не годовую цену.`
          : 'Сверенных промокодов у этой пары в каталоге нет.',
      ],
    },
    {
      h2: `У каждого есть ограничения, которые важнее разницы в цене`,
      paras: [
        consOf(A).length ? `${A.name}: ${cons(A)}.` : `${A.name}: ограничений в профиле каталога не отмечено, проверьте условия тарифа на сайте провайдера.`,
        consOf(B).length ? `${B.name}: ${cons(B)}.` : `${B.name}: ограничений в профиле каталога не отмечено, проверьте условия тарифа на сайте провайдера.`,
        ['Полные профили: ', { href: `/provajdery/${A.slug}/`, text: A.name }, ' и ', { href: `/provajdery/${B.slug}/`, text: B.name }, '.'],
      ],
    },
  ];

  const faq = [
    {
      q: `Что дешевле: ${A.name} или ${B.name}?`,
      a: at2 && !at2.tie ? `${verdict(at2, 2)}${at4 && !at4.tie ? ` ${verdict(at4, 4)}` : ''}` : entry && !entry.tie ? verdict(entry, 1) : 'Стартовые цены совпадают, сравнивайте конфигурации в таблице',
    },
    {
      q: `Где дата-центры у ${A.name} и ${B.name}?`,
      a: `${A.name}: ${list(A.regions) || 'нет тарифов со свежей ценой'}. ${B.name}: ${list(B.regions) || 'нет тарифов со свежей ценой'}`,
    },
    {
      q: `Можно ли оплатить ${A.name} и ${B.name} картой МИР?`,
      a: `${A.name}: ${A.pay.includes('карта МИР') ? 'да' : 'на официальной странице оплаты не указано'}. ${B.name}: ${B.pay.includes('карта МИР') ? 'да' : 'на официальной странице оплаты не указано'}. Способы оплаты сверены с сайтами провайдеров`,
    },
    {
      q: `Под какие задачи подходят ${A.name} и ${B.name}?`,
      a: `${A.name}: ${list(taskNames(A)) || 'общие задачи'}. ${B.name}: ${list(taskNames(B)) || 'общие задачи'}`,
    },
    ...cfg.faq(ctx),
  ].slice(0, 6);

  return {
    slug: cfg.slug,
    A,
    B,
    plans,
    checked,
    campaign: `compare_${cfg.slug.replace(/-ili-/, '_')}`,
    title: `${A.name} или ${B.name}: что выбрать`,
    metaTitle: `${A.name} или ${B.name} в ${yearOf(checked)}: сравнение цен и тарифов VPS`,
    description: `${A.name} и ${B.name} на одинаковых строках: ${A.entry ? `${A.name} от ${price(A.entry.priceRub)}` : A.name}, ${B.entry ? `${B.name} от ${price(B.entry.priceRub)}` : B.name} в месяц, регионы, оплата, промокоды. Цены проверены ${checkedDate(checked)}`,
    lead,
    badges: [
      A.entry ? `${A.name} от ${price(A.entry.priceRub)}` : A.name,
      B.entry ? `${B.name} от ${price(B.entry.priceRub)}` : B.name,
      `${plans.length} ${plural(plans.length, 'тариф', 'тарифа', 'тарифов')}`,
    ],
    sections,
    faq,
    endPlan: (at2 && !at2.tie ? at2.w : null) || A.entry || B.entry,
    related: cfg.related,
    read: cfg.read,
  };
}

function checkedDate(iso) {
  const [y, m, d] = String(iso || '').slice(0, 10).split('-');
  return y ? `${d}.${m}.${y}` : '';
}

const CONFIGS = {
  'timeweb-ili-fornex': {
    a: 'timeweb',
    b: 'fornex',
    leadTail: ({ A, B }) => `${A.name} считает цену в рублях и даёт Россию и Европу в одном кабинете, ${B.name} продаёт серверы в Европе с ценой в евро.`,
    sections: ({ A, B }) => [
      {
        h2: `${A.name} даёт российскую площадку, у ${B.name} её нет`,
        paras: [
          A.ruPlans.length ? `У ${A.name} ${A.ruPlans.length} ${plural(A.ruPlans.length, 'тариф', 'тарифа', 'тарифов')} в России, от ${priceText(A.ruPlans[0])}. Это нужно сайту с аудиторией в России, 1С и базе с персональными данными россиян по 152-ФЗ.` : `${A.name} работает с российскими дата-центрами.`,
          `${B.name} подходит, когда сервер должен стоять в Европе: сайт для европейских клиентов, доступ к зарубежным API, резервная копия вне России. Поддержка у ${B.name} на русском.`,
          ['Европейские тарифы обоих и других провайдеров: ', { href: PAIR_LINKS.de.href, text: PAIR_LINKS.de.label }, '.'],
        ],
      },
    ],
    faq: ({ A, B }) => [
      { q: `Есть ли у ${A.name} серверы в Европе?`, a: A.regions.includes('Европа') ? `Да, у ${A.name} есть тарифы в Европе (${[...new Set(A.plans.filter((p) => p.geo === 'eu').map((p) => p.location).filter(Boolean))].join(', ')}), от ${priceText(A.plans.find((p) => p.geo === 'eu'))}, цена в рублях` : `В нашей базе у ${A.name} нет европейских тарифов со свежей ценой` },
      { q: `Какой провайдер выбрать для сайта в России?`, a: `${A.name}: у него российские дата-центры. У ${B.name} российских локаций нет` },
    ],
    related: [PAIR_LINKS.twAv, PAIR_LINKS.avFx, PAIR_LINKS.twAe, PAIR_LINKS.twHs, PAIR_LINKS.de, PAIR_LINKS.eu, PAIR_LINKS.ru, PAIR_LINKS.hub],
    read: [READ.fornex, READ.tw, READ.rate],
  },
  'adminvps-ili-fornex': {
    a: 'adminvps',
    b: 'fornex',
    leadTail: ({ A, B }) => `${A.name} продаёт серверы в России в рублях, ${B.name} в Европе с ценой в евро.`,
    sections: ({ A, B }) => [
      {
        h2: `${A.name} выигрывает у ${B.name} на российской аудитории и рублёвом бюджете`,
        paras: [
          A.ruPlans.length ? `У ${A.name} ${A.ruPlans.length} ${plural(A.ruPlans.length, 'тариф', 'тарифа', 'тарифов')} в России, самый дешёвый ${planName(A.ruPlans[0])} за ${priceText(A.ruPlans[0])}.${A.features.includes('testPeriod') ? ` У ${A.name} есть тестовый период, сервер можно проверить до оплаты.` : ''}` : `${A.name} работает с российскими дата-центрами.`,
          `${B.name} нужен, когда сервер должен стоять в Европе. Российских локаций у ${B.name} нет, зато есть несколько европейских городов${B.locations[0] ? ` (${B.locations[0]})` : ''} и оплата: ${list(B.pay)}.`,
          ['Провайдеры с тестом: ', { href: PAIR_LINKS.test.href, text: PAIR_LINKS.test.label }, '.'],
        ],
      },
    ],
    faq: ({ A, B }) => [
      { q: `Есть ли промокод у ${A.name}?`, a: A.promos.length ? `Да: ${A.promos.map((p) => `${p.title}${p.code ? `, код ${p.code}` : ''}`).join('; ')}` : 'Сверенных промокодов в каталоге сейчас нет' },
      { q: `Что выбрать для сервера в Европе: ${A.name} или ${B.name}?`, a: `${B.name}: это европейский провайдер с несколькими городами на выбор. ${A.name} в нашей базе представлен тарифами в России` },
    ],
    related: [PAIR_LINKS.twFx, PAIR_LINKS.avFv, PAIR_LINKS.avAe, PAIR_LINKS.avHs, PAIR_LINKS.twAv, PAIR_LINKS.de, PAIR_LINKS.r500, PAIR_LINKS.hub],
    read: [READ.promoAv, READ.fornex, READ.rate],
  },
  'timeweb-ili-ruvds': {
    a: 'timeweb',
    b: 'ruvds',
    leadTail: ({ B }) => `${B.allPrepay ? `Цены ${B.name} в каталоге действуют при оплате за несколько месяцев вперёд.` : ''}`,
    sections: ({ A, B }) => [
      {
        h2: `Под 1С и Windows подходят оба, но ${B.allPrepay ? `${B.name} просит предоплату за срок` : `оплата у них устроена по-разному`}`,
        paras: [
          `${A.name} и ${B.name} оба указаны в каталоге для задач 1С и Windows-серверов. ${A.features.includes('hourly') ? `${A.name} берёт оплату по часам и не требует оплаты вперёд за длинный срок.` : ''} ${B.allPrepay && B.entry ? `У ${B.name} цена ${priceText(B.entry)}: такую сумму в месяц дают при оплате за ${B.entry.term} мес. сразу.` : ''}`.replace(/\s+/g, ' ').trim(),
          ['Ресурсы под 1С: ', { href: READ.bitrix.href, text: READ.bitrix.label }, '. Подбор: ', { href: PAIR_LINKS.bitrix.href, text: PAIR_LINKS.bitrix.label }, ', ', { href: PAIR_LINKS.win.href, text: PAIR_LINKS.win.label }, '.'],
        ],
      },
    ],
    faq: ({ A, B }) => [
      { q: `Есть ли у ${B.name} помесячная оплата?`, a: B.allPrepay ? `Тарифы ${B.name} в нашей базе сверены с ценой при оплате за ${B.entry?.term || 3} мес. Если нужна помесячная или почасовая оплата, у ${A.name} она есть` : `Да, у части тарифов ${B.name}` },
      { q: `Какой провайдер выбрать под 1С: ${A.name} или ${B.name}?`, a: `Оба подходят. Смотрите на нужный объём памяти: ${verdict(cheaperAt(A, B, 'gb4'), 4) || 'сравните тарифы от 4 ГБ в таблице'}` },
    ],
    related: [PAIR_LINKS.twAv, PAIR_LINKS.twFx, PAIR_LINKS.twAe, PAIR_LINKS.bitrix, PAIR_LINKS.win, PAIR_LINKS.hourly, PAIR_LINKS.hub],
    read: [READ.tw, READ.bitrix, READ.promoTw],
  },
  'adminvps-ili-firstvds': {
    a: 'adminvps',
    b: 'firstvds',
    leadTail: ({ A, B }) => `Оба российских провайдера считают цену в рублях${A.pay.includes('СБП') && B.pay.includes('СБП') ? ' и принимают карту МИР и СБП' : ''}.`,
    sections: ({ A, B }) => [
      {
        h2: A.plans.length && A.plans.every((p) => p.diskType === 'NVMe') ? `${B.name} даёт выбор между SSD и NVMe, у ${A.name} все тарифы на NVMe` : `${B.name} даёт выбор между SSD и NVMe`,
        paras: [
          `У ${B.name} одни и те же конфигурации есть на SATA SSD и на NVMe: SSD дешевле, NVMe быстрее на базе данных.${B.entry ? ` Самый дешёвый тариф ${B.name}: ${planSentence(B.entry)}.` : ''}`,
          `${A.name}${A.nvme ? ' в нашей базе продаёт тарифы на NVMe' : ''}${A.entry ? `, от ${priceText(A.entry)}` : ''}${A.features.includes('testPeriod') ? ', а сервер можно проверить в тестовый период' : ''}.`,
          ['Когда разница между дисками заметна: ', { href: READ.nvme.href, text: READ.nvme.label }, '.'],
        ],
      },
    ],
    faq: ({ A, B }) => [
      { q: `Есть ли промокод у ${A.name} или ${B.name}?`, a: `${A.name}: ${A.promos.length ? A.promos.map((p) => `${p.title}${p.code ? `, код ${p.code}` : ''}`).join('; ') : 'сверенных промокодов нет'}. ${B.name}: ${B.promos.length ? B.promos.map((p) => p.title).join('; ') : 'сверенных промокодов нет'}` },
      { q: `Что дешевле на 1 ГБ: ${A.name} или ${B.name}?`, a: verdict(cheaperAt(A, B, 'entry'), 1) || 'Стартовые цены совпадают' },
    ],
    related: [PAIR_LINKS.avFx, PAIR_LINKS.twAv, PAIR_LINKS.avAe, PAIR_LINKS.r500, PAIR_LINKS.ru, PAIR_LINKS.test, PAIR_LINKS.hub],
    read: [READ.promoAv, READ.nvme, READ.choose],
  },
  /* ---------- волна посадочных 25.11.2026 ---------- */
  'timeweb-ili-hostes': {
    a: 'timeweb',
    b: 'hostes',
    leadTail: ({ A, B }) => `${A.name} считает цену в рублях и берёт оплату ${billingOf(A)}, ${B.name} выставляет цену в долларах и берёт оплату ${billingOf(B)}.`,
    sections: ({ A, B }) => {
      const ru = cmpPlans(ruOf(A), ruOf(B));
      const nl = cmpPlans(cheapestIn(A, NL_RE), cheapestIn(B, NL_RE));
      return [
        {
          h2: ru ? `В России дешевле ${ru.w === ruOf(A) ? A.name : B.name}: ${price(ru.w.priceRub)} против ${price(ru.l.priceRub)} в месяц` : `Российские площадки у ${A.name} и ${B.name}`,
          paras: [
            ru ? `Самый дешёвый российский тариф ${A.name}: ${planSentence(ruOf(A), 'ru')}. У ${B.name}: ${planSentence(ruOf(B), 'ru')}. Сравнивайте и память: на одних деньгах конфигурации различаются.` : 'Сверенных российских тарифов у одного из провайдеров сейчас нет.',
            nl ? `В Нидерландах: ${planName(cheapestIn(A, NL_RE))} за ${priceText(cheapestIn(A, NL_RE))} против ${planName(cheapestIn(B, NL_RE))} за ${priceText(cheapestIn(B, NL_RE))}.` : '',
            ['Все московские тарифы: ', { href: PAIR_LINKS.msk.href, text: PAIR_LINKS.msk.label }, '. Европа: ', { href: PAIR_LINKS.eu.href, text: PAIR_LINKS.eu.label }, '.'],
          ].filter(Boolean),
        },
        {
          h2: `${B.name} делает ставку на канал, ${A.name} на облако с почасовой оплатой`,
          paras: [
            `${proOf(B, /Гбит/) ? `${B.name}: ${lc1(proOf(B, /Гбит/))}.` : ''} ${proOf(B, /Ryzen|DDR5/) ? `${proOf(B, /Ryzen|DDR5/)}.` : ''} Это важно для раздачи файлов, игрового сервера и прокси, где упираются в канал.`.trim(),
            `${A.name} берёт оплату по часам: сервер можно поднять на вечер и удалить, заплатив только за часы работы. В одном кабинете есть Россия, Европа и другие регионы, а к серверу можно добавить базу данных и хранилище.`,
            ['Обзор провайдера: ', { href: READ.hostes.href, text: READ.hostes.label }, '. Игровой сервер: ', { href: PAIR_LINKS.game.href, text: PAIR_LINKS.game.label }, '.'],
          ],
        },
      ];
    },
    faq: ({ A, B }) => [
      { q: `Есть ли у ${B.name} сервер в России?`, a: B.ruPlans.length ? `Да, ${B.ruPlans.length} ${plural(B.ruPlans.length, 'тариф', 'тарифа', 'тарифов')} в России, от ${priceText(B.ruPlans[0])}` : `В нашей базе у ${B.name} нет российских тарифов со свежей ценой` },
      { q: `Есть ли промокод у ${A.name}?`, a: A.promos.length ? `Да: ${A.promos.map((p) => `${p.title}${p.code ? `, код ${p.code}` : ''}`).join('; ')}` : 'Сверенных промокодов в каталоге сейчас нет' },
    ],
    related: [PAIR_LINKS.avHs, PAIR_LINKS.aeHs, PAIR_LINKS.hsHm, PAIR_LINKS.twAe, PAIR_LINKS.msk, PAIR_LINKS.eu, PAIR_LINKS.hub],
    read: [READ.hostes, READ.tw, READ.rate],
  },
  'adminvps-ili-hostes': {
    a: 'adminvps',
    b: 'hostes',
    leadTail: ({ A, B }) => `${A.name} считает цену в рублях${A.features.includes('testPeriod') ? ' и даёт тестовый период' : ''}, ${B.name} выставляет цену в долларах и берёт оплату ${billingOf(B)}.`,
    sections: ({ A, B }) => {
      const ru = cmpPlans(ruOf(A), ruOf(B));
      const pl = cmpPlans(cheapestIn(A, PL_RE), cheapestIn(B, PL_RE));
      return [
        {
          h2: ru ? `В России дешевле ${ru.w === ruOf(A) ? A.name : B.name}: ${price(ru.w.priceRub)} против ${price(ru.l.priceRub)} в месяц` : `Российские площадки у ${A.name} и ${B.name}`,
          paras: [
            ru ? `Самый дешёвый российский тариф ${A.name}: ${planSentence(ruOf(A), 'ru')}. У ${B.name}: ${planSentence(ruOf(B), 'ru')}.` : 'Сверенных российских тарифов у одного из провайдеров сейчас нет.',
            pl ? `Польша есть у обоих: ${planName(cheapestIn(A, PL_RE))} за ${priceText(cheapestIn(A, PL_RE))} против ${planName(cheapestIn(B, PL_RE))} за ${priceText(cheapestIn(B, PL_RE))}.` : '',
            ['Тарифы по регионам: ', { href: PAIR_LINKS.ru.href, text: PAIR_LINKS.ru.label }, ', ', { href: PAIR_LINKS.de.href, text: PAIR_LINKS.de.label }, '.'],
          ].filter(Boolean),
        },
        {
          h2: `${A.name} проще для оплаты из России, ${B.name} для тех, кому нужен быстрый канал`,
          paras: [
            `${A.name}: оплата ${list(A.pay) || 'на сайте провайдера'}, цена в рублях не зависит от курса${A.features.includes('testPeriod') ? ', сервер можно проверить в тестовый период' : ''}.`,
            `${B.name}: оплата ${list(B.pay) || 'на сайте провайдера'}${proOf(B, /Гбит/) ? `, ${lc1(proOf(B, /Гбит/))}` : ''}. Цена в долларах, поэтому сумма в рублях меняется вместе с курсом.`,
            ['Провайдеры с тестом: ', { href: PAIR_LINKS.test.href, text: PAIR_LINKS.test.label }, '.'],
          ],
        },
      ];
    },
    faq: ({ A, B }) => [
      { q: `Есть ли промокод у ${A.name}?`, a: A.promos.length ? `Да: ${A.promos.map((p) => `${p.title}${p.code ? `, код ${p.code}` : ''}`).join('; ')}` : 'Сверенных промокодов в каталоге сейчас нет' },
      { q: `Можно ли проверить ${A.name} или ${B.name} до оплаты?`, a: `${A.name}: ${A.features.includes('testPeriod') ? 'да, есть тестовый период' : 'тестовый период в профиле не отмечен'}. ${B.name}: ${B.features.includes('testPeriod') ? 'да, есть тестовый период' : `тестовый период в профиле не отмечен, оплата ${billingOf(B)}`}` },
    ],
    related: [PAIR_LINKS.twHs, PAIR_LINKS.aeHs, PAIR_LINKS.avFx, PAIR_LINKS.twAv, PAIR_LINKS.r500, PAIR_LINKS.test, PAIR_LINKS.hub],
    read: [READ.promoAv, READ.hostes, READ.rate],
  },
  'aeza-ili-hostes': {
    a: 'aeza',
    b: 'hostes',
    leadTail: ({ A, B }) => `${A.name} выставляет цену в евро и берёт оплату ${billingOf(A)}, ${B.name} в долларах и ${billingOf(B)}.`,
    sections: ({ A, B }) => {
      const ru = cmpPlans(ruOf(A), ruOf(B));
      const pl = cmpPlans(cheapestIn(A, PL_RE), cheapestIn(B, PL_RE));
      return [
        {
          h2: pl ? `В Польше дешевле ${pl.w === cheapestIn(A, PL_RE) ? A.name : B.name}: ${price(pl.w.priceRub)} против ${price(pl.l.priceRub)} в месяц` : `Польша и Россия у ${A.name} и ${B.name}`,
          paras: [
            pl ? `${planSentence(cheapestIn(A, PL_RE))}. ${planSentence(cheapestIn(B, PL_RE))}.` : 'Сверенных польских тарифов у одного из провайдеров сейчас нет.',
            ru ? `В России: ${planName(ruOf(A))} за ${priceText(ruOf(A))} против ${planName(ruOf(B))} за ${priceText(ruOf(B))}.` : '',
            ['Все московские тарифы: ', { href: PAIR_LINKS.msk.href, text: PAIR_LINKS.msk.label }, '.'],
          ].filter(Boolean),
        },
        {
          h2: `Оба берут оплату за фактическое время, но шаг разный`,
          paras: [
            `${A.name} списывает ${billingOf(A)}, ${B.name} ${billingOf(B)}. Для короткого теста или временного стенда это дешевле помесячной оплаты: сервер удалили, списания остановились.`,
            `${proOf(B, /Гбит/) ? `${B.name}: ${lc1(proOf(B, /Гбит/))}. ` : ''}${proOf(A, /NVMe|канал/i) ? `${A.name}: ${lc1(proOf(A, /NVMe|канал/i))}.` : ''}`.trim() || `Сравнивайте диск и канал в профилях провайдеров.`,
            ['Почасовая оплата у других провайдеров: ', { href: PAIR_LINKS.hourly.href, text: PAIR_LINKS.hourly.label }, '.'],
          ],
        },
      ];
    },
    faq: ({ A, B }) => [
      { q: `Где дешевле сервер в Польше: ${A.name} или ${B.name}?`, a: (() => { const x = cheapestIn(A, PL_RE); const y = cheapestIn(B, PL_RE); return x && y ? `${x.priceRub <= y.priceRub ? A.name : B.name}: ${planName(x)} за ${priceText(x)} против ${planName(y)} за ${priceText(y)}` : 'Сверенных польских тарифов у одного из провайдеров сейчас нет'; })() },
      { q: `Почему цена ${A.name} и ${B.name} в рублях меняется?`, a: `${A.name} считает в евро, ${B.name} в долларах. В таблице цена пересчитана по курсу ЦБ на дату сверки, сумма к оплате следует за курсом` },
    ],
    related: [PAIR_LINKS.twHs, PAIR_LINKS.avHs, PAIR_LINKS.hsHm, PAIR_LINKS.twAe, PAIR_LINKS.avAe, PAIR_LINKS.hourly, PAIR_LINKS.hub],
    read: [READ.hostes, READ.rate, READ.choose],
  },
  'hostes-ili-hostman': {
    a: 'hostes',
    b: 'hostman',
    leadTail: ({ A, B }) => `${A.currencies.join() === B.currencies.join() && !A.rub ? `Оба выставляют цену в ${A.currencies.join(' и ')}. ` : ''}${A.name} продаёт VPS с оплатой ${billingOf(A)}, ${B.name} облако с оплатой ${billingOf(B)} и управляемыми сервисами.`,
    sections: ({ A, B }) => {
      const nl = cmpPlans(cheapestIn(A, NL_RE), cheapestIn(B, NL_RE));
      const de = cmpPlans(cheapestIn(A, DE_RE), cheapestIn(B, DE_RE));
      return [
        {
          h2: nl ? `В Нидерландах дешевле ${nl.w === cheapestIn(A, NL_RE) ? A.name : B.name}: ${price(nl.w.priceRub)} против ${price(nl.l.priceRub)} в месяц` : `Европейские площадки у ${A.name} и ${B.name}`,
          paras: [
            nl ? `${planSentence(cheapestIn(A, NL_RE))}. ${planSentence(cheapestIn(B, NL_RE))}.` : 'Сверенных тарифов в Нидерландах у одного из провайдеров сейчас нет.',
            de ? `В Германии: ${planName(cheapestIn(A, DE_RE))} за ${priceText(cheapestIn(A, DE_RE))} против ${planName(cheapestIn(B, DE_RE))} за ${priceText(cheapestIn(B, DE_RE))}.` : '',
            ['Все тарифы в Германии: ', { href: PAIR_LINKS.de.href, text: PAIR_LINKS.de.label }, '.'],
          ].filter(Boolean),
        },
        {
          h2: `${B.name} берёт на себя администрирование, ${A.name} отдаёт сервер целиком`,
          paras: [
            `${B.name}: ${list((B.pros || []).map(lc1)) || 'управляемое облако'}. Это экономит время команде без администратора, но часть настроек скрыта платформой.`,
            `${A.name}: ${list((A.pros || []).slice(0, 2).map(lc1)) || 'классический VPS'}. Полный доступ к серверу, систему и окружение настраиваете сами.`,
            ['Под задачу: ', { href: PAIR_LINKS.dev.href, text: PAIR_LINKS.dev.label }, ', ', { href: PAIR_LINKS.game.href, text: PAIR_LINKS.game.label }, '.'],
          ],
        },
      ];
    },
    faq: ({ A, B }) => [
      { q: `Есть ли у ${A.name} и ${B.name} серверы в России?`, a: `${A.name}: ${A.ruPlans.length ? `да, от ${priceText(A.ruPlans[0])}` : 'в нашей базе нет российских тарифов со свежей ценой'}. ${B.name}: ${B.ruPlans.length ? `да, от ${priceText(B.ruPlans[0])}` : 'в нашей базе нет российских тарифов со свежей ценой'}` },
      { q: `Кто из них подойдёт для деплоя из GitHub?`, a: proOf(B, /GitHub/) ? `${B.name}: ${lc1(proOf(B, /GitHub/))}. У ${A.name} приложение разворачиваете на сервере сами` : 'Смотрите возможности платформы в профилях провайдеров' },
    ],
    related: [PAIR_LINKS.twHs, PAIR_LINKS.twHm, PAIR_LINKS.aeHs, PAIR_LINKS.avHs, PAIR_LINKS.de, PAIR_LINKS.eu, PAIR_LINKS.hub],
    read: [READ.hostes, READ.rate, READ.choose],
  },
  'timeweb-ili-hostman': {
    a: 'timeweb',
    b: 'hostman',
    leadTail: ({ A, B }) => `Оба берут оплату ${hourlyOf(A) && hourlyOf(B) ? 'по часам' : 'по-разному'}, но ${A.name} считает цену в рублях, а ${B.name} в долларах.`,
    sections: ({ A, B }) => {
      const nl = cmpPlans(cheapestIn(A, NL_RE), cheapestIn(B, NL_RE));
      const de = cmpPlans(cheapestIn(A, DE_RE), cheapestIn(B, DE_RE));
      return [
        {
          h2: nl ? `В Амстердаме дешевле ${nl.w === cheapestIn(A, NL_RE) ? A.name : B.name}: ${price(nl.w.priceRub)} против ${price(nl.l.priceRub)} в месяц` : `Европа у ${A.name} и ${B.name}`,
          paras: [
            nl ? `${planSentence(cheapestIn(A, NL_RE))}. ${planSentence(cheapestIn(B, NL_RE))}. Сверяйте память: на одних деньгах конфигурации различаются.` : 'Сверенных тарифов в Нидерландах у одного из провайдеров сейчас нет.',
            de ? `Во Франкфурте: ${planName(cheapestIn(A, DE_RE))} за ${priceText(cheapestIn(A, DE_RE))} против ${planName(cheapestIn(B, DE_RE))} за ${priceText(cheapestIn(B, DE_RE))}.` : '',
            ['Тарифы в Нидерландах у всех провайдеров: ', { href: '/vps/niderlandy/', text: 'VPS в Нидерландах' }, '.'],
          ].filter(Boolean),
        },
        {
          h2: A.ruPlans.length && !B.ruPlans.length ? `Для сервера в России подходит ${A.name}: у ${B.name} в нашей базе российских тарифов нет` : `Россия у ${A.name} и ${B.name}`,
          paras: [
            A.ruPlans.length ? `У ${A.name} ${A.ruPlans.length} ${plural(A.ruPlans.length, 'тариф', 'тарифа', 'тарифов')} в России (Москва, Санкт-Петербург, Новосибирск), от ${priceText(A.ruPlans[0])}. Цена в рублях, юрлицу выставляют счёт и закрывающие документы.` : `${A.name} работает с российскими дата-центрами.`,
            `${B.name}: ${list((B.pros || []).map(lc1)) || 'управляемое облако'}. Это удобно команде без администратора, когда сервер нужен за рубежом.`,
            ['Московские тарифы: ', { href: PAIR_LINKS.msk.href, text: PAIR_LINKS.msk.label }, '.'],
          ],
        },
      ];
    },
    faq: ({ A, B }) => [
      { q: `Есть ли у ${A.name} и ${B.name} почасовая оплата?`, a: `${A.name}: ${hourlyOf(A) ? 'да' : 'нет'}. ${B.name}: ${hourlyOf(B) ? 'да' : 'нет'}. Списание идёт за часы, пока сервер существует` },
      { q: `Есть ли промокод у ${A.name}?`, a: A.promos.length ? `Да: ${A.promos.map((p) => `${p.title}${p.code ? `, код ${p.code}` : ''}`).join('; ')}` : 'Сверенных промокодов в каталоге сейчас нет' },
    ],
    related: [PAIR_LINKS.twHs, PAIR_LINKS.hsHm, PAIR_LINKS.twAv, PAIR_LINKS.twFx, PAIR_LINKS.hourly, PAIR_LINKS.eu, PAIR_LINKS.hub],
    read: [READ.tw, READ.promoTw, READ.n8n],
  },
};

export const PAIR_PAGE_SLUGS = Object.keys(CONFIGS);
export function pairPage(slug) {
  const cfg = CONFIGS[slug];
  return cfg ? build({ ...cfg, slug }) : null;
}
