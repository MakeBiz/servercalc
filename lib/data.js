import providersFile from '@/data/providers.json';

// Условия партнёрок (ставка, выплата, внутренние заметки) нужны только кабинету и проверкам.
// На страницы они не идут: объект провайдера уходит в клиентские компоненты целиком,
// и раньше эти поля попадали в исходный код каждой страницы (08.11.2026)
const providersRaw = providersFile.map(({ affiliate, ...p }) => p);
import plansRaw from '@/data/plans.json';
import taxonomy from '@/data/taxonomy.json';
import { STALE_AFTER_DAYS } from './site';
import { daysBetween } from './format';
import { CATALOG_HIDDEN, CATALOG, CATALOG_ON } from './catalog';

/**
 * Доступ к данным и правило свежести цен.
 *
 * Правило из брифа: тариф, не проверявшийся дольше N дней, скрывается,
 * а не показывается со старой ценой. Это главный дифференциатор проекта:
 * у 11 из 13 проверенных конкурентов даты проверки нет вообще.
 *
 * Пока taxonomy.meta.dataStatus равен "demo", правило не режет витрину:
 * демонстрационные цены не обязаны быть свежими, но на всех страницах висит
 * честная плашка. Как только парсер начнёт писать реальные цены, поставить
 * meta.dataStatus = "live", и правило заработает строго
 */

const STALE_DAYS = Number(process.env.SERVERCALC_STALE_DAYS || STALE_AFTER_DAYS);

/** Дата сборки. Статическая генерация фиксирует её в момент build */
export const BUILD_DATE = new Date().toISOString().slice(0, 10);

export const META = taxonomy.meta;
export const IS_DEMO = META.dataStatus === 'demo';
export const TASKS = taxonomy.tasks;
/**
 * Полный список географий: нужен, чтобы правильно подписать локацию тарифа
 * и перечислить площадки провайдера. Сюда входят и направления без своей
 * страницы, например США: провайдер там присутствует, а витрины у нас нет,
 * пока нет проверенных тарифов
 */
export const GEOS = taxonomy.geos;

/**
 * Географии, у которых есть собственная страница: по ним строятся адреса,
 * карта сайта, переключатели в калькуляторе и каталоге. Чтобы открыть
 * направление, достаточно убрать у него "page": false в data/taxonomy.json
 */
export const GEO_PAGES = taxonomy.geos.filter((g) => g.page !== false);
export const REQUIREMENTS = taxonomy.requirements;

// скрытые в кабинете (Маркетинг · Провайдеры на сайтах) не попадают никуда: ни в подбор, ни в каталог, ни в страницы
export const PAGE_PROVIDERS = providersRaw.filter((p) => !CATALOG_HIDDEN.has(p.slug));

/* ---------- «только страница» (pageOnly, 23.11.2026, решение Антона по RackNerd, как на servercalc.com с 21.11) ----------
   Провайдер с pageOnly: true не попадает в подбор, каталог, списки, подборки и рейтинги.
   Остаются его страница /provajdery/<slug>, сравнения «X или Y» и новости: их цитируют нейросети и поиск */
const PAGE_ONLY = new Set(PAGE_PROVIDERS.filter((p) => p.pageOnly).map((p) => p.slug));
export const isPageOnly = (slug) => PAGE_ONLY.has(slug);
/** Провайдеры для подбора и всех списков: без pageOnly. Для страниц провайдеров PAGE_PROVIDERS */
export const PROVIDERS = PAGE_PROVIDERS.filter((p) => !PAGE_ONLY.has(p.slug));

/**
 * Единый порядок провайдеров для ВСЕХ списков на сайте (главная, каталог,
 * провайдеры, задачи, гео): «Оптимально» (с 04.11.2026, решение Антона), 60% надёжность провайдера
 * и 40% цена его самого дешёвого тарифа относительно самого дешёвого в списке (lib/quality.js).
 * Без проверенной цены в конце. Партнёрство на порядок не влияет
 */
import featuredRaw from '@/data/featured.json';
import { qualityOf, optimalScore, partnerBonus, PARTNER_BONUS, PARTNER_SLUGS } from './quality';
import { logoOf } from './logos';
export const providerPriority = () => 0;
export function optimalOrder(list) {
  const mins = list.map((p) => minPriceOf(p.slug)).filter((x) => x != null);
  const floor = mins.length ? Math.min(...mins) : null;
  const sc = (p) => {
    const m = minPriceOf(p.slug);
    return m == null ? -1 : optimalScore(qualityOf(p).score, m, floor, false, partnerBonus(p.slug));
  };
  return [...list].sort((a, b) => sc(b) - sc(a) || (minPriceOf(a.slug) ?? Infinity) - (minPriceOf(b.slug) ?? Infinity) || a.name.localeCompare(b.name));
}
export function sortProvidersByPriority(list) {
  return optimalOrder(list);
}

function ageOf(plan) {
  return daysBetween(plan.verifiedAt, BUILD_DATE);
}

export function planAge(plan) {
  return ageOf(plan);
}

export function isFresh(plan) {
  return ageOf(plan) <= STALE_DAYS;
}

/** Тарифы, которые показываем на витрине */
export const PLANS = plansRaw.filter((p) => !CATALOG_HIDDEN.has(p.providerSlug)).map((p) => ({ ...p, age: ageOf(p), fresh: ageOf(p) <= STALE_DAYS }));
/** Свежие тарифы со страницами pageOnly-провайдеров: для страницы провайдера и сравнений */
export const PAGE_PLANS = IS_DEMO ? PLANS : PLANS.filter((p) => p.fresh);
/** Тарифы для подбора, каталога и списков: без pageOnly-провайдеров */
export const VISIBLE_PLANS = PAGE_PLANS.filter((p) => !PAGE_ONLY.has(p.providerSlug));
export const HIDDEN_PLANS = PLANS.filter((p) => !p.fresh);

/** Дата последней проверки по всей базе */
export const DATA_VERIFIED_AT = PLANS.reduce(
  (max, p) => (p.verifiedAt > max ? p.verifiedAt : max),
  PLANS[0]?.verifiedAt || BUILD_DATE
);

export const STATS = {
  providers: PROVIDERS.length,
  partners: PROVIDERS.filter((p) => p.affiliateStatus === 'active').length,
  plans: VISIBLE_PLANS.length,
  plansTotal: PLANS.length,
  hidden: HIDDEN_PLANS.length,
  geos: GEO_PAGES.length,
  tasks: TASKS.length,
  verifiedAt: DATA_VERIFIED_AT,
  staleDays: STALE_DAYS,
  demo: IS_DEMO,
};

/* ---------- выборки ---------- */

export function getProvider(slug) {
  return PAGE_PROVIDERS.find((p) => p.slug === slug) || null;
}

/**
 * Раскрытие прибавки партнёрам одной строкой (24.11.2026). До этого подвал, «О проекте» и FAQ
 * главной писали «порядок от вознаграждения не зависит», а методология и llms.txt раскрывали
 * прибавку: тексты разошлись при смене списка. Теперь имена берутся из data/ranking.json,
 * при ежемесячной смене партнёров все тексты меняются вместе с формулой
 */
export const BONUS_PARTNER_NAMES = PARTNER_SLUGS.map((s) => getProvider(s)?.name || s);
export function bonusPartnersText() {
  const n = BONUS_PARTNER_NAMES;
  return n.length > 1 ? `${n.slice(0, -1).join(', ')} и ${n[n.length - 1]}` : n.join('');
}
/** «партнёры сервиса (AdminVPS, Timeweb Cloud и Aéza) получают в нём прибавку 10 баллов» */
export function bonusDisclosure() {
  if (!PARTNER_BONUS || !BONUS_PARTNER_NAMES.length) return 'от вознаграждения он не зависит';
  return `партнёры сервиса (${bonusPartnersText()}) получают в нём раскрытую прибавку ${PARTNER_BONUS} баллов`;
}

export function getTask(slug) {
  return TASKS.find((t) => t.slug === slug) || null;
}

export function getGeo(slug) {
  return GEOS.find((g) => g.slug === slug) || null;
}

export function getGeoByCode(code) {
  return GEOS.find((g) => g.code === code) || null;
}

export function getRequirement(code) {
  return REQUIREMENTS.find((r) => r.code === code) || null;
}

export function plansOf(slug) {
  return PAGE_PLANS.filter((p) => p.providerSlug === slug).sort((a, b) => a.priceRub - b.priceRub);
}

export function allPlansOf(slug) {
  return PLANS.filter((p) => p.providerSlug === slug).sort((a, b) => a.priceRub - b.priceRub);
}

export function minPriceOf(slug) {
  const list = plansOf(slug);
  return list.length ? list[0].priceRub : null;
}

export function providersForTask(taskSlug) {
  return sortProvidersByPriority(PROVIDERS.filter((p) => (p.tasks || []).includes(taskSlug)));
}

export function providersForGeo(geoCode) {
  // Провайдер попадает в регион только при наличии проверенного тарифа именно с
  // этой локацией, а не просто заявленного региона в профиле.
  const withGeo = new Set(VISIBLE_PLANS.filter((p) => p.geo === geoCode || (p.alsoIn || []).includes(geoCode)).map((p) => p.providerSlug));
  return sortProvidersByPriority(PROVIDERS.filter((p) => withGeo.has(p.slug)));
}

export function plansForGeo(geoCode) {
  return VISIBLE_PLANS.filter((p) => p.geo === geoCode || (p.alsoIn || []).includes(geoCode)).sort((a, b) => a.priceRub - b.priceRub);
}

/**
 * Страницы стран внутри региона (24.11.2026, первая /vps/niderlandy по паспорту темы ru-026).
 * Описание в taxonomy.countryPages, тарифы берутся из региона-родителя и отбираются по стране
 * из строки локации (lib/countries.js): так в странице сразу видны и мультилокационные тарифы
 * (AdminVPS, Hostman, Fornex), а подбор на странице открывается с регионом и страной
 */
export const COUNTRY_PAGES = (taxonomy.countryPages || [])
  .map((c) => ({ ...c, code: getGeo(c.parent)?.code || null, parentName: getGeo(c.parent)?.name || '' }))
  .filter((c) => c.code);
export const ALL_GEO_PAGES = [...GEO_PAGES, ...COUNTRY_PAGES];
export function getGeoPage(slug) {
  return COUNTRY_PAGES.find((c) => c.slug === slug) || getGeo(slug);
}
export function plansForGeoPage(g) {
  const base = plansForGeo(g.code);
  return g.country ? base.filter((p) => (planCountries(p) || []).includes(g.country)) : base;
}
export function providersForGeoPage(g) {
  if (!g.country) return providersForGeo(g.code);
  const withCountry = new Set(plansForGeoPage(g).map((p) => p.providerSlug));
  return sortProvidersByPriority(PROVIDERS.filter((p) => withCountry.has(p.slug)));
}

/** Выполняет ли провайдер требование. NVMe проверяется по тарифам, остальное по провайдеру */
export function providerMeets(provider, code) {
  if (code === 'nvme') {
    return plansOf(provider.slug).some((p) => p.diskType === 'NVMe');
  }
  return Boolean(provider.features?.[code]);
}

/** Список кодов требований, которые провайдер закрывает */
export function providerRequirements(provider) {
  return REQUIREMENTS.filter((r) => providerMeets(provider, r.code)).map((r) => r.code);
}

/** Плоский срез для клиентских компонентов: каталог и калькулятор */
export function catalogRows() {
  return VISIBLE_PLANS.map((plan) => {
    const provider = getProvider(plan.providerSlug);
    return {
      ...plan,
      providerName: provider?.name || plan.providerSlug,
      providerColor: provider?.color || '#C6A15B',
      partner: provider?.affiliateStatus === 'active',
      noUtm: provider?.noUtm || false,
      geoName: getGeoByCode(plan.geo)?.name || plan.geo,
      requirements: providerRequirements(provider || {}),
    };
  });
}

/** Данные, которые калькулятор получает с сервера один раз */
import paymentsData from '@/data/payments.json';
const PAYMENTS = paymentsData.payments || {};

export function calculatorPayload() {
  return {
    providers: PROVIDERS.map((p) => ({
      slug: p.slug,
      name: p.name,
      color: p.color,
      logo: logoOf(p.slug),
      country: p.country,
      geos: p.geos,
      tasks: p.tasks,
      features: p.features,
      payments: PAYMENTS[p.slug] || {},
      partner: p.affiliateStatus === 'active',
      affiliateStatus: p.affiliateStatus,
      url: p.url,
      // признак «ссылку не трогать метками» обязан доехать до клиента,
      // иначе калькулятор и каталог соберут адрес с UTM
      noUtm: p.noUtm || false,
      site: p.site,
      requirements: providerRequirements(p),
      // надёжность для сортировки «Оптимально» (04.11.2026) и год основания для пометки «молодая компания»
      quality: qualityOf(p).score,
      // прибавка партнёру сервиса к баллу «Оптимально» (09.11.2026, раскрыта на /metodologiya)
      bonus: partnerBonus(p.slug),
      years: qualityOf(p).years,
      description: p.description,
      virtualization: p.virtualization,
      pros: (p.pros || []).slice(0, 2),
    })),
    plans: VISIBLE_PLANS.map((p) => ({
      id: p.id,
      providerSlug: p.providerSlug,
      name: p.name,
      cpu: p.cpu,
      ram: p.ram,
      disk: p.disk,
      diskType: p.diskType,
      geo: p.geo,
      priceRub: p.priceRub,
      verifiedAt: p.verifiedAt,
      ipv4: p.ipv4,
      term: p.term || null,
      alsoIn: p.alsoIn || null,
      trafficTb: p.trafficTb ?? null,
      location: p.location || null,
      cityByRu: p.cityByRu || null,
      countries: planCountries(p),
      portGbit: planPortGbit(p),
    })),
    tasks: TASKS,
    geos: GEO_PAGES,
    requirements: REQUIREMENTS,
    stats: STATS,
    // рекламный блок над результатами подбора с пометкой «Реклама» (04.11.2026)
    featured: getProvider(featuredRaw?.provider) ? { slug: featuredRaw.provider, label: featuredRaw.label, adLabel: featuredRaw.adLabel, labelWhy: featuredRaw.labelWhy, promo: featuredRaw.promo, reasons: featuredRaw.reasons, taskReasons: featuredRaw.taskReasons } : null,
  };
}

/* ---------- порядок на странице провайдеров (29.10.2026, решение Антона) ----------
   Наверху наши основные провайдеры в порядке приоритета из кабинета
   (Маркетинг · Провайдеры на сайтах, список order), остальные по минимальной цене.
   В калькуляторе подбора порядок по-прежнему задают только условия и цена */
const ORDER_FALLBACK = ['timeweb', 'adminvps', 'aeza'];
export const PROVIDER_ORDER = CATALOG_ON && Array.isArray(CATALOG.order) && CATALOG.order.length ? CATALOG.order : ORDER_FALLBACK;
export function sortForProvidersPage(list) {
  // с 04.11.2026 тот же порядок «Оптимально», что и во всех списках
  return optimalOrder(list);
}

export { planCountries, planPortGbit } from './countries';
import { planCountries, planPortGbit } from './countries';
