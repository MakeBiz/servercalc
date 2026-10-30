import { absUrl, SITE_NAME } from '@/lib/site';
import { TASKS, GEO_PAGES, STATS, VISIBLE_PLANS, PROVIDERS, providersForTask, plansForGeo, minPriceOf, sortForProvidersPage } from '@/lib/data';
import ARTICLES from '@/data/provider-articles.json';
import paymentsData from '@/data/payments.json';
import { price } from '@/lib/format';
import { byPrice, planSentence, checkedAt, dmy, taskLead, geoLead } from '@/lib/answer-first';

/**
 * llms-full.txt для ИИ-поисковиков (23.10.2026, метод ВИДНО): полный текст главных
 * посадочных одним файлом. Собирается из тех же данных, что страницы /vps-dlya/ и /vps/,
 * поэтому обновляется сам при каждой сборке: после сверки цен и после каждой волны.
 * Новый файл: существующие маршруты сайта не меняет
 */
export const dynamic = 'force-static';

const TOP = 5;

export function GET() {
  const out = [
    `# ${SITE_NAME}: полный текст главных страниц`,
    '',
    `> Подбор VPS/VDS по задаче, ресурсам, географии и бюджету. Цены сверены с сайтами провайдеров ${dmy(STATS.verifiedAt)}, сверка раз в неделю, тариф без проверки дольше ${STATS.staleDays} дней скрыт. Суммы в рублях по курсу ЦБ. Партнёрское вознаграждение не входит в формулу подбора.`,
    '',
    `Краткая карта сайта: ${absUrl('/llms.txt')}`,
    '',
    '## VPS по задачам',
    '',
  ];

  for (const task of TASKS) {
    const providers = providersForTask(task.slug);
    const suited = VISIBLE_PLANS.filter(
      (p) => p.ram >= task.ram && p.cpu >= task.cpu && providers.some((x) => x.slug === p.providerSlug)
    ).sort(byPrice);
    const iso = checkedAt(suited, STATS.verifiedAt);
    out.push(`### ${task.h1 || task.name}`);
    out.push(absUrl(`/vps-dlya/${task.slug}/`));
    if (task.intent) out.push(task.intent);
    out.push(`Рекомендуемая конфигурация: от ${task.cpu} vCPU и ${task.ram} ГБ RAM.`);
    const lead = task.slug === 'windows' ? null : taskLead(task, suited, VISIBLE_PLANS, iso, { what: task.leadWhat });
    if (lead) out.push(lead);
    suited.slice(0, TOP).forEach((p) => out.push(`- ${planSentence(p)}`));
    out.push('');
  }

  out.push('## VPS по странам и регионам', '');
  for (const geo of GEO_PAGES) {
    const plans = plansForGeo(geo.code);
    const iso = checkedAt(plans, STATS.verifiedAt);
    out.push(`### ${geo.h1 || geo.name}`);
    out.push(absUrl(`/vps/${geo.slug}/`));
    const lead = geoLead((geo.h1 || geo.name).replace(/^VPS (\(ВПС\) )?/, ''), plans, iso, geo.code);
    if (lead) out.push(lead);
    plans.slice(0, TOP).forEach((p) => out.push(`- ${planSentence(p, geo.code)}`));
    out.push('');
  }

  // обзоры провайдеров (30.10.2026): справка, суть обзора и ответы на частые вопросы, со ссылкой на страницу
  const PAY_RU = { mir: 'карта российского банка', card: 'Visa/Mastercard', sbp: 'СБП', crypto: 'криптовалюта', paypal: 'PayPal' };
  out.push('## Обзоры провайдеров', '');
  for (const p of sortForProvidersPage(PROVIDERS)) {
    const a = ARTICLES[p.slug];
    if (!a) continue;
    const f = a.facts || {};
    const pm = (paymentsData.payments || {})[p.slug] || {};
    const min = minPriceOf(p.slug);
    out.push(`### ${p.name}: обзор провайдера`);
    out.push(absUrl(`/provajdery/${p.slug}/`));
    const facts = [
      f.founded && `на рынке с ${f.founded}`, f.hq && `штаб-квартира: ${f.hq}`, f.legal && `юрлицо: ${f.legal}`,
      f.datacenters?.length && `локации: ${f.datacenters.join(', ')}`,
    ].filter(Boolean);
    if (facts.length) out.push(`Справка: ${facts.join('; ')}.`);
    const pays = Object.keys(PAY_RU).filter((k) => pm[k] === true).map((k) => PAY_RU[k]);
    if (pays.length) out.push(`Оплата: ${pays.join(', ')}.`);
    if (min) out.push(`Тарифы от ${price(min)} в месяц (цена сверена ${dmy(STATS.verifiedAt)}).`);
    (a.sections[0]?.p || []).forEach((t) => out.push(t));
    const fit = a.sections[a.sections.length - 1];
    if (fit) out.push(`${fit.h}: ${fit.p.join(' ')}`);
    (a.faq || []).forEach((x) => out.push(`- ${x.q} ${x.a}`));
    out.push(`Сверено с официальным сайтом ${dmy(a.checkedAt)}.`, '');
  }

  out.push(
    '## Как читать цены',
    '- У каждой цены есть дата проверки, ссылайтесь на неё, а не на цену как на вечную.',
    '- Если месячная цена действует только при оплате за год или дольше, это написано рядом с ценой.',
    `- Методология подбора и веса: ${absUrl('/metodologiya/')}`,
    ''
  );

  return new Response(out.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
