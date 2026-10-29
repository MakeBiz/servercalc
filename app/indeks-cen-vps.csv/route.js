import providersRaw from '@/data/providers.json';
import { VISIBLE_PLANS } from '@/lib/data';

/**
 * Открытый набор цен VPS (CC BY 4.0): все тарифы каталога, которые сейчас показываются на сайте,
 * с ценой в валюте провайдера, ценой в рублях и датой сверки с сайтом провайдера.
 * Обновляется сам с каждой сверкой цен. Ссылка: https://servercalc.ru/indeks-cen-vps.csv
 */
export const dynamic = 'force-static';

const NAMES = Object.fromEntries(providersRaw.map((p) => [p.slug, p.name]));
const cell = (v) => {
  const s = v == null ? '' : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function GET() {
  const head = ['provider', 'plan', 'vcpu', 'ram_gb', 'disk_gb', 'disk_type', 'region', 'price', 'currency', 'price_rub', 'prepay_months', 'verified_at', 'source'];
  const rows = [...VISIBLE_PLANS]
    .sort((a, b) => a.priceRub - b.priceRub)
    .map((p) => [NAMES[p.providerSlug] || p.providerSlug, p.name, p.cpu, p.ram, p.disk, p.diskType, p.geo, p.price, p.currency, p.priceRub, p.term || 1, p.verifiedAt, p.source]);
  const body = '# ServerCalc VPS price dataset, CC BY 4.0, source https://servercalc.ru/indeks-cen-vps/\n' + [head, ...rows].map((r) => r.map(cell).join(',')).join('\n') + '\n';
  return new Response(body, { headers: { 'Content-Type': 'text/csv; charset=utf-8' } });
}
