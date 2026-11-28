/**
 * Дата последнего изменения страницы (28.11.2026, аудит практик SEO и GEO).
 *
 * Один источник для трёх мест: dateModified в разметке, дата на самой странице
 * и lastmod в карте сайта. Страницам без своей даты в разметке scripts/postbuild.mjs
 * ставит узел WebPage с датой из карты сайта, поэтому верная дата здесь это верная дата везде. До этого карта отдавала одну дату на все страницы каталога,
 * у страниц-документов стояла константа от 06.08, а на 41 странице даты в разметке
 * не было совсем. Поисковик перестаёт верить lastmod, если он расходится со страницей
 *
 * Правило: страница с ценами живёт по дате последней сверки именно её тарифов,
 * страница-документ по дате правки текста из DOC_DATES
 */
import { STATS, plansOf, getTask, providersForTask, VISIBLE_PLANS, getGeoPage, plansForGeoPage } from './data';
import INDEX from '@/data/price-index.json';
import ARTICLES from '@/data/provider-articles.json';
import { checkedAt } from './answer-first';
import { cheapPage } from './cheap-pages';
import { PAYMENTS_CHECKED } from './payments';
import { pairOf } from './pair';
import { getPair } from './compare';
import { serviceBlock } from './provider-services';
import { PROXY, LLM_API } from './partners-extra';
import { PROMOS } from './promos';

/** Самая поздняя из дат вида 2026-11-28, пустые пропускаются */
export const latest = (...dates) =>
  dates.flat().filter(Boolean).map((d) => String(d).slice(0, 10)).sort().pop() || '';

/**
 * Страницы-документы: дата последней правки текста. Поменяли текст страницы,
 * поднимите дату здесь, она уйдёт в разметку, на страницу и в карту сайта
 */
export const DOC_DATES = {
  metodologiya: '2026-11-24',
  'o-proekte': '2026-11-28',
  'politika-konfidencialnosti': '2026-11-24',
  cookie: '2026-11-24',
};

/** Страницы, собранные из всей базы: каталог, списки провайдеров, задач и регионов */
export const catalogDate = () => STATS.verifiedAt;

/** Обзор провайдера: последняя сверка его тарифов на витрине или сверка текста обзора, что позже.
 *  Так же считает dateModified components/ProviderArticle.jsx */
export function providerDate(slug) {
  return latest(plansOf(slug).map((p) => p.verifiedAt), ARTICLES[slug]?.checkedAt) || STATS.verifiedAt;
}

/** Индекс цен: последняя сверка каталога или конец периода индекса, как на самой странице */
export const indexDate = () => latest(STATS.verifiedAt, INDEX.to);

/** Сравнение двух провайдеров: последняя сверка тарифов любой из сторон */
export function pairDate(slug) {
  const pair = getPair(slug);
  if (!pair) return STATS.verifiedAt;
  return checkedAt(pairOf(pair.a, pair.b).plans, '') || latest(providerDate(pair.a), providerDate(pair.b));
}

/** Страница задачи: та же выборка тарифов, что на самой странице */
export function taskDate(slug) {
  const task = getTask(slug);
  if (!task) return STATS.verifiedAt;
  const providers = providersForTask(slug);
  const suited = VISIBLE_PLANS.filter(
    (p) => p.ram >= task.ram && p.cpu >= task.cpu && providers.some((x) => x.slug === p.providerSlug)
  ).sort((a, b) => a.priceRub - b.priceRub);
  return checkedAt(suited, STATS.verifiedAt);
}

/** Страница региона или страны */
export function geoDate(slug) {
  const geo = getGeoPage(slug);
  return geo ? checkedAt(plansForGeoPage(geo), STATS.verifiedAt) : STATS.verifiedAt;
}

/** Посадочная «дешёвые VPS»: пустой slug это обзорная страница раздела */
export function cheapDate(slug) {
  return cheapPage(slug || 'obzor')?.checked || STATS.verifiedAt;
}

/** Страницы оплаты: сверка способов оплаты или цен в списке, что позже */
export const payDate = () => latest(PAYMENTS_CHECKED, STATS.verifiedAt);

/** Сервисы провайдера кроме VPS */
export const serviceDate = (providerSlug) => serviceBlock(providerSlug)?.verifiedAt || STATS.verifiedAt;

export const proxyDate = () => PROXY.verifiedAt;
export const llmApiDate = () => LLM_API.verifiedAt;

/** Акции: последняя сверка условий */
export const promoDate = () => latest(PROMOS.map((p) => p.verifiedAt)) || STATS.verifiedAt;

/** Лента материалов: дата самого свежего материала в списке */
export const postsDate = (posts) => latest(posts.map((p) => p.updated || p.date)) || STATS.verifiedAt;
