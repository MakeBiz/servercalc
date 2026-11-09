/* ---------- страны тарифа для фильтра «Страна» (09.11.2026) ----------
   Из строки location (и городов по регионам cityByRu) по ключевым словам. Общие слова
   («Европа», «40 стран») страну не дают: такой тариф проходит только фильтр региона */
const COUNTRY_WORDS = [
  ['ru', /росси|москв|петербург|новосибирск|^ru$|moscow|petersburg|russia/i],
  ['nl', /нидерланд|амстердам|роттердам|netherlands|amsterdam|rotterdam/i],
  ['de', /германи|франкфурт|нюрнберг|germany|frankfurt|nuremberg/i],
  ['pl', /польш|варшав|poland|warsaw/i],
  ['fi', /финлянд|хельсинки|finland|helsinki/i],
  ['se', /швеци|фалькенберг|стокгольм|sweden|falkenberg|stockholm/i],
  ['kz', /казахстан|алматы|kazakhstan|almaty/i],
  ['gb', /великобритан|лондон|united kingdom|london|\buk\b/i],
  ['us', /сша|нью-йорк|нью-джерси|майами|лос-анджелес|даллас|сиэтл|сент-луис|чикаго|usa|new york|new jersey|miami|los angeles|dallas|seattle|chicago|^us$/i],
  ['es', /испани|барселон|spain|barcelona/i],
  ['fr', /франци|париж|france|paris/i],
  ['tr', /турци|стамбул|turkey|istanbul/i],
  ['sg', /сингапур|singapore/i],
  ['jp', /япони|токио|japan|tokyo/i],
  ['ae', /оаэ|дубай|uae|dubai|^uae$/i],
];
export function planCountries(p) {
  const text = [p.location, p.locationEn, ...Object.values(p.cityByRu || {})].filter(Boolean).join(' | ');
  const out = COUNTRY_WORDS.filter(([, re]) => text.split(' | ').some((t) => re.test(t.trim()))).map(([c]) => c);
  // у тарифа нет строки с городом: страна по коду региона, если он и есть страна (ru, kz, us, uae)
  if (!out.length) {
    const byGeo = { ru: 'ru', kz: 'kz', us: 'us', uae: 'ae', oae: 'ae' }[p.geo];
    if (byGeo) out.push(byGeo);
  }
  return out.length ? out : null;
}
/** Скорость порта из названия тарифа («10 Гбит/с»), если провайдер её указывает */
export function planPortGbit(p) {
  const m = String(p.name || '').match(/(\d+)\s*(?:Гбит|Gbit|Gbps)/i);
  return m ? Number(m[1]) : null;
}
