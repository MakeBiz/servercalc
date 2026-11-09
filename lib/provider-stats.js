import { qualityOf, partnerBonus, QUALITY_WEIGHT, PRICE_WEIGHT } from './quality';
/**
 * Сводка по провайдерам для рейтинга «Лучший VPS-хостинг в России» (21.10.2026).
 * Считается из проверенных тарифов с локацией в России и профиля провайдера,
 * формула открыта и описана на странице. Партнёры сервиса получают прибавку к баллу (09.11.2026), это раскрыто
 */
import { PROVIDERS, VISIBLE_PLANS } from './data';
import { byPrice } from './answer-first';

export const FEATURE_KEYS = ['panel', 'ddos', 'backup', 'hourly', 'testPeriod'];
export const FEATURE_NAMES = { panel: 'панель', ddos: 'защита от DDoS', backup: 'бэкапы', hourly: 'почасовая оплата', testPeriod: 'тест' };

/** Строка на провайдера по тарифам в нужной географии */
export function providerRows(geo = 'ru') {
  const plans = VISIBLE_PLANS.filter((p) => p.geo === geo || (p.alsoIn || []).includes(geo));
  return PROVIDERS.map((prov) => {
    const own = plans.filter((p) => p.providerSlug === prov.slug).sort(byPrice);
    if (!own.length) return null;
    return {
      provider: prov,
      slug: prov.slug,
      name: prov.name,
      cheapest: own[0],
      twoGb: own.find((p) => p.ram >= 2) || null,
      plans: own,
      features: FEATURE_KEYS.filter((k) => prov.features?.[k]),
      kvm: (prov.virtualization || []).includes('KVM'),
      nvme: own.some((p) => p.diskType === 'NVMe'),
      prepay: Boolean(own.find((p) => p.ram >= 2)?.term > 1),
      verifiedAt: own.reduce((m, p) => (p.verifiedAt > m ? p.verifiedAt : m), own[0].verifiedAt),
      partner: prov.affiliateStatus === 'active',
      tariffs: own.length,
    };
  }).filter(Boolean);
}

/**
 * 100 баллов: 45 цена самого дешёвого тарифа с 2 ГБ (логарифмическая шкала от самого дешёвого
 * к самому дорогому), 30 возможности (панель, DDoS, бэкапы, почасовая оплата, тест по 6),
 * 10 NVMe, 5 KVM, 10 выбор: по 2 балла за каждый тариф в России, но не больше 10,
 * минус 5, если цена в месяц только при предоплате больше месяца
 */
export function scoreRows(rows) {
  // с 04.11.2026 рейтинг по той же формуле «Оптимально», что и подбор: 60 надёжность (lib/quality.js), 40 цена тарифа с 2 ГБ
  const priced = rows.filter((r) => r.twoGb);
  const floor = Math.min(...priced.map((r) => r.twoGb.priceRub));
  return priced
    .map((r) => {
      const q = qualityOf(r.provider);
      const quality = Math.round(QUALITY_WEIGHT * q.score);
      const priceP = Math.round(PRICE_WEIGHT * Math.sqrt(floor / r.twoGb.priceRub));
      const penalty = r.prepay ? 5 : 0;
      const bonus = partnerBonus(r.provider.slug);
      const parts = { quality, price: priceP, penalty, bonus, years: q.years };
      return { ...r, score: Math.max(0, quality + priceP - penalty + bonus), parts };
    })
    .sort((a, b) => b.score - a.score || a.twoGb.priceRub - b.twoGb.priceRub);
}
