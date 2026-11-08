/**
 * Цена у каждой конфигурации на странице задачи (08.11.2026).
 * Отвечает на вопрос «какой VPS нужен под задачу и сколько он стоит»:
 * у карточек «Минимум», «Рабочий», «С запасом» самый дешёвый тариф,
 * который перекрывает конфигурацию, с датой проверки. Для Windows итог
 * считается вместе с лицензией (data/windows.json), провайдер без записи
 * о лицензии в итог не попадает
 */
import { withLicense, WINDOWS, WINDOWS_OFFERS } from './windows';

const fits = (row) => (p) => p.cpu >= row.cpu && p.ram >= row.ram;
const hasDisk = (row) => (p) => !row.disk || (p.disk || 0) >= row.disk;
const cheapest = (list) => [...list].sort((a, b) => a.total - b.total)[0] || null;

/** Кандидаты под Windows: тарифы с известной лицензией и отдельные Windows-тарифы */
export function windowsCandidates(plans) {
  return [
    ...plans
      .map((p) => {
        const x = withLicense(p);
        return x ? { p, total: x.total, license: x.license } : null;
      })
      .filter(Boolean),
    ...WINDOWS_OFFERS.map((o) => ({ p: o, total: o.priceRub, license: 0 })),
  ];
}

/** Самый дешёвый вариант под строку конфигурации: { p, total, license } или null */
export function cheapestForRow(row, plans, { windows = false } = {}) {
  const all = windows ? windowsCandidates(plans) : plans.map((p) => ({ p, total: p.priceRub, license: 0 }));
  const ok = all.filter((c) => fits(row)(c.p));
  return cheapest(ok.filter((c) => hasDisk(row)(c.p))) || cheapest(ok);
}

/** Самый дешёвый вариант с лицензией у каждого провайдера под конфигурацию, по возрастанию итога */
export function windowsByProvider(row, plans, limit = 6) {
  const best = new Map();
  for (const c of windowsCandidates(plans).filter((c) => fits(row)(c.p))) {
    const cur = best.get(c.p.providerSlug);
    if (!cur || c.total < cur.total) best.set(c.p.providerSlug, c);
  }
  return [...best.values()].sort((a, b) => a.total - b.total).slice(0, limit);
}

/** Провайдеры, у которых лицензия Windows Server оплачивается отдельно: [{ slug, licenseRub, verifiedAt }] */
export function separateLicenses() {
  return Object.entries(WINDOWS)
    .filter(([, w]) => !w.included && typeof w.licenseRub === 'number')
    .map(([slug, w]) => ({ slug, licenseRub: w.licenseRub, verifiedAt: w.verifiedAt }));
}
