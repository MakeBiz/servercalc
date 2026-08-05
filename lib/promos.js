import raw from '@/data/promos.json';
import { SITE } from './site';
import { getProvider } from './data';

/**
 * Акции и промокоды. Живут по тем же правилам, что цены в каталоге:
 * показываем только то, что сверено недавно. Просроченная акция хуже,
 * чем её отсутствие: человек вводит промокод, код не работает,
 * и виноваты в его глазах мы, а не провайдер
 */

const TODAY = new Date().toISOString().slice(0, 10);

function freshEnough(verifiedAt) {
  if (!verifiedAt) return false;
  const age = (new Date(TODAY) - new Date(verifiedAt)) / 86400000;
  return age <= SITE.staleAfterDays;
}

export const PROMOS_ALL = (raw.promos || []).map((p) => ({
  ...p,
  provider: getProvider(p.provider) || null,
}));

export const PROMOS = PROMOS_ALL.filter(
  (p) =>
    p.provider &&
    freshEnough(p.verifiedAt) &&
    (!p.validUntil || p.validUntil >= TODAY)
);

export const PROMOS_HIDDEN = PROMOS_ALL.length - PROMOS.length;
export const HAS_PROMOS = PROMOS.length > 0;
