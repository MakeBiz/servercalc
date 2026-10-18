/**
 * Каталог провайдеров из кабинета MakeBiz (Маркетинг · Провайдеры на сайтах).
 *
 * Кабинет решает, кого скрыть, кто в приоритете и кто закреплён. Перед сборкой
 * scripts/catalog-pull.mjs скачивает последнюю опубликованную версию в
 * data/catalog-publish.json, отсюда её читают lib/data.js и lib/score.js.
 * Пустой файл ({}) значит кабинет не ответил ни разу: сайт работает по спискам
 * в коде, как до каталога.
 */
import pub from '../data/catalog-publish.json';

export const CATALOG = pub && typeof pub === 'object' ? pub : {};
/** Кабинет ответил: его списки главнее списков в коде */
export const CATALOG_ON = Array.isArray(CATALOG.hidden);
export const CATALOG_HIDDEN = new Set(CATALOG.hidden || []);
