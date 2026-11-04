/**
 * Сравнение двух провайдеров для посадочных «A или B» (волна 04.11.2026,
 * механизм перенесён с servercalc.com, где он работает с 28.10.2026).
 * Всё из проверенных тарифов и профиля провайдера: после сверки цен текст
 * страницы пересобирается сам
 */
import { getProvider, plansOf, getGeoByCode } from './data';
import { byPrice, checkedAt } from './answer-first';
import { FEATURE_KEYS } from './provider-stats';
import { paymentList } from './payments';
import { PROMOS } from './promos';

export function sideOf(slug) {
  const provider = getProvider(slug);
  if (!provider) return null;
  const plans = plansOf(slug).slice().sort(byPrice);
  const at = (ram) => plans.find((p) => p.ram >= ram) || null;
  const regions = new Set();
  for (const p of plans) {
    if (p.geo && p.geo !== 'global') regions.add(p.geo);
    for (const g of p.alsoIn || []) regions.add(g);
  }
  const currencies = [...new Set(plans.map((p) => p.currency).filter(Boolean))];
  return {
    slug,
    provider,
    name: provider.name,
    plans,
    entry: plans[0] || null,
    gb2: at(2),
    gb4: at(4),
    gb8: at(8),
    maxRam: plans.length ? Math.max(...plans.map((p) => p.ram)) : 0,
    regions: [...regions].map((c) => getGeoByCode(c)?.name || c),
    ruPlans: plans.filter((p) => p.geo === 'ru'),
    features: FEATURE_KEYS.filter((k) => provider.features?.[k]),
    nvme: plans.some((p) => p.diskType === 'NVMe'),
    prepay: plans.some((p) => p.term && p.term > 1),
    allPrepay: plans.length > 0 && plans.every((p) => p.term && p.term > 1),
    currencies,
    rub: currencies.length === 1 && currencies[0] === 'RUB',
    pay: paymentList(slug),
    promos: PROMOS.filter((x) => x.provider?.slug === slug),
    pros: provider.pros || [],
    cons: provider.cons || [],
    description: provider.description || '',
    tasks: provider.tasks || [],
    locations: [...new Set(plans.map((p) => p.location).filter(Boolean))],
  };
}

export function pairOf(a, b) {
  const A = sideOf(a);
  const B = sideOf(b);
  const plans = [...(A?.plans || []), ...(B?.plans || [])].sort(byPrice);
  return { A, B, plans, checked: checkedAt(plans) };
}

/** Кто дешевле на заданном объёме памяти: { winner, loser, w, l, diff } */
export function cheaperAt(A, B, key) {
  const a = A?.[key];
  const b = B?.[key];
  if (!a || !b) return null;
  if (Math.round(a.priceRub) === Math.round(b.priceRub)) return { tie: true, a, b };
  return a.priceRub < b.priceRub
    ? { winner: A, loser: B, w: a, l: b, diff: b.priceRub - a.priceRub }
    : { winner: B, loser: A, w: b, l: a, diff: a.priceRub - b.priceRub };
}
