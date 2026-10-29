import L from '@/data/lang-pairs.json';

/** Этот сайт: 'ru' (servercalc.ru) или 'en' (servercalc.com). Пара сайтов — языковые версии друг друга */
export const SIDE = 'ru';

/** Адрес той же страницы на другом языке. exact=false: точного перевода нет, ведём в ближайший раздел */
export function counterpart(pathname, side = SIDE) {
  const p = pathname.endsWith('/') ? pathname : pathname + '/';
  const i = side === 'ru' ? 0 : 1;
  const base = side === 'ru' ? L.en : L.ru;
  const hit = L.pairs.find((x) => x[i] === p);
  if (hit) return { url: base + hit[1 - i], exact: hit[2] };
  const fb = side === 'ru' ? L.fallbackRu : L.fallbackEn;
  const key = Object.keys(fb).filter((k) => p.startsWith(k)).sort((a, b) => b.length - a.length)[0];
  return { url: base + (key ? fb[key] : '/'), exact: false };
}
