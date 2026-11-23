/**
 * Реф-код на ссылках «прайс» и «Источники» (Антон 23.11.2026).
 * Кнопки перехода и так ведут на реф-ссылку, а мелкие ссылки на страницу прайса
 * и источники уходили на сайт провайдера без кода. Если партнёрка активна, реф-ссылка
 * в данных держит код в параметре ref и ссылка ведёт на тот же сайт (www не важен),
 * добавляем ref к ссылке. Проверено 23.11.2026: Hostes, Aéza и VPS.org ставят
 * cookie с кодом с любой страницы сайта. Остальные программы не трогаем
 */
const host = (u) => u.hostname.replace(/^www\./, '');

export function withRef(provider, href) {
  if (!provider || provider.affiliateStatus !== 'active' || !provider.url || !href) return { href, ref: false };
  try {
    const aff = new URL(provider.url);
    const code = aff.searchParams.get('ref');
    const link = new URL(href);
    if (!code || host(aff) !== host(link)) return { href, ref: false };
    link.searchParams.set('ref', code);
    return { href: link.toString(), ref: true };
  } catch {
    return { href, ref: false };
  }
}

export const refRel = (ref) => (ref ? 'sponsored nofollow noopener' : 'nofollow noopener');
