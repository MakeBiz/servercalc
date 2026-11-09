import ARTICLES from '@/data/provider-articles.json';
import PLANS from '@/data/plans.json';
import RANKING from '@/data/ranking.json';
import { planCountries, planPortGbit } from './countries';

/**
 * Сортировка «Оптимально»: 60% балла надёжность провайдера, 40% цена.
 * 04.11.2026 введена, 09.11.2026 пересобрана по решению Антона: меньше веса возрасту, тесту и числу услуг,
 * больше почасовой оплате, новые критерии «страны с серверами», «все тарифы на NVMe», «канал от 10 Гбит/с».
 * Партнёры сервиса (data/ranking.json) получают прибавку к итоговому баллу, это раскрыто на /metodologiya
 * и под результатами подбора. Критерии надёжности одинаковые для всех провайдеров
 */
export const QUALITY_WEIGHT = 60;
export const PRICE_WEIGHT = 40;
const YEAR = 2026;
const UNKNOWN_YEARS_POINTS = 3;

export const PARTNER_BONUS = Number(RANKING.partnerBonus) || 0;
const PARTNERS = new Set(RANKING.partners || []);
/** Прибавка к итоговому баллу «Оптимально» для партнёров сервиса */
export function partnerBonus(slug) {
  return PARTNERS.has(slug) ? PARTNER_BONUS : 0;
}

export const QUALITY_TABLE = [
  { label: 'Почасовая оплата', value: '8', note: 'Можно платить по часам и удалить сервер в любой момент' },
  { label: 'Страны с серверами', value: 'до 8', note: 'По 1 баллу за страну, где у провайдера есть тарифы в каталоге' },
  { label: 'Опыт на рынке', value: 'до 6', note: 'По году основания: 5 лет и больше дают 6 баллов, меньше пропорционально. Год не подтверждён: 3' },
  { label: 'Защита от DDoS и бэкапы', value: '5 + 5', note: 'Заявлены провайдером' },
  { label: 'Российская компания', value: '4', note: 'Договор и закрывающие документы в рублях для юрлиц' },
  { label: 'Все тарифы на NVMe', value: '4', note: 'Все тарифы провайдера в каталоге на NVMe-дисках' },
  { label: 'Сервисы кроме VPS', value: 'до 4', note: 'По 1 баллу за продукт из обзора провайдера (выделенные серверы, базы, S3 и так далее)' },
  { label: 'Канал от 10 Гбит/с', value: '3', note: 'Хотя бы у одного тарифа заявлен порт от 10 Гбит/с' },
  { label: 'Панель управления', value: '2', note: 'Своя панель для сервера' },
  { label: 'Тестовый период', value: '1', note: 'Бесплатный тест до оплаты' },
];

function facts(slug) {
  const a = ARTICLES[slug];
  return (a && typeof a === 'object' && a.facts) || {};
}

function planFacts(slug) {
  const own = PLANS.filter((p) => p.providerSlug === slug);
  const countries = new Set();
  let port = 0;
  for (const p of own) {
    for (const c of planCountries(p) || []) countries.add(c);
    port = Math.max(port, planPortGbit(p) || 0);
  }
  return { countries: countries.size, nvmeAll: own.length > 0 && own.every((p) => p.diskType === 'NVMe'), port };
}

/** Надёжность от 0 до 1 и из чего она сложена (сумма частей из 50) */
export function qualityOf(provider) {
  const f = facts(provider.slug);
  const pf = planFacts(provider.slug);
  const founded = Number(f.founded) || null;
  const years = founded ? Math.max(0, YEAR - founded) : null;
  const ft = provider.features || {};
  const parts = {
    hourly: ft.hourly ? 8 : 0,
    geo: Math.min(pf.countries, 8),
    years: years == null ? UNKNOWN_YEARS_POINTS : (Math.min(years, 5) / 5) * 6,
    protect: (ft.ddos ? 5 : 0) + (ft.backup ? 5 : 0),
    ru: provider.country === 'RU' ? 4 : 0,
    nvme: pf.nvmeAll ? 4 : 0,
    breadth: Math.min((f.products || []).length, 4),
    port: pf.port >= 10 ? 3 : 0,
    panel: ft.panel ? 2 : 0,
    test: ft.testPeriod ? 1 : 0,
  };
  const sum = Object.values(parts).reduce((a, b) => a + b, 0);
  return { score: sum / 50, points: Math.round(sum), parts, years, founded };
}

/** Итоговый балл «Оптимально»: надёжность плюс цена относительно самой дешёвой в выборке, плюс прибавка партнёру */
export function optimalScore(quality, priceRub, minPrice, prepay = false, bonus = 0) {
  const pricePart = minPrice && priceRub ? PRICE_WEIGHT * Math.sqrt(minPrice / priceRub) : 0;
  return Math.max(0, Math.round(QUALITY_WEIGHT * quality + pricePart - (prepay ? 5 : 0) + bonus));
}
