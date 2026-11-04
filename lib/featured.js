import raw from '@/data/featured.json';
import { getProvider, minPriceOf } from './data';

/**
 * Основной партнёр (04.11.2026): первая карточка подбора и первая строка списков, всегда с пометкой.
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
