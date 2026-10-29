/**
 * Посадочные «дешёвые VPS» для servercalc.ru (29.10.2026), пары к /cheap-vps/* на servercalc.com.
 * Все цифры собираются из базы при сборке: после сверки цен текст обновляется сам.
 * Текст абзаца: строка или массив кусков, кусок строка или { href, text }
 */
import { VISIBLE_PLANS, STATS, getProvider } from './data';
import { price, plural } from './format';
import { byPrice, checkedAt, planName, priceText, planSentence, cheapestWith, dmy } from './answer-first';

export const ALL = [...VISIBLE_PLANS].sort(byPrice);
const prepaid = (p) => Boolean(p.term && p.term > 1);
const hourly = (p) => Boolean(getProvider(p.providerSlug)?.features?.hourly);
const uniq = (plans) => [...new Set(plans.map((p) => p.providerSlug))];
const median = (nums) => {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const tarifov = (n) => `${n} ${plural(n, 'тариф', 'тарифа', 'тарифов')}`;
const provs = (n) => `${n} ${plural(n, 'провайдера', 'провайдеров', 'провайдеров')}`;

export const LINKS = {
  hub: { href: '/deshevye-vps/', label: 'Самые дешёвые VPS' },
  r300: { href: '/deshevye-vps/do-300-rublej/', label: 'VPS до 300 ₽' },
  r500: { href: '/deshevye-vps/do-500-rublej/', label: 'VPS до 500 ₽' },
  gb1: { href: '/deshevye-vps/1-gb/', label: 'VPS с 1 ГБ памяти' },
  gb2: { href: '/deshevye-vps/2-gb/', label: 'VPS с 2 ГБ памяти' },
  gb4: { href: '/deshevye-vps/4-gb/', label: 'VPS с 4 ГБ памяти' },
  gb8: { href: '/deshevye-vps/8-gb/', label: 'VPS с 8 ГБ памяти' },
  nvme: { href: '/deshevye-vps/nvme/', label: 'Дешёвые VPS на NVMe' },
  hourly: { href: '/deshevye-vps/pochasovaya-oplata/', label: 'VPS с почасовой оплатой' },
  monthly: { href: '/deshevye-vps/bez-predoplaty/', label: 'VPS без предоплаты за год' },
  bot: { href: '/vps-dlya/telegram-bot/', label: 'VPS для Telegram-бота' },
  site: { href: '/vps-dlya/sajt/', label: 'VPS для сайта' },
  shop: { href: '/vps-dlya/magazin/', label: 'VPS для интернет-магазина' },
  db: { href: '/vps-dlya/baza-dannyh/', label: 'VPS для базы данных' },
  bitrix: { href: '/vps-dlya/1c-bitrix/', label: 'VPS для 1С и Битрикс' },
  ru: { href: '/vps/rossiya/', label: 'VPS в России' },
  eu: { href: '/vps/evropa/', label: 'VPS в Европе' },
  catalog: { href: '/catalog/', label: 'Весь каталог' },
};
const READ = {
  choose: { href: '/novosti/kak-vybrat-vps-hosting/', label: 'Как выбрать VPS-хостинг: чек-лист' },
  nvme: { href: '/novosti/nvme-protiv-ssd-kogda-raznica-zametna/', label: 'NVMe против SSD: когда разница заметна' },
  cost: { href: '/novosti/skolko-na-samom-dele-stoit-server/', label: 'Сколько на самом деле стоит сервер' },
  stale: { href: '/novosti/pochemu-my-skryvaem-ustarevshie-tarify/', label: 'Почему мы скрываем устаревшие тарифы' },
  bitrix: { href: '/novosti/skolko-resursov-nuzhno-1c-i-bitriks/', label: 'Сколько ресурсов нужно 1С и Битриксу' },
  rate: { href: '/novosti/kurs-rublya-i-cena-zarubezhnogo-servera-v-rublyah/', label: 'Курс рубля и цена зарубежного сервера' },
};

function base({ slug, plans, highlight, name, h1, campaign, crumb }) {
  const checked = checkedAt(plans, STATS.verifiedAt);
  const first = plans[0];
  const monthly = plans.find((p) => !prepaid(p));
  return { slug, plans, highlight, name, h1, campaign, crumb, checked, first, monthly, provCount: uniq(plans).length };
}

function leadOf(c, what) {
  if (!c.first) return `${what}: сейчас нет тарифов со свежей проверенной ценой, список заполнится после сверки.`;
  return (
    `${what} сейчас: ${planSentence(c.first)}, цена проверена ${dmy(c.checked)}. ` +
    (c.monthly && c.monthly !== c.first ? `Без предоплаты: ${planName(c.monthly)} за ${priceText(c.monthly)}. ` : '') +
    `Ниже ${tarifov(c.plans.length)} от ${provs(c.provCount)}, сначала самые дешёвые.`
  );
}

function prepayPara(c) {
  return c.first && prepaid(c.first)
    ? `Первая строка, ${planName(c.first)}, оплачивается сразу за весь срок. Это выгодно, если проект проживёт год, но при переезде через два месяца деньги не вернутся. Смотрите подпись под ценой: там указано, за какой срок нужно платить.`
    : 'Смотрите подпись под ценой: у части тарифов низкая месячная цена действует только при оплате за год или больше.';
}

const PAGES = {
  'do-300-rublej': () => {
    const c = base({ slug: 'do-300-rublej', plans: ALL.filter((p) => p.priceRub <= 300), name: 'VPS до 300 ₽', h1: 'VPS до 300 рублей в месяц', campaign: 'cheap_300', crumb: 'До 300 ₽' });
    return {
      ...c,
      lead: leadOf(c, 'Самый дешёвый VPS до 300 ₽'),
      sections: [
        { h2: 'За 300 ₽ берут сервер под бота, VPN-шлюз для команды или тестовый стенд', paras: [
          'В этом бюджете почти всегда 1 ядро и 1 ГБ памяти, реже 2 ГБ. Этого хватает Telegram-боту на Python или Node, небольшому лендингу на статике, cron-задачам и учебному стенду. Под WordPress с плагинами или магазин такой сервер уже тесен.',
          ['Если задача понятна заранее, начните со страницы задачи: ', LINKS.bot, ' или ', LINKS.site, '. Там рекомендуемая конфигурация подобрана под нагрузку.']] },
        { h2: 'Самые низкие цены требуют предоплату', paras: [prepayPara(c), ['Тарифы, которые можно оплачивать помесячно, собраны отдельно: ', LINKS.monthly, '.']] },
        { h2: 'Дешёвый тариф в рублях часто стоит за рубежом', paras: [
          'Часть самых дешёвых серверов расположена в США и Европе, цена пересчитана в рубли по курсу ЦБ. Для аудитории в России это лишние 50-150 мс задержки, а оплата картой российского банка у зарубежных провайдеров обычно не проходит.',
          ['Если нужна площадка в России, смотрите ', LINKS.ru, '. Чем оплатить зарубежный сервер, разобрано на страницах ', { href: '/vps-s-oplatoj/kriptovalyutoj/', text: 'оплаты криптовалютой' }, ' и ', { href: '/vps-s-oplatoj/sbp/', text: 'по СБП' }, '.']] },
      ],
      faq: [
        { q: 'Какой самый дешёвый VPS до 300 рублей', a: c.first ? `На ${dmy(c.checked)}: ${planSentence(c.first)}.` : 'Сейчас нет тарифа до 300 ₽ со свежей ценой' },
        { q: 'Что можно запустить на VPS за 300 рублей', a: 'Telegram-бота, статический сайт или лендинг, cron-задачи, небольшой прокси или тестовый стенд. Для WordPress с плагинами, магазина или 1С нужен сервер дороже, от 2 ГБ памяти' },
        { q: 'Почему у тарифов до 300 ₽ пишут «при оплате за год»', a: 'Провайдеры дают минимальную цену за длинный срок оплаты. Помесячная цена того же тарифа выше. Если сомневаетесь в проекте, берите тариф без предоплаты' },
      ],
      related: [LINKS.r500, LINKS.gb1, LINKS.monthly, LINKS.bot, LINKS.hub],
      read: [READ.choose, READ.rate, READ.stale],
    };
  },
  'do-500-rublej': () => {
    const c = base({ slug: 'do-500-rublej', plans: ALL.filter((p) => p.priceRub <= 500), name: 'VPS до 500 ₽', h1: 'VPS до 500 рублей в месяц', campaign: 'cheap_500', crumb: 'До 500 ₽', highlight: (p) => p.ram >= 2 });
    const two = cheapestWith(c.plans, { ram: 2 });
    return {
      ...c,
      lead: leadOf(c, 'Самый дешёвый VPS до 500 ₽'),
      sections: [
        { h2: 'До 500 ₽ уже реально взять 2 ГБ памяти', paras: [
          two ? `Самый дешёвый тариф с 2 ГБ в этом бюджете: ${planName(two)} за ${priceText(two)}. Жирным в таблице выделены тарифы от 2 ГБ: на них спокойно работает сайт на WordPress, бот с базой и небольшой Docker-стек.` : 'Жирным в таблице выделены тарифы от 2 ГБ памяти: на них спокойно работает сайт на WordPress, бот с базой и небольшой Docker-стек.',
          ['Под интернет-магазин и 1С этого обычно мало, там смотрите ', LINKS.gb4, ' и ', LINKS.bitrix, '.']] },
        { h2: 'Как сравнивать тарифы в одном бюджете', paras: [
          'При одинаковой цене решают три вещи: объём памяти, тип диска (NVMe быстрее SSD на базах данных) и где стоит сервер. Цена за гигабайт памяти в каталоге помогает увидеть, где вы переплачиваете за бренд.',
          ['Таблицу можно отсортировать по любому столбцу в ', LINKS.catalog, '. ', prepayPara(c)]] },
      ],
      faq: [
        { q: 'Какой VPS взять до 500 рублей', a: c.first ? `Самый дешёвый на ${dmy(c.checked)}: ${planSentence(c.first)}.${two ? ` С 2 ГБ памяти: ${planName(two)} за ${priceText(two)}.` : ''}` : 'Сейчас нет тарифа до 500 ₽ со свежей ценой' },
        { q: 'Хватит ли VPS за 500 рублей для сайта', a: 'Для сайта на WordPress или другой CMS с посещаемостью до нескольких тысяч человек в день хватит тарифа с 2 ГБ памяти и NVMe. Для магазина с каталогом в тысячи товаров берите от 4 ГБ' },
        { q: 'Есть ли VPS до 500 рублей в России', a: 'Да, у российских провайдеров есть тарифы в этом бюджете, в таблице у них в столбце «Где» указана Россия или город. Полный список российских площадок на странице «VPS в России»' },
      ],
      related: [LINKS.r300, LINKS.gb2, LINKS.nvme, LINKS.site, LINKS.hub],
      read: [READ.choose, READ.nvme, READ.cost],
    };
  },
  '1-gb': () => {
    const c = base({ slug: '1-gb', plans: ALL.filter((p) => p.ram === 1), name: 'VPS с 1 ГБ', h1: 'Самый дешёвый VPS с 1 ГБ памяти', campaign: 'cheap_1gb', crumb: '1 ГБ' });
    return {
      ...c,
      lead: leadOf(c, 'Самый дешёвый VPS с 1 ГБ памяти'),
      sections: [
        { h2: 'Одного гигабайта хватает боту, прокси и статике', paras: [
          'Бот на Python с вебхуками занимает 100-200 МБ, Nginx со статическим сайтом ещё меньше. Гигабайт начинает заканчиваться, когда рядом появляется база данных, WordPress с плагинами или Docker с несколькими контейнерами.',
          ['Под бота рекомендованная конфигурация разобрана на странице ', LINKS.bot, '.']] },
        { h2: 'Когда переходить на 2 ГБ', paras: [
          'Признаки: сервер уходит в swap, база данных падает по нехватке памяти, сборка проекта не проходит. Разница в цене между 1 и 2 ГБ обычно 100-200 ₽ в месяц, это дешевле, чем разбираться с падениями.',
          ['Тарифы с 2 ГБ: ', LINKS.gb2, '. ', prepayPara(c)]] },
      ],
      faq: [
        { q: 'Какой самый дешёвый VPS с 1 ГБ RAM', a: c.first ? `На ${dmy(c.checked)}: ${planSentence(c.first)}.` : 'Сейчас нет тарифа с 1 ГБ со свежей ценой' },
        { q: 'Хватит ли 1 ГБ для WordPress', a: 'Для пустого сайта хватит, для сайта с плагинами, кэшем и посещаемостью уже нет: PHP-FPM и MySQL вместе быстро съедают гигабайт. Для WordPress берите от 2 ГБ' },
        { q: 'Можно ли запустить Docker на 1 ГБ', a: 'Один-два лёгких контейнера да, полноценный docker-compose со стеком сервисов нет. Для Docker разумный минимум 2 ГБ' },
      ],
      related: [LINKS.r300, LINKS.gb2, LINKS.bot, LINKS.hub],
      read: [READ.choose, READ.stale],
    };
  },
  '2-gb': () => {
    const c = base({ slug: '2-gb', plans: ALL.filter((p) => p.ram >= 2 && p.priceRub <= 1500), highlight: (p) => p.ram === 2, name: 'VPS с 2 ГБ', h1: 'Самый дешёвый VPS с 2 ГБ памяти', campaign: 'cheap_2gb', crumb: '2 ГБ' });
    const exact = c.plans.filter((p) => p.ram === 2);
    const med = median(exact.map((p) => p.priceRub));
    return {
      ...c,
      lead: leadOf(c, 'Самый дешёвый VPS с 2 ГБ памяти'),
      sections: [
        { h2: '2 ГБ это рабочий минимум для сайта с базой данных', paras: [
          'На двух гигабайтах помещаются Nginx, PHP-FPM, MySQL и кэш для сайта на WordPress или Bitrix «Старт», бот с PostgreSQL, n8n с десятком сценариев. Жирным выделены тарифы ровно с 2 ГБ, ниже тарифы с большим объёмом в том же бюджете до 1 500 ₽.',
          ['Под конкретную задачу: ', LINKS.site, ', ', LINKS.bot, '.']] },
        { h2: 'Сколько обычно стоят 2 ГБ', paras: [
          med ? `Медианная цена тарифа ровно с 2 ГБ в нашей базе ${price(med)} в месяц. Если тариф заметно дешевле, проверьте подпись под ценой (предоплата) и тип диска.` : 'Если тариф заметно дешевле остальных, проверьте подпись под ценой (предоплата) и тип диска.',
          ['Чем NVMe лучше SSD на базе данных, разобрано в статье ', { href: READ.nvme.href, text: 'NVMe против SSD' }, '.']] },
      ],
      faq: [
        { q: 'Какой самый дешёвый VPS с 2 ГБ RAM', a: c.first ? `На ${dmy(c.checked)}: ${planSentence(c.first)}.${c.monthly && c.monthly !== c.first ? ` Без предоплаты: ${planName(c.monthly)} за ${priceText(c.monthly)}.` : ''}` : 'Сейчас нет тарифа с 2 ГБ со свежей ценой' },
        { q: 'Хватит ли 2 ГБ для интернет-магазина', a: 'Для небольшого магазина на сотни товаров да, для каталога в тысячи товаров с фильтрами и 1С-обменом нет, там нужно от 4 ГБ' },
        { q: 'Сколько ядер нужно к 2 ГБ памяти', a: 'Обычно одно-два. Второе ядро помогает, когда сайт обслуживает много запросов одновременно или идёт сборка проекта' },
      ],
      related: [LINKS.gb1, LINKS.gb4, LINKS.r500, LINKS.site, LINKS.hub],
      read: [READ.nvme, READ.choose, READ.cost],
    };
  },
  '4-gb': () => {
    const c = base({ slug: '4-gb', plans: ALL.filter((p) => p.ram >= 4 && p.priceRub <= 2500), highlight: (p) => p.ram === 4, name: 'VPS с 4 ГБ', h1: 'Самый дешёвый VPS с 4 ГБ памяти', campaign: 'cheap_4gb', crumb: '4 ГБ' });
    const two = cheapestWith(c.plans.filter((p) => !prepaid(p)), { ram: 4, cpu: 2 });
    return {
      ...c,
      lead: leadOf(c, 'Самый дешёвый VPS с 4 ГБ памяти'),
      sections: [
        { h2: '4 ГБ тянут интернет-магазин вместе с базой на одном сервере', paras: [
          'Магазин на 3 000 товаров держит MySQL с индексами примерно в 1 ГБ, PHP-FPM ещё 1-1,5 ГБ, Redis под кэш 200 МБ, и остаётся запас на распродажу. Тот же объём подходит 1С с небольшой базой, n8n с десятками сценариев и стеку из 4-6 контейнеров.',
          ['Подробнее: ', LINKS.shop, ', ', LINKS.bitrix, '.']] },
        { h2: 'Два ядра нормальная пара к 4 ГБ', paras: [
          two ? `Самый дешёвый тариф с 4 ГБ и двумя ядрами без предоплаты: ${planName(two)} за ${priceText(two)}. Одно ядро с 4 ГБ подходит кэшу или одной базе, всё, что обслуживает много запросов сразу, просит два.` : 'Одно ядро с 4 ГБ подходит кэшу или одной базе, всё, что обслуживает много запросов сразу, просит два.',
          prepayPara(c)] },
      ],
      faq: [
        { q: 'Какой самый дешёвый VPS с 4 ГБ RAM', a: c.first ? `На ${dmy(c.checked)}: ${planSentence(c.first)}.${c.monthly && c.monthly !== c.first ? ` Без предоплаты: ${planName(c.monthly)} за ${priceText(c.monthly)}.` : ''}` : 'Сейчас нет тарифа с 4 ГБ со свежей ценой' },
        { q: 'Хватит ли 4 ГБ для 1С', a: 'Для файловой базы на 1-3 пользователя да. Для клиент-серверной 1С с PostgreSQL и несколькими пользователями закладывайте от 8 ГБ' },
        { q: 'Что лучше: один сервер на 4 ГБ или два по 2 ГБ', a: 'Для одного приложения один сервер: проще бэкап и мониторинг, приложение и база делят общую память. Два сервера нужны, когда важна изоляция или резерв' },
      ],
      related: [LINKS.gb2, LINKS.gb8, LINKS.shop, LINKS.bitrix, LINKS.hub],
      read: [READ.bitrix, READ.nvme, READ.cost],
    };
  },
  '8-gb': () => {
    const c = base({ slug: '8-gb', plans: ALL.filter((p) => p.ram >= 8 && p.priceRub <= 5000), highlight: (p) => p.ram === 8, name: 'VPS с 8 ГБ', h1: 'Самый дешёвый VPS с 8 ГБ памяти', campaign: 'cheap_8gb', crumb: '8 ГБ' });
    return {
      ...c,
      lead: leadOf(c, 'Самый дешёвый VPS с 8 ГБ памяти'),
      sections: [
        { h2: '8 ГБ нужны базе данных под нагрузкой и клиент-серверной 1С', paras: [
          'Восемь гигабайт берут, когда рабочий набор базы перестаёт помещаться в память: PostgreSQL под 1С на 5-10 пользователей, Bitrix «Бизнес» с большим каталогом, несколько проектов на одном сервере, GitLab.',
          ['Подробнее: ', LINKS.db, ', ', LINKS.bitrix, '.']] },
        { h2: 'На 8 ГБ важнее диск и ядра, чем цена', paras: [
          'При таком объёме памяти узким местом становится диск: на базе NVMe отвечает в разы быстрее SATA SSD. Смотрите и на число ядер: 8 ГБ с одним ядром будут простаивать на любой серьёзной нагрузке.',
          prepayPara(c)] },
      ],
      faq: [
        { q: 'Какой самый дешёвый VPS с 8 ГБ RAM', a: c.first ? `На ${dmy(c.checked)}: ${planSentence(c.first)}.` : 'Сейчас нет тарифа с 8 ГБ со свежей ценой' },
        { q: 'Когда переходить с 4 на 8 ГБ', a: 'Когда база данных перестаёт помещаться в память и страницы, которые открывались мгновенно, начинают думать секунду, а сервер уходит в swap. Это сигнал добавить память, а не ядра' },
        { q: 'Сколько ядер брать к 8 ГБ', a: 'От двух, для 1С и нагруженных баз лучше четыре' },
      ],
      related: [LINKS.gb4, LINKS.db, LINKS.bitrix, LINKS.nvme, LINKS.hub],
      read: [READ.bitrix, READ.nvme, READ.cost],
    };
  },
  nvme: () => {
    const c = base({ slug: 'nvme', plans: ALL.filter((p) => p.diskType === 'NVMe' && p.priceRub <= 1500), name: 'VPS на NVMe', h1: 'Дешёвые VPS на NVMe-дисках', campaign: 'cheap_nvme', crumb: 'NVMe' });
    const ru = c.plans.find((p) => p.geo === 'ru');
    return {
      ...c,
      lead: leadOf(c, 'Самый дешёвый VPS на NVMe'),
      sections: [
        { h2: 'NVMe заметен на базе данных и магазине, а не на статическом сайте', paras: [
          'NVMe отвечает на тысячи мелких операций чтения в разы быстрее SATA SSD. На сайте с базой данных, 1С и магазине с фильтрами это видно по времени ответа. Статический сайт из кэша разницы почти не почувствует.',
          ['Подробно: ', { href: READ.nvme.href, text: 'NVMe против SSD, когда разница заметна' }, '.']] },
        { h2: 'NVMe в России', paras: [
          ru ? `Самый дешёвый NVMe-тариф с размещением в России: ${planName(ru)} за ${priceText(ru)}.` : 'Российские NVMe-тарифы смотрите на странице «VPS в России».',
          ['Все российские площадки: ', LINKS.ru, '. ', prepayPara(c)]] },
      ],
      faq: [
        { q: 'Какой самый дешёвый VPS с NVMe', a: c.first ? `На ${dmy(c.checked)}: ${planSentence(c.first)}.` : 'Сейчас нет NVMe-тарифа со свежей ценой' },
        { q: 'Стоит ли переплачивать за NVMe', a: 'Если на сервере база данных, магазин или 1С, да: разница в цене обычно меньше 100 ₽, а время ответа заметно лучше. Для бота и статики можно взять обычный SSD' },
        { q: 'Как проверить, что диск действительно NVMe', a: 'В описании тарифа ищите NVMe явно, а на сервере запустите fio или посмотрите lsblk: у NVMe устройство называется nvme0n1. Часть провайдеров пишет просто «SSD», даже когда диск быстрый, поэтому смотрите описание' },
      ],
      related: [LINKS.gb2, LINKS.gb4, LINKS.db, LINKS.ru, LINKS.hub],
      read: [READ.nvme, READ.choose],
    };
  },
  'pochasovaya-oplata': () => {
    const c = base({ slug: 'pochasovaya-oplata', plans: ALL.filter((p) => hourly(p) && p.priceRub <= 3000), name: 'VPS с почасовой оплатой', h1: 'VPS с почасовой оплатой', campaign: 'cheap_hourly', crumb: 'Почасовая оплата' });
    return {
      ...c,
      lead: leadOf(c, 'Самый дешёвый VPS у провайдера с почасовой оплатой'),
      sections: [
        { h2: 'Почасовая оплата нужна для тестов и временных серверов', paras: [
          'Сервер списывает деньги за каждый час работы, удалили его и платить перестали. Удобно для тестового стенда на выходные, разового расчёта, временного зеркала или проверки провайдера перед переездом.',
          'В таблице провайдеры, у которых почасовая тарификация есть в панели. Цена указана за месяц работы без перерыва, за час выйдет примерно эта сумма, делённая на 720.'] },
        { h2: 'Почасовая оплата не всегда дешевле', paras: [
          'Если сервер работает круглые сутки весь месяц, почасовая тарификация обычно выходит дороже или равна помесячной. Выгода появляется только у серверов, которые живут дни или недели.',
          ['Тарифы с самой низкой ценой при длинной предоплате собраны на странице ', LINKS.hub, ', без предоплаты: ', LINKS.monthly, '.']] },
      ],
      faq: [
        { q: 'Какие VPS-провайдеры берут оплату по часам', a: c.provCount ? `В нашей базе это ${[...new Set(c.plans.map((p) => getProvider(p.providerSlug)?.name))].join(', ')}.` : 'Сейчас в базе нет таких провайдеров со свежими ценами' },
        { q: 'Списывают ли деньги за выключенный сервер', a: 'У большинства да: выключенный сервер продолжает занимать диск и IP-адрес. Чтобы платить перестали, сервер нужно удалить. Иногда остаётся плата за снапшоты' },
        { q: 'Сколько стоит час работы VPS', a: 'Примерно месячная цена, делённая на 720. Например, тариф за 720 ₽ в месяц стоит около рубля в час' },
      ],
      related: [LINKS.monthly, LINKS.hub, LINKS.nvme, LINKS.catalog],
      read: [READ.choose, READ.cost],
    };
  },
  'bez-predoplaty': () => {
    const c = base({ slug: 'bez-predoplaty', plans: ALL.filter((p) => !prepaid(p) && p.priceRub <= 1000), name: 'VPS без предоплаты', h1: 'Дешёвые VPS без предоплаты за год', campaign: 'cheap_monthly', crumb: 'Без предоплаты' });
    return {
      ...c,
      lead: leadOf(c, 'Самый дешёвый VPS с помесячной оплатой'),
      sections: [
        { h2: 'Помесячная оплата бережёт деньги, если проект может переехать', paras: [
          'Здесь только тарифы, которые можно оплачивать месяц за месяцем, без обязательной оплаты за год вперёд. Цена чуть выше самых дешёвых предложений с предоплатой, зато при переезде вы не теряете оплаченные месяцы.',
          ['Тарифы с самой низкой ценой при оплате за год: ', LINKS.hub, '.']] },
        { h2: 'Как не переплатить на помесячной оплате', paras: [
          'Сравнивайте цену за гигабайт памяти и тип диска, а не только итоговую сумму. Проверьте, входит ли в цену IPv4-адрес и бэкапы: у части провайдеров это отдельные строки счёта.',
          ['Полная таблица с сортировкой по любому столбцу: ', LINKS.catalog, '.']] },
      ],
      faq: [
        { q: 'Какой самый дешёвый VPS без предоплаты за год', a: c.first ? `На ${dmy(c.checked)}: ${planSentence(c.first)}.` : 'Сейчас нет такого тарифа со свежей ценой' },
        { q: 'Насколько дороже помесячная оплата', a: 'Обычно на 10-30% по сравнению с оплатой за год у того же провайдера. Если проект точно проживёт год, предоплата выгоднее' },
        { q: 'Можно ли потом перейти на оплату за год', a: 'У большинства провайдеров да: срок оплаты меняют в панели, иногда со скидкой за длинный период' },
      ],
      related: [LINKS.hub, LINKS.hourly, LINKS.r500, LINKS.catalog],
      read: [READ.cost, READ.choose],
    };
  },
  obzor: () => {
    const c = base({ slug: '', plans: ALL.slice(0, 30), name: 'Самые дешёвые VPS', h1: 'Самые дешёвые VPS', campaign: 'cheap_hub', crumb: null });
    return {
      ...c,
      lead: leadOf(c, 'Самый дешёвый VPS в базе'),
      sections: [
        { h2: 'Выберите бюджет или объём памяти', paras: [
          ['По бюджету: ', LINKS.r300, ', ', LINKS.r500, '. По памяти: ', LINKS.gb1, ', ', LINKS.gb2, ', ', LINKS.gb4, ', ', LINKS.gb8, '.'],
          ['По условиям: ', LINKS.nvme, ', ', LINKS.hourly, ', ', LINKS.monthly, '.']] },
        { h2: 'Самая низкая цена не всегда самая выгодная', paras: [
          prepayPara(c),
          ['Перед выбором проверьте, где стоит сервер и чем его можно оплатить: зарубежные провайдеры обычно не принимают карты российских банков. Подробнее: ', { href: '/vps-s-oplatoj/kartoj-mir/', text: 'VPS с оплатой картой МИР' }, '.']] },
      ],
      faq: [
        { q: 'Какой самый дешёвый VPS сейчас', a: c.first ? `На ${dmy(c.checked)}: ${planSentence(c.first)}.${c.monthly && c.monthly !== c.first ? ` Без предоплаты: ${planName(c.monthly)} за ${priceText(c.monthly)}.` : ''}` : 'Сейчас нет тарифов со свежей ценой' },
        { q: 'Как часто обновляются цены', a: 'Раз в неделю мы сверяем цены с сайтами провайдеров. Тариф без проверки дольше 35 дней скрывается, а не показывается со старой ценой' },
      ],
      related: [LINKS.r300, LINKS.r500, LINKS.gb2, LINKS.gb4, LINKS.nvme, LINKS.monthly, LINKS.catalog],
      read: [READ.choose, READ.stale, READ.cost],
    };
  },
};

export const CHEAP_SLUGS = Object.keys(PAGES).filter((s) => s !== 'obzor');
export function cheapPage(slug) {
  const f = PAGES[slug];
  return f ? f() : null;
}
