/**
 * Windows VPS: цена с лицензией (21.10.2026).
 *
 * На витрине цены тарифов без Windows Server. Для страницы /vps-dlya/windows/
 * считаем итог «сервер + лицензия» по data/windows.json, где для каждого
 * провайдера записано, входит ли лицензия в тариф и сколько стоит в месяц,
 * с датой проверки и источником. Провайдер без записи в итог не попадает
 */
import win from '../data/windows.json';
import { price } from './format';
import { planName, specs, placeOf, termNote, dmy } from './answer-first';

export const WINDOWS = (win && win.providers) || {};
export const WINDOWS_OFFERS = (win && win.offers) || [];

/** Итог в месяц с лицензией, или null, если про лицензию у провайдера не знаем */
export function withLicense(p) {
  const w = WINDOWS[p.providerSlug];
  if (!w) return null;
  if (w.included) return { total: p.priceRub, license: 0, w };
  if (typeof w.licenseRub !== 'number') return null;
  return { total: p.priceRub + w.licenseRub, license: w.licenseRub, w };
}

/** Самый дешёвый итог с лицензией среди подходящих тарифов, в рублях */
export function windowsFrom(suited) {
  if (!suited.length) return null;
  const minCpu = Math.min(...suited.map((p) => p.cpu));
  const minRam = Math.min(...suited.map((p) => p.ram));
  const totals = [
    ...suited.map((p) => withLicense(p)).filter(Boolean).map((x) => x.total),
    ...WINDOWS_OFFERS.filter((o) => o.cpu >= minCpu && o.ram >= minRam).map((o) => o.priceRub),
  ];
  return totals.length ? Math.min(...totals) : null;
}

export function windowsLead(suited, iso) {
  if (!suited.length) return null;
  const minCpu = Math.min(...suited.map((p) => p.cpu));
  const minRam = Math.min(...suited.map((p) => p.ram));
  const priced = [
    ...suited.map((p) => ({ p, x: withLicense(p) })).filter((r) => r.x),
    ...WINDOWS_OFFERS.filter((o) => o.cpu >= minCpu && o.ram >= minRam).map((o) => ({ p: o, x: { total: o.priceRub, license: 0 } })),
  ].sort((a, b) => a.x.total - b.x.total);
  const date = dmy(iso);
  if (!priced.length) {
    const p = suited[0];
    return `Самый дешёвый сервер под Windows (4 ядра, 8 ГБ для 1С и RDP) сейчас: ${planName(p)} (${specs(p)}) за ${price(p.priceRub)} в месяц без лицензии Windows Server, проверено ${date}. Лицензию провайдеры считают отдельно, её цена указана в карточке провайдера. Ниже сравнение всех ${suited.length} подходящих тарифов.`;
  }
  const { p, x } = priced[0];
  const t = termNote(p);
  const lic = x.license ? `сервер ${price(p.priceRub)} плюс лицензия Windows Server ${price(x.license)}` : 'лицензия Windows Server уже в цене';
  const parts = [
    `Самый дешёвый Windows VPS под 1С и RDP (4 ядра, 8 ГБ) сейчас: ${planName(p)} (${specs(p)}${placeOf(p) ? `, ${placeOf(p)}` : ''}) за ${price(x.total)} в месяц вместе с лицензией (${lic}${t ? `, ${t}` : ''}), проверено ${date}.`,
  ];
  const second = priced.find((r) => r.p.providerSlug !== p.providerSlug);
  if (second) parts.push(`Следующий по цене: ${planName(second.p)} за ${price(second.x.total)} с лицензией.`);
  parts.push('Сравнивайте Windows-серверы по итогу с лицензией: голая машина дешевле, но без лицензии на ней Windows не запустить.');
  return parts.join(' ');
}
