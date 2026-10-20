/**
 * GEO (20.10.2026): короткий ответ в начале страницы и вопрос о цене.
 * Нейросети охотнее цитируют страницы, где прямой ответ с цифрами стоит сверху,
 * а в разметке есть дата и список сравниваемых вариантов
 */
import { price, ruDate, plural } from '@/lib/format';

const tar = (n) => `${n} ${plural(n, 'тариф', 'тарифа', 'тарифов')}`;
const prov = (n) => `${n} ${plural(n, 'провайдера', 'провайдеров', 'провайдеров')}`;

function topPlans(plans, providers, n = 3) {
  const seen = new Set();
  const out = [];
  for (const p of plans) {
    if (seen.has(p.providerSlug)) continue;
    seen.add(p.providerSlug);
    const prov = providers.find((x) => x.slug === p.providerSlug);
    out.push(`${prov?.name || p.providerSlug} от ${price(p.priceRub)}`);
    if (out.length >= n) break;
  }
  return out;
}

function provCount(plans) {
  return new Set(plans.map((p) => p.providerSlug)).size;
}

export function taskAnswer(task, suited, providers, verifiedAt) {
  if (task.noTariffs || !suited.length) return null;
  const top = topPlans(suited, providers);
  const name = task.name.toLowerCase();
  return {
    text: `Для задачи «${task.name}» нужен VPS от ${task.cpu} × ${task.ram} ГБ. Подходящие тарифы в нашей базе стоят от ${price(suited[0].priceRub)} в месяц, самые доступные: ${top.join(', ')}. Сравниваем ${tar(suited.length)} от ${prov(provCount(suited))}, цены проверены ${ruDate(verifiedAt)}`,
    faq: {
      q: `Сколько стоит VPS для задачи «${name}»`,
      a: `По нашей базе на ${ruDate(verifiedAt)} тарифы под рекомендуемую конфигурацию ${task.cpu} × ${task.ram} ГБ стоят от ${price(suited[0].priceRub)} в месяц. Самые доступные варианты: ${top.join(', ')}. Цены сверяем с сайтами провайдеров раз в неделю, перед оплатой проверьте цену у провайдера`,
    },
  };
}

export function geoAnswer(geo, plans, providers, verifiedAt) {
  if (!plans.length) return null;
  const top = topPlans(plans, providers);
  return {
    text: `${geo.h1}: в нашей базе ${tar(plans.length)} от ${prov(provCount(plans))} с этой локацией, от ${price(plans[0].priceRub)} в месяц. Самые доступные: ${top.join(', ')}. Цены проверены ${ruDate(verifiedAt)}`,
    faq: {
      q: `Сколько стоит VPS с локацией «${geo.name}»`,
      a: `По нашей базе на ${ruDate(verifiedAt)} самые доступные тарифы с этой локацией: ${top.join(', ')} в месяц. Цены сверяем с сайтами провайдеров раз в неделю, перед оплатой проверьте цену у провайдера`,
    },
  };
}

export function itemListLd(title, url, plans, providers, verifiedAt) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: title,
    url,
    dateModified: verifiedAt,
    mainEntity: {
      '@type': 'ItemList',
      name: `Тарифы: ${title}`,
      itemListElement: plans.slice(0, 12).map((p, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: `${providers.find((x) => x.slug === p.providerSlug)?.name || p.providerSlug}, ${p.name}, ${price(p.priceRub)} в месяц`,
      })),
    },
  };
}
