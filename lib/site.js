import site from '@/data/site.json';

export const SITE = site;
export const SITE_NAME = site.name;
export const SITE_URL = site.url.replace(/\/$/, '');
export const METRIKA_ID = site.metrikaId;
export const STALE_AFTER_DAYS = site.staleAfterDays;

/** Абсолютный адрес для канонических ссылок, sitemap и микроразметки */
export function absUrl(path = '/') {
  if (!path.startsWith('/')) path = '/' + path;
  return SITE_URL + (path === '/' ? '' : path);
}

/** Заголовок вкладки: единый шаблон на весь сайт */
export function pageTitle(title) {
  return title ? `${title} — ${SITE_NAME}` : `${SITE_NAME}, ${site.tagline}`;
}
