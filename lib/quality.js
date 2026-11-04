import ARTICLES from '@/data/provider-articles.json';

/**
 * Сортировка «Оптимально» (04.11.2026, решение Антона): 60% балла надёжность провайдера, 40% цена.
 * Надёжность из открытых данных каталога, формула публикуется на /metodologiya.
 * Партнёрство и вознаграждение в формулу не входят
 */
export const QUALITY_WEIGHT = 60;
export const PRICE_WEIGHT = 40;
const YEAR = 2026;
const UNKNOWN_YEARS_POINTS = 5;

export const QUALITY_TABLE = [
  { label: 'Опыт на рынке', value: 'до 14', note: 'По году основания: 15 лет и больше дают 14 баллов, меньше пропорционально. Год не подтверждён: 5' },
  { label: 'Российская компания', value: '8', note: 'Договор и закрывающие документы в рублях для юрлиц' },
  { label: 'Защита от DDoS и бэкапы', value: '5 + 5', note: 'Заявлены провайдером' },
  { label: 'Почасовая оплата и тест', value: '4 + 2', note: 'Можно платить по часам, есть тестовый период' },
  { label: 'Панель управления', value: '2', note: 'Своя панель для сервера' },
  { label: 'Сервисы кроме VPS', value: 'до 10', note: 'По 1 баллу за продукт из обзора провайдера (выделенные серверы, базы, S3 и так далее)' },
];

function facts(slug) {
  const a = ARTICLES[slug];
  return (a && typeof a === 'object' && a.facts) || {};
}

/** Надёжность от 0 до 1 и из чего она сложена (сумма частей из 50) */
export function qualityOf(provider) {
  const f = facts(provider.slug);
  const founded = Number(f.founded) || null;
  const years = founded ? Math.max(0, YEAR - founded) : null;
  const ft = provider.features || {};
  const parts = {
    years: years == null ? UNKNOWN_YEARS_POINTS : (Math.min(years, 15) / 15) * 14,
    ru: provider.country === 'RU' ? 8 : 0,
    protect: (ft.ddos ? 5 : 0) + (ft.backup ? 5 : 0),
    pay: (ft.hourly ? 4 : 0) + (ft.testPeriod ? 2 : 0),
    panel: ft.panel ? 2 : 0,
    breadth: Math.min((f.products || []).length, 10),
  };
  const sum = Object.values(parts).reduce((a, b) => a + b, 0);
  return { score: sum / 50, points: Math.round(sum), parts, years, founded };
}

/** Итоговый балл «Оптимально» от 0 до 100: надёжность плюс цена относительно самой дешёвой в выборке */
export function optimalScore(quality, priceRub, minPrice, prepay = false) {
  const pricePart = minPrice && priceRub ? PRICE_WEIGHT * Math.sqrt(minPrice / priceRub) : 0;
  return Math.max(0, Math.round(QUALITY_WEIGHT * quality + pricePart - (prepay ? 5 : 0)));
}
