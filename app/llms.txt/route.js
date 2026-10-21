import { absUrl, SITE_NAME } from '@/lib/site';
import { TASKS, GEO_PAGES, STATS, VISIBLE_PLANS, plansForGeo } from '@/lib/data';
import { byPrice, planSentence, cheapestWith, dmy } from '@/lib/answer-first';

/**
 * llms.txt — визитка сайта для AI-поисковиков (ChatGPT, Perplexity, Яндекс Нейро).
 * Отдаётся по адресу /llms.txt как текст. Карта страниц строится из тех же данных,
 * что и сам сайт: список задач и география-страниц. Значит новые страницы попадают
 * сюда автоматически, а отключённые (page:false, например ОАЭ без тарифов) — нет.
 */
export const dynamic = 'force-static';

export function GET() {
  const link = (label, path, note) => `- [${label}](${absUrl(path)})${note ? `: ${note}` : ''}`;

  const body = [
    `# ${SITE_NAME}`,
    '',
    '> Независимый подбор и каталог виртуальных серверов (VPS/VDS) по задаче, ресурсам, ' +
      'географии и бюджету. У каждого тарифа проверенная цена с датой сверки, суммы ' +
      'пересчитаны в рубли по курсу ЦБ. Размер партнёрского вознаграждения не входит в ' +
      'формулу подбора — веса открыты на странице методологии, порядок в подборе следует за баллом.',
    '',
    `Цены проверены ${dmy(STATS.verifiedAt)}: сверяем с сайтами провайдеров раз в неделю, тариф без проверки дольше ${STATS.staleDays} дней скрываем.`,
    '',
    '## Короткие ответы',
    ...(() => {
      const all = [...VISIBLE_PLANS].sort(byPrice);
      const ru = plansForGeo('ru');
      const out = [];
      if (all[0]) out.push(`- Самый дешёвый VPS сейчас: ${planSentence(all[0])}`);
      const two = cheapestWith(all, { ram: 2 });
      if (two) out.push(`- Самый дешёвый VPS с 2 ГБ памяти: ${planSentence(two)}`);
      if (ru[0]) out.push(`- Самый дешёвый VPS в России: ${planSentence(ru[0], 'ru')}. Подробно: ${absUrl('/vps/rossiya')}`);
      const tg = cheapestWith(all, { ram: 1, cpu: 1 });
      if (tg) out.push(`- VPS для Telegram-бота недорого: ${planSentence(tg)}. Подробно: ${absUrl('/vps-dlya/telegram-bot')}`);
      return out;
    })(),
    '',
    '## Основное',
    link('Подбор VPS по задаче', '/', 'калькулятор: сервер по числу ядер, памяти, географии и бюджету'),
    link('Онлайн калькулятор конфигурации сервера', '/kalkulyator', 'ядра, память, география и бюджет, тарифы с ценой на дату сверки'),
    link('Лучший VPS-хостинг в России', '/luchshie-vps-rossii', 'рейтинг по открытой формуле, партнёрство показано отдельной колонкой и в баллы не входит'),
    link('Как выбрать VPS-хостинг', '/novosti/kak-vybrat-vps-hosting', 'чек-лист из 9 пунктов'),
    link('Каталог тарифов', '/catalog', 'все проверенные тарифы одной таблицей с датой проверки цены'),
    link('Провайдеры в сравнении', '/provajdery', 'у каждого провайдера страница с тарифами, локациями и ограничениями'),
    link('Методология подбора', '/metodologiya', 'открытая формула и веса, по которым считается процент соответствия'),
    link('О проекте', '/o-proekte', 'что это за сервис, кому полезен и как он зарабатывает'),
    '',
    '## Подбор по задаче',
    ...TASKS.map((t) => link(t.h1 || t.name, `/vps-dlya/${t.slug}`, t.intent)),
    '',
    '## Подбор по географии',
    ...GEO_PAGES.map((g) => link(g.h1, `/vps/${g.slug}`, g.note)),
    '',
    '## Новости рынка',
    link('Новости и обзоры', '/novosti', 'что происходит на рынке VPS, хостинга и цен'),
    '',
  ].join('\n');

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
