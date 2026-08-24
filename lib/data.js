import providersRaw from '@/data/providers.json';
import plansRaw from '@/data/plans.json';
import taxonomy from '@/data/taxonomy.json';
import { STALE_AFTER_DAYS } from './site';
import { daysBetween } from './format';

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

export const PROVIDERS = providersRaw;

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
export const PLANS = plansRaw.map((p) => ({ ...p, age: ageOf(p), fresh: ageOf(p) <= STALE_DAYS }));
export const VISIBLE_PLANS = IS_DEMO ? PLANS : PLANS.filter((p) => p.fresh);
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
  return PROVIDERS.find((p) => p.slug === slug) || null;
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
  return VISIBLE_PLANS.filter((p) => p.providerSlug === slug).sort((a, b) => a.priceRub - b.priceRub);
}

export function allPlansOf(slug) {
  return PLANS.filter((p) => p.providerSlug === slug).sort((a, b) => a.priceRub - b.priceRub);
}

export function minPriceOf(slug) {
  const list = plansOf(slug);
  return list.length ? list[0].priceRub : null;
}

export function providersForTask(taskSlug) {
  return PROVIDERS.filter((p) => (p.tasks || []).includes(taskSlug));
}

export function providersForGeo(geoCode) {
  // Провайдер попадает в регион только при наличии проверенного тарифа именно с
  // этой локацией, а не просто заявленного региона в профиле.
  const withGeo = new Set(VISIBLE_PLANS.filter((p) => p.geo === geoCode).map((p) => p.providerSlug));
  return PROVIDERS.filter((p) => withGeo.has(p.slug));
}

export function plansForGeo(geoCode) {
  return VISIBLE_PLANS.filter((p) => p.geo === geoCode).sort((a, b) => a.priceRub - b.priceRub);
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
export function calculatorPayload() {
  return {
    providers: PROVIDERS.map((p) => ({
      slug: p.slug,
      name: p.name,
      color: p.color,
      country: p.country,
      geos: p.geos,
      tasks: p.tasks,
      features: p.features,
      partner: p.affiliateStatus === 'active',
      affiliateStatus: p.affiliateStatus,
      url: p.url,
      // признак «ссылку не трогать метками» обязан доехать до клиента,
      // иначе калькулятор и каталог соберут адрес с UTM
      noUtm: p.noUtm || false,
      site: p.site,
      requirements: providerRequirements(p),
      description: p.description,
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
    })),
    tasks: TASKS,
    geos: GEO_PAGES,
    requirements: REQUIREMENTS,
    stats: STATS,
  };
}
