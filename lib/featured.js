import raw from '@/data/featured.json';
import { getProvider, minPriceOf } from './data';

/**
 * Рекламный блок (04.11.2026): данные для блока с пометкой «Реклама» и бейджа «Лучший промокод». На порядок в списках не влияет.
 * Пусто, если провайдер скрыт в кабинете
 */
export const FEATURED = getProvider(raw.provider) ? raw : null;
export const FEATURED_SLUG = FEATURED?.provider || null;

export function featuredInfo(task = null) {
  if (!FEATURED) return null;
  const extra = task && FEATURED.taskReasons?.[task];
  return {
    ...FEATURED,
    provider: getProvider(FEATURED.provider),
    min: minPriceOf(FEATURED.provider),
    reasons: extra ? [extra, ...FEATURED.reasons.slice(0, 2)] : FEATURED.reasons,
  };
}
