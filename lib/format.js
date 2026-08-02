const MONTHS = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

/** 2026-08-02 -> «2 августа 2026» */
export function ruDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** Короткая форма: «2 авг» */
export function ruDateShort(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()].slice(0, 3)}`;
}

/** Склонение: plural(5, 'тариф', 'тарифа', 'тарифов') -> «тарифов» */
export function plural(n, one, few, many) {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (last > 1 && last < 5) return few;
  if (last === 1) return one;
  return many;
}

/** 1290 -> «1 290 ₽» */
export function price(rub, { suffix = ' ₽' } = {}) {
  if (rub == null) return '—';
  return Math.round(rub).toLocaleString('ru-RU').replace(/ /g, ' ') + suffix;
}

/** Цена за гигабайт памяти, нормализованная метрика для честного сравнения */
export function pricePerGb(plan) {
  if (!plan || !plan.ram) return null;
  return plan.priceRub / plan.ram;
}

export function num(n) {
  return Number(n).toLocaleString('ru-RU').replace(/ /g, ' ');
}

/** Разница в днях между двумя датами, без учёта времени */
export function daysBetween(fromIso, toIso) {
  const a = new Date(fromIso);
  const b = new Date(toIso);
  return Math.floor((b - a) / 86400000);
}

/** «сегодня», «вчера», «3 дня назад» */
export function agoLabel(days) {
  if (days <= 0) return 'сегодня';
  if (days === 1) return 'вчера';
  return `${days} ${plural(days, 'день', 'дня', 'дней')} назад`;
}
