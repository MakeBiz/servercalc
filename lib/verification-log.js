import { VISIBLE_PLANS, getProvider } from './data';

/**
 * Последние сверки цен (28.11.2026): по датам последней проверки тарифов из data/plans.json
 * собирается таблица «когда, сколько тарифов и у каких провайдеров». Это не полная история,
 * а срез базы на момент сборки: у каждого тарифа хранится только дата его последней сверки.
 * Показывается на /o-proekte как подтверждение того, что сверка идёт регулярно
 */
export function verificationLog(limit = 5) {
  const byDate = new Map();
  // те же тарифы, что на витрине и в счётчике STATS.plans: свежие, без провайдеров «только страница»
  for (const p of VISIBLE_PLANS) {
    if (!p.verifiedAt) continue;
    const row = byDate.get(p.verifiedAt) || { date: p.verifiedAt, plans: 0, providers: new Set() };
    row.plans += 1;
    row.providers.add(p.providerSlug);
    byDate.set(p.verifiedAt, row);
  }
  return [...byDate.values()]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, limit)
    .map((r) => ({
      date: r.date,
      plans: r.plans,
      providers: [...r.providers].map((s) => getProvider(s)?.name || s).sort((a, b) => a.localeCompare(b, 'ru')),
    }));
}

/** Сколько тарифов в базе несут ссылку на страницу прайса, с которой сверялась цена */
export function sourceCoverage() {
  return { total: VISIBLE_PLANS.length, withSource: VISIBLE_PLANS.filter((p) => p.source).length };
}
