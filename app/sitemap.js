import { PAGE_PROVIDERS, TASKS, ALL_GEO_PAGES } from '@/lib/data';
import { allPosts } from '@/lib/news';
import { HAS_PROMOS } from '@/lib/promos';
import { PAIRS } from '@/lib/compare';
import { absUrl } from '@/lib/site';
import { PAY_METHODS } from '@/lib/payments';
import { CHEAP_SLUGS } from '@/lib/cheap-pages';
import { SERVICE_PROVIDERS, allServicePages } from '@/lib/provider-services';
import { PROXY } from '@/lib/partners-extra';
import {
  DOC_DATES, catalogDate, providerDate, pairDate, taskDate, geoDate, cheapDate, payDate,
  serviceDate, proxyDate, llmApiDate, promoDate, postsDate, indexDate,
} from '@/lib/page-dates';

/**
 * Карта сайта генерируется из данных, а не поддерживается руками.
 * Добавили провайдера или задачу в JSON, страница появилась в sitemap автоматически
 */
// Нужно для статического экспорта: маршрут отдаётся файлом, а не функцией
export const dynamic = 'force-static';

/**
 * lastmod каждой страницы берётся из lib/page-dates.js, оттуда же берётся dateModified
 * в разметке и дата на самой странице (28.11.2026). Раньше вся карта отдавала одну дату
 * сверки базы, а страницы-документы константу от 06.08: lastmod расходился со страницей.
 * Меняете текст /metodologiya, /o-proekte, /cookie или политики, поднимите дату в DOC_DATES
 */
export default function sitemap() {
  const updated = new Date(catalogDate());
  const doc = (key) => new Date(DOC_DATES[key]);
  const posts = allPosts();
  // ленты меняются тогда, когда выходит свежий материал своей рубрики
  const newsUpdated = new Date(postsDate(posts.filter((p) => p.rubric !== 'obzory')));
  const journalUpdated = new Date(postsDate(posts.filter((p) => p.rubric === 'obzory')));

  const core = [
    { url: absUrl('/'), priority: 1, changeFrequency: 'daily', lastModified: updated },
    { url: absUrl('/catalog'), priority: 0.9, changeFrequency: 'daily', lastModified: updated },
    { url: absUrl('/kalkulyator'), priority: 0.85, changeFrequency: 'weekly', lastModified: updated },
    { url: absUrl('/luchshie-vps-rossii'), priority: 0.85, changeFrequency: 'weekly', lastModified: updated },
    { url: absUrl('/indeks-cen-vps'), priority: 0.85, changeFrequency: 'monthly', lastModified: new Date(indexDate()) },
    { url: absUrl('/provajdery'), priority: 0.8, changeFrequency: 'weekly', lastModified: updated },
    { url: absUrl('/vps-dlya'), priority: 0.8, changeFrequency: 'weekly', lastModified: updated },
    { url: absUrl('/vps'), priority: 0.8, changeFrequency: 'weekly', lastModified: updated },
    ...(PAIRS.length ? [{ url: absUrl('/sravnenie'), priority: 0.7, changeFrequency: 'weekly', lastModified: updated }] : []),
    { url: absUrl('/novosti'), priority: 0.7, changeFrequency: 'weekly', lastModified: newsUpdated },
    { url: absUrl('/zhurnal'), priority: 0.7, changeFrequency: 'weekly', lastModified: journalUpdated },
    // раздел акций попадает в карту, только когда в нём есть проверенные акции
    ...(HAS_PROMOS
      ? [{ url: absUrl('/akcii'), priority: 0.8, changeFrequency: 'daily', lastModified: new Date(promoDate()) }]
      : []),
    { url: absUrl('/metodologiya'), priority: 0.6, changeFrequency: 'monthly', lastModified: doc('metodologiya') },
    { url: absUrl('/o-proekte'), priority: 0.5, changeFrequency: 'monthly', lastModified: doc('o-proekte') },
    { url: absUrl('/politika-konfidencialnosti'), priority: 0.3, changeFrequency: 'yearly', lastModified: doc('politika-konfidencialnosti') },
    { url: absUrl('/cookie'), priority: 0.3, changeFrequency: 'yearly', lastModified: doc('cookie') },
  ];

  const cheap = ['', ...CHEAP_SLUGS].map((s) => ({
    url: absUrl(`/deshevye-vps${s ? `/${s}` : ''}`),
    lastModified: new Date(cheapDate(s)),
    changeFrequency: 'weekly',
    priority: 0.85,
  }));

  const pays = PAY_METHODS.map((m) => ({
    url: absUrl(`/vps-s-oplatoj/${m.slug}`),
    lastModified: new Date(payDate()),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  const tasks = TASKS.map((t) => ({
    url: absUrl(`/vps-dlya/${t.slug}`),
    lastModified: new Date(taskDate(t.slug)),
    changeFrequency: 'weekly',
    priority: 0.9,
  }));

  const geos = ALL_GEO_PAGES.map((g) => ({
    url: absUrl(`/vps/${g.slug}`),
    lastModified: new Date(geoDate(g.slug)),
    changeFrequency: 'weekly',
    priority: 0.85,
  }));

  const providers = PAGE_PROVIDERS.map((p) => ({
    url: absUrl(`/provajdery/${p.slug}`),
    lastModified: new Date(providerDate(p.slug)),
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  const postUrls = posts.map((p) => ({
    url: absUrl(`/novosti/${p.slug}`),
    lastModified: new Date(p.updated || p.date),
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  const compares = PAIRS.map((p) => ({
    url: absUrl(`/sravnenie/${p.slug}`),
    lastModified: new Date(pairDate(p.slug)),
    changeFrequency: 'weekly',
    priority: 0.75,
  }));

  // сервисы провайдеров кроме VPS (с 01.11.2026): обзор и страница каждого сервиса
  const services = [
    ...SERVICE_PROVIDERS.map((p) => ({
      url: absUrl(`/provajdery/${p}/servisy`),
      lastModified: new Date(serviceDate(p)),
      changeFrequency: 'weekly',
      priority: 0.75,
    })),
    ...allServicePages().map((s) => ({
      url: absUrl(`/provajdery/${s.provider}/${s.slug}`),
      lastModified: new Date(serviceDate(s.provider)),
      changeFrequency: 'weekly',
      priority: 0.7,
    })),
  ];

  // разделы вне VPS (04.11.2026): прокси и API нейросетей
  const extra = [
    { url: absUrl('/proxy'), lastModified: new Date(proxyDate()), changeFrequency: 'weekly', priority: 0.75 },
    ...PROXY.providers.map((p) => ({ url: absUrl(`/proxy/${p.slug}`), lastModified: new Date(proxyDate()), changeFrequency: 'weekly', priority: 0.7 })),
    { url: absUrl('/api-nejrosetej'), lastModified: new Date(llmApiDate()), changeFrequency: 'weekly', priority: 0.75 },
  ];

  return [...core, ...tasks, ...geos, ...cheap, ...pays, ...providers, ...services, ...extra, ...compares, ...postUrls];
}
