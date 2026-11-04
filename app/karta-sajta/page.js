import Link from 'next/link';
import PageHead from '@/components/PageHead';
import sitemap from '../sitemap';
import { PROVIDERS, TASKS, GEO_PAGES } from '@/lib/data';
import { allPosts } from '@/lib/news';
import { PAIRS, pairTitle } from '@/lib/compare';
import { PAY_METHODS } from '@/lib/payments';
import { CHEAP_SLUGS, cheapPage } from '@/lib/cheap-pages';
import { allServicePages } from '@/lib/provider-services';
import { PROXY, LLM_API } from '@/lib/partners-extra';
import { SITE_URL } from '@/lib/site';

/**
 * HTML-карта сайта (04.11.2026): все адреса из sitemap.xml ссылками на одной странице,
 * чтобы робот Яндекса находил новые страницы по ссылкам, не дожидаясь чтения sitemap.xml.
 * Сама страница закрыта от индекса (noindex, follow): ссылки робот проходит, в выдачу она не идёт.
 * Список строится из карты сайта, поэтому новые страницы попадают сюда сами
 */
export const metadata = {
  title: 'Карта сайта',
  description: 'Все страницы ServerCalc списком: подбор VPS, провайдеры, сравнения, сервисы, прокси и материалы',
  alternates: { canonical: '/karta-sajta' },
  robots: { index: false, follow: true },
};

const FIXED = {
  '/': 'Подбор VPS',
  '/catalog': 'Каталог тарифов',
  '/kalkulyator': 'Калькулятор конфигурации сервера',
  '/luchshie-vps-rossii': 'Лучший VPS-хостинг в России',
  '/indeks-cen-vps': 'Цены на VPS по месяцам',
  '/provajdery': 'Все провайдеры',
  '/vps-dlya': 'VPS под задачу',
  '/vps': 'VPS по географии',
  '/sravnenie': 'Сравнения провайдеров',
  '/novosti': 'Новости',
  '/zhurnal': 'Журнал',
  '/akcii': 'Акции и промокоды',
  '/metodologiya': 'Методология',
  '/o-proekte': 'О проекте',
  '/politika-konfidencialnosti': 'Политика конфиденциальности',
  '/cookie': 'Использование cookie',
  '/deshevye-vps': 'Самые дешёвые VPS',
  '/proxy': PROXY.hub.h1,
  '/api-nejrosetej': LLM_API.h1,
};

function labels() {
  const m = { ...FIXED };
  PROVIDERS.forEach((p) => (m[`/provajdery/${p.slug}`] = `${p.name}: обзор`));
  TASKS.forEach((t) => (m[`/vps-dlya/${t.slug}`] = t.h1 || t.name));
  GEO_PAGES.forEach((g) => (m[`/vps/${g.slug}`] = g.h1 || g.name));
  PAY_METHODS.forEach((x) => (m[`/vps-s-oplatoj/${x.slug}`] = x.h1));
  CHEAP_SLUGS.forEach((s) => (m[`/deshevye-vps/${s}`] = cheapPage(s)?.h1 || s));
  PAIRS.forEach((p) => (m[`/sravnenie/${p.slug}`] = pairTitle(p)));
  allServicePages().forEach((s) => (m[`/provajdery/${s.provider}/${s.slug}`] = s.h1));
  [...new Set(allServicePages().map((s) => s.provider))].forEach((p) => (m[`/provajdery/${p}/servisy`] = 'Все сервисы с ценами'));
  PROXY.providers.forEach((p) => (m[`/proxy/${p.slug}`] = p.h1));
  allPosts().forEach((p) => (m[`/novosti/${p.slug}`] = p.title));
  return m;
}

const GROUPS = [
  ['Подбор и каталог', (p) => !p.slice(1).includes('/') && !['/novosti', '/zhurnal', '/proxy', '/api-nejrosetej'].includes(p)],
  ['VPS под задачу', (p) => p.startsWith('/vps-dlya/')],
  ['VPS по географии', (p) => p.startsWith('/vps/')],
  ['Дешёвые VPS и способы оплаты', (p) => p.startsWith('/deshevye-vps/') || p.startsWith('/vps-s-oplatoj/')],
  ['Провайдеры', (p) => /^\/provajdery\/[^/]+$/.test(p)],
  ['Сервисы провайдеров кроме VPS', (p) => /^\/provajdery\/[^/]+\/[^/]+$/.test(p)],
  ['Сравнения', (p) => p.startsWith('/sravnenie/')],
  ['Прокси и API нейросетей', (p) => p.startsWith('/proxy') || p.startsWith('/api-nejrosetej')],
  ['Новости и разборы', (p) => p.startsWith('/novosti') || p.startsWith('/zhurnal')],
];

export default function SiteMapPage() {
  const lab = labels();
  const paths = sitemap().map((x) => x.url.replace(SITE_URL, '').replace(/\/$/, '') || '/');
  const used = new Set();
  const groups = GROUPS.map(([name, test]) => {
    const items = paths.filter((p) => !used.has(p) && test(p));
    items.forEach((p) => used.add(p));
    return { name, items };
  });
  const rest = paths.filter((p) => !used.has(p));
  if (rest.length) groups.push({ name: 'Другое', items: rest });

  return (
    <>
      <PageHead
        eyebrow="Навигация"
        title="Карта сайта"
        lead={`Все ${paths.length} страниц ServerCalc одним списком`}
        crumbs={[{ href: '/karta-sajta', label: 'Карта сайта' }]}
      />
      <section className="section paper">
        <div className="wrap stack-lg">
          {groups
            .filter((g) => g.items.length)
            .map((g) => (
              <div key={g.name}>
                <h2 style={{ fontSize: '1.3rem', marginBottom: 12 }}>
                  {g.name} <span className="faint">{g.items.length}</span>
                </h2>
                <ul className="sitemap-list">
                  {g.items.map((p) => (
                    <li key={p}>
                      <Link href={p}>{lab[p] || p}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
        </div>
      </section>
    </>
  );
}
