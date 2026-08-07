import { SITE } from './site';

/**
 * Единственное место в проекте, где собираются партнёрские ссылки.
 * Стандарт метки: utm_source=servercalc&utm_medium=<язык>&utm_campaign=<место>&utm_content=<провайдер>
 * utm_medium несёт язык версии страницы: ru — русский сайт, eng — английский
 * (значение задаётся в site.json полем utmMedium). В партнёрских кабинетах сразу
 * видно, с какой языковой версии пришёл переход.
 *
 * Важно: метка ставится ДО якоря. Ссылка UltaHost имеет вид https://ultahost.com/#MakeBiz,
 * и если дописать параметры после решётки, реферальный идентификатор перестаёт работать.
 * Конструктор URL раскладывает адрес на части и собирает обратно в правильном порядке.
 */

export const CAMPAIGN = {
  calculator: 'calculator',
  catalog: 'catalog',
  providerPage: 'provider_page',
  providers: 'providers_list',
  news: 'news',
  task: (slug) => `task_${slug}`,
  geo: (slug) => `geo_${slug}`,
};

export function withUtm(rawUrl, { campaign, content } = {}) {
  if (!rawUrl) return null;
  try {
    const url = new URL(rawUrl);
    url.searchParams.set('utm_source', SITE.utmSource);
    url.searchParams.set('utm_medium', SITE.utmMedium || 'referral');
    if (campaign) url.searchParams.set('utm_campaign', campaign);
    if (content) url.searchParams.set('utm_content', content);
    return url.toString();
  } catch {
    return rawUrl;
  }
}

/**
 * Ссылка на провайдера. Партнёрская с меткой, если партнёрка подключена,
 * обычная ссылка на сайт без метки, если провайдер в каталоге без партнёрства
 */
export function providerLink(provider, { campaign, content } = {}) {
  const isPartner = provider.affiliateStatus === 'active' && provider.url;
  if (!isPartner) {
    return { href: provider.site, rel: 'nofollow noopener', partner: false };
  }
  // Часть партнёрских программ ломается от лишних параметров в адресе:
  // такие ссылки помечены в данных полем noUtm и уходят ровно в том виде,
  // в каком их выдал партнёрский кабинет
  const href = provider.noUtm
    ? provider.url
    : withUtm(provider.url, { campaign, content: content || provider.slug });
  return {
    href,
    rel: 'sponsored nofollow noopener',
    partner: true,
  };
}
