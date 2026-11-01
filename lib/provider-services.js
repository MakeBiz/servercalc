import raw from '@/data/provider-services.json';
import { getProvider } from './data';

/**
 * Сервисы провайдера кроме VPS (с 01.11.2026): страницы /provajdery/<провайдер>/<сервис>/
 * и обзор /provajdery/<провайдер>/servisy/. Данные в data/provider-services.json,
 * цены сняты с официального сайта провайдера с датой verifiedAt.
 * Страницы строятся только для провайдеров, которые видны в каталоге
 */
export const SERVICE_PROVIDERS = Object.keys(raw).filter((slug) => getProvider(slug));

export function servicesOf(providerSlug) {
  return SERVICE_PROVIDERS.includes(providerSlug) ? raw[providerSlug].services : [];
}

export function serviceBlock(providerSlug) {
  return SERVICE_PROVIDERS.includes(providerSlug) ? raw[providerSlug] : null;
}

export function getService(providerSlug, slug) {
  return servicesOf(providerSlug).find((s) => s.slug === slug) || null;
}

/** Все пары провайдер + сервис для сборки, карты сайта и llms.txt */
export function allServicePages() {
  return SERVICE_PROVIDERS.flatMap((p) => servicesOf(p).map((s) => ({ provider: p, ...s })));
}

/** Группы в порядке первого появления */
export function servicesByGroup(providerSlug) {
  const out = [];
  for (const s of servicesOf(providerSlug)) {
    let g = out.find((x) => x.name === s.group);
    if (!g) out.push((g = { name: s.group, items: [] }));
    g.items.push(s);
  }
  return out;
}

export function fromLabel(s) {
  if (s.priceFrom === null || s.priceFrom === undefined) return null;
  if (s.priceFrom === 0) return 'бесплатно';
  return `от ${new Intl.NumberFormat('ru-RU').format(s.priceFrom).replace(/ /g, ' ')} ${s.unit || '₽'}`;
}
