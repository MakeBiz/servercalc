import site from '@/data/site.json';

export const SITE = site;
export const SITE_NAME = site.name;
export const SITE_URL = site.url.replace(/\/$/, '');
export const METRIKA_ID = site.metrikaId;
export const STALE_AFTER_DAYS = site.staleAfterDays;

/**
 * Абсолютный адрес для канонических ссылок, sitemap и микроразметки.
 * Страницы живут по адресам со слешем на конце (trailingSlash в next.config),
 * поэтому слеш дописывается здесь же. Файлы (sitemap.xml, llms.txt) и адреса
 * с якорем или параметрами остаются как есть
 */
export function absUrl(path = '/') {
  if (!path.startsWith('/')) path = '/' + path;
  if (path === '/') return SITE_URL + '/';
  const plain = !/[?#]/.test(path) && !/\.[a-z0-9]+$/i.test(path.split('/').pop());
  if (plain && !path.endsWith('/')) path += '/';
  return SITE_URL + path;
}

/** Заголовок вкладки: единый шаблон на весь сайт */
export function pageTitle(title) {
  return title ? `${title} — ${SITE_NAME}` : `${SITE_NAME}, ${site.tagline}`;
}
