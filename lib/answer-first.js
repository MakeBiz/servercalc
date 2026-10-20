/**
 * Ответ первым абзацем (21.10.2026).
 *
 * ChatGPT, Алиса и другие ИИ-поисковики берут страницу, которая прямо отвечает
 * на вопрос и выглядит свежей: конкретный тариф, цена и дата проверки в первой
 * строке. Фразы собираются из базы тарифов при сборке, поэтому после каждой
 * еженедельной сверки цен ответ обновляется сам
 */
import { price } from './format';
import { getProvider, getGeoByCode } from './data';

/** 2026-10-21 → 21.10.2026 */
export function dmy(iso) {
  if (!iso) return '';
  const [y, m, d] = String(iso).slice(0, 10).split('-');
  return `${d}.${m}.${y}`;
}

export const yearOf = (iso) => String(iso || new Date().toISOString()).slice(0, 4);

export function checkedAt(plans, fallback) {
  return plans.reduce((m, p) => (p.verifiedAt > m ? p.verifiedAt : m), plans[0]?.verifiedAt || fallback || '');
}

export const byPrice = (a, b) => a.priceRub - b.priceRub;

export function provName(p) {
  return getProvider(p.providerSlug)?.name || p.providerSlug;
}

export function planName(p) {
  return `${provName(p)} ${p.name}`;
}

export function specs(p) {
  return `${p.cpu} vCPU, ${p.ram} ГБ RAM, ${p.disk} ГБ ${p.diskType || 'диск'}`;
}

export function placeOf(p, geo) {
  if (geo && p.cityByRu && p.cityByRu[geo]) return p.cityByRu[geo];
  if (p.location) return p.location.replace(/\s*\(.*\)$/, '').trim() || p.location;
  if (p.geo === 'global') return 'несколько регионов';
  const g = getGeoByCode(p.geo);
  return g ? g.name : '';
}

export function termNote(p) {
  if (!p.term || p.term <= 1) return '';
  return p.term === 12 ? 'при оплате за год' : p.term === 24 ? 'при оплате за 2 года' : `при оплате за ${p.term} мес.`;
}

/** «149 ₽ в месяц (при оплате за год)» */
export function priceText(p) {
  const t = termNote(p);
  return `${price(p.priceRub)} в месяц${t ? ` (${t})` : ''}`;
}

export function planSentence(p, geo) {
  const where = placeOf(p, geo);
  return `${planName(p)} (${specs(p)}${where ? `, ${where}` : ''}) за ${priceText(p)}`;
}

export function cheapestWith(plans, { ram = 0, cpu = 0, exclude } = {}) {
  return [...plans].filter((p) => p.ram >= ram && p.cpu >= cpu && p !== exclude).sort(byPrice)[0] || null;
}

/** Первая строка страницы */
export function checkedLine(iso) {
  return `Цены проверены ${dmy(iso)}`;
}

/** Ответ для страницы задачи */
export function taskLead(task, suited, allPlans, iso, { what } = {}) {
  if (task.noTariffs || !suited.length) return null;
  const first = suited[0];
  const name = what || `задачи «${task.name}»`;
  const parts = [`Самый дешёвый VPS для ${name} сейчас: ${planSentence(first)}, проверено ${dmy(iso)}.`];
  const lighter = task.ram > 1 ? cheapestWith(allPlans, { ram: 1, cpu: 1 }) : null;
  if (lighter && lighter.priceRub < first.priceRub && lighter.ram < task.ram && task.ram <= 2) {
    parts.push(`Простому боту без базы хватит 1 ГБ: ${planName(lighter)} за ${priceText(lighter)}.`);
  } else {
    const roomy = cheapestWith(suited, { ram: task.ram * 2, exclude: first });
    if (roomy) parts.push(`С запасом (${roomy.ram} ГБ RAM): ${planName(roomy)} за ${priceText(roomy)}.`);
  }
  parts.push(`Ниже сравнение всех ${suited.length} подходящих тарифов.`);
  return parts.join(' ');
}

/** Ответ для страницы географии */
export function geoLead(where, plans, iso, geoCode) {
  if (!plans.length) return null;
  const first = plans[0];
  const parts = [`Самый дешёвый VPS ${where} сейчас: ${planSentence(first, geoCode)}, проверено ${dmy(iso)}.`];
  const twoGb = cheapestWith(plans, { ram: 2, exclude: first });
  if (twoGb && first.ram < 2) parts.push(`С 2 ГБ памяти под сайт или базу: ${planName(twoGb)} за ${priceText(twoGb)}.`);
  const four = cheapestWith(plans, { ram: 4, cpu: 2, exclude: first });
  if (four && four !== twoGb) parts.push(`Под 1С или интернет-магазин (2 ядра, 4 ГБ): ${planName(four)} за ${priceText(four)}.`);
  parts.push(`Ниже ${plans.length} тарифов с этой локацией.`);
  return parts.join(' ');
}
