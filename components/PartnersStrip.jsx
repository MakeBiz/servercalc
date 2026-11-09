import PartnersBlock from './PartnersBlock';
import { PARTNERS, getProvider, minPriceOf } from '@/lib/data';

/** Блок «Партнёры ServerCalc» на страницах со списками (каталог, провайдеры, рейтинг): тарифы «от», пометка «Реклама» (09.11.2026) */
export default function PartnersStrip({ place = 'page' }) {
  const items = PARTNERS.providers
    .map((c) => {
      const p = getProvider(c.slug);
      const from = p ? minPriceOf(c.slug) : null;
      return p && from ? { provider: p, plan: null, from, why: c.why } : null;
    })
    .filter(Boolean);
  return <PartnersBlock items={items} label={PARTNERS.label} adLabel={PARTNERS.adLabel} campaign={`partners_${place}`} />;
}
