import { PROVIDERS, TASKS, GEO_PAGES, STATS } from '@/lib/data';
import { allPosts } from '@/lib/news';
import { HAS_PROMOS } from '@/lib/promos';
import { absUrl } from '@/lib/site';

/**
 * Карта сайта генерируется из данных, а не поддерживается руками.
 * Добавили провайдера или задачу в JSON, страница появилась в sitemap автоматически
 */
// Нужно для статического экспорта: маршрут отдаётся файлом, а не функцией
export const dynamic = 'force-static';

/**
 * Дата последней правки текстовых страниц. lastmod должен отражать реальное
 * изменение конкретной страницы, поэтому страницы с данными живут по дате
 * проверки базы, а страницы-документы по этой константе. Меняете текст на
 * /metodologiya, /o-proekte, /cookie или в политике, поднимите дату здесь
 */
const DOCS_UPDATED = '2026-08-06';

export default function sitemap() {
  const updated = new Date(STATS.verifiedAt);
  const docs = new Date(DOCS_UPDATED);
  const posts = allPosts();
  // лента новостей меняется тогда, когда выходит свежий материал
  const newsUpdated = posts.length
    ? new Date(Math.max(...posts.map((p) => new Date(p.updated || p.date).getTime())))
    : docs;

  const core = [
    { url: absUrl('/'), priority: 1, changeFrequency: 'daily', lastModified: updated },
    { url: absUrl('/catalog'), priority: 0.9, changeFrequency: 'daily', lastModified: updated },
    { url: absUrl('/provajdery'), priority: 0.8, changeFrequency: 'weekly', lastModified: updated },
    { url: absUrl('/vps-dlya'), priority: 0.8, changeFrequency: 'weekly', lastModified: updated },
    { url: absUrl('/vps'), priority: 0.8, changeFrequency: 'weekly', lastModified: updated },
    { url: absUrl('/novosti'), priority: 0.7, changeFrequency: 'weekly', lastModified: newsUpdated },
    // раздел акций попадает в карту, только когда в нём есть проверенные акции
    ...(HAS_PROMOS
      ? [{ url: absUrl('/akcii'), priority: 0.8, changeFrequency: 'daily', lastModified: updated }]
      : []),
    { url: absUrl('/metodologiya'), priority: 0.6, changeFrequency: 'monthly', lastModified: docs },
    { url: absUrl('/o-proekte'), priority: 0.5, changeFrequency: 'monthly', lastModified: docs },
    { url: absUrl('/politika-konfidencialnosti'), priority: 0.3, changeFrequency: 'yearly', lastModified: docs },
    { url: absUrl('/cookie'), priority: 0.3, changeFrequency: 'yearly', lastModified: docs },
  ];

  const tasks = TASKS.map((t) => ({
    url: absUrl(`/vps-dlya/${t.slug}`),
    lastModified: updated,
    changeFrequency: 'weekly',
    priority: 0.9,
  }));

  const geos = GEO_PAGES.map((g) => ({
    url: absUrl(`/vps/${g.slug}`),
    lastModified: updated,
    changeFrequency: 'weekly',
    priority: 0.85,
  }));

  const providers = PROVIDERS.map((p) => ({
    url: absUrl(`/provajdery/${p.slug}`),
    lastModified: updated,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  const postUrls = posts.map((p) => ({
    url: absUrl(`/novosti/${p.slug}`),
    lastModified: new Date(p.updated || p.date),
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  return [...core, ...tasks, ...geos, ...providers, ...postUrls];
}
