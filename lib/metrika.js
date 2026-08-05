import { METRIKA_ID } from './site';

/**
 * Цели Метрики. Список держим здесь, чтобы он совпадал с тем,
 * что заведено в кабинете счётчика
 *
 *  calc_start      начал заполнять калькулятор
 *  calc_result     получил подбор
 *  provider_click  перешёл к провайдеру (главная цель, к ней привязываются деньги)
 *  promo_copy      скопировал промокод (тот же уровень намерения, что переход)
 *  catalog_filter  воспользовался фильтром каталога
 *  news_read       дочитал материал (в коде пока не отправляется)
 *  cookie_accept   принял cookie
 *
 * Плюс семейство целей go_<slug> по одной на провайдера: go_timeweb,
 * go_adminvps и так далее. Отправляются из OutLink вместе с provider_click,
 * чтобы клики по каждому провайдеру были видны в кабинете отдельной строкой.
 * Слаги берутся из data/providers.json
 */
export const GOALS = {
  calcStart: 'calc_start',
  calcResult: 'calc_result',
  providerClick: 'provider_click',
  promoCopy: 'promo_copy',
  catalogFilter: 'catalog_filter',
  newsRead: 'news_read',
  cookieAccept: 'cookie_accept',
};

export function goal(name, params) {
  if (typeof window === 'undefined') return;
  try {
    if (typeof window.ym === 'function') {
      window.ym(METRIKA_ID, 'reachGoal', name, params);
    }
  } catch {
    /* аналитика никогда не должна ронять интерфейс */
  }
}
