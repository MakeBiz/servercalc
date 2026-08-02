import { PROVIDERS, TASKS, GEOS, STATS } from '@/lib/data';
import { allPosts } from '@/lib/news';
import { absUrl } from '@/lib/site';

/**
 * Карта сайта генерируется из данных, а не поддерживается руками.
 * Добавили провайдера или задачу в JSON, страница появилась в sitemap автоматически
 */
// Нужно для статического экспорта: маршрут отдаётся файлом, а не функцией
export const dynamic = 'force-static';

export default function sitemap() {
  const updated = new Date(STATS.verifiedAt);

  const core = [
    { url: absUrl('/'), priority: 1, changeFrequency: 'daily' },
    { url: absUrl('/catalog'), priority: 0.9, changeFrequency: 'daily' },
    { url: absUrl('/provajdery'), priority: 0.8, changeFrequency: 'weekly' },
    { url: absUrl('/vps-dlya'), priority: 0.8, changeFrequency: 'weekly' },
    { url: absUrl('/vps'), priority: 0.8, changeFrequency: 'weekly' },
    { url: absUrl('/novosti'), priority: 0.7, changeFrequency: 'weekly' },
    { url: absUrl('/metodologiya'), priority: 0.6, changeFrequency: 'monthly' },
    { url: absUrl('/o-proekte'), priority: 0.5, changeFrequency: 'monthly' },
    { url: absUrl('/politika-konfidencialnosti'), priority: 0.3, changeFrequency: 'yearly' },
    { url: absUrl('/cookie'), priority: 0.3, changeFrequency: 'yearly' },
  ].map((item) => ({ ...item, lastModified: updated }));

  const tasks = TASKS.map((t) => ({
    url: absUrl(`/vps-dlya/${t.slug}`),
    lastModified: updated,
    changeFrequency: 'weekly',
    priority: 0.9,
  }));

  const geos = GEOS.map((g) => ({
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

  const posts = allPosts().map((p) => ({
    url: absUrl(`/novosti/${p.slug}`),
    lastModified: new Date(p.updated || p.date),
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  return [...core, ...tasks, ...geos, ...providers, ...posts];
}
