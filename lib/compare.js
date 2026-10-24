import raw from '@/data/comparisons.json';
import { getProvider, plansOf, minPriceOf, TASKS, GEOS, REQUIREMENTS, providerMeets } from './data';
import { PROMOS } from './promos';

/**
 * Сравнения провайдеров «X или Y» (/sravnenie/<slug>/, с 24.10.2026).
 * Всё считается из каталога при сборке, поэтому сравнение не стареет:
 * обновили цены или промокод, страница пересоберётся с новыми цифрами.
 * Пара показывается, только если оба провайдера видны в кабинете
 */
export const ALL_PAIRS = raw.pairs || [];
export const PAIRS = ALL_PAIRS.filter((p) => getProvider(p.a) && getProvider(p.b));

export function getPair(slug) {
  return PAIRS.find((p) => p.slug === slug) || null;
}

/** Сравнения, где участвует провайдер: для перелинковки со страницы провайдера */
export function pairsOf(providerSlug) {
  return PAIRS.filter((p) => p.a === providerSlug || p.b === providerSlug);
}

export function side(slug) {
  const provider = getProvider(slug);
  const plans = plansOf(slug);
  return {
    provider,
    plans,
    min: minPriceOf(slug),
    maxRam: plans.length ? Math.max(...plans.map((p) => p.ram)) : null,
    nvme: plans.some((p) => p.diskType === 'NVMe'),
    geos: GEOS.filter((g) => (provider.geos || []).includes(g.code)),
    planGeos: GEOS.filter((g) => plans.some((p) => p.geo === g.code || (p.alsoIn || []).includes(g.code))),
    tasks: TASKS.filter((t) => (provider.tasks || []).includes(t.slug)),
    reqs: REQUIREMENTS.filter((r) => providerMeets(provider, r.code)),
    promos: PROMOS.filter((x) => x.provider?.slug === slug),
  };
}

export function pairTitle(pair) {
  return `${getProvider(pair.a).name} или ${getProvider(pair.b).name}`;
}
