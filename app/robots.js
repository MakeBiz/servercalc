import { absUrl, SITE } from '@/lib/site';

// Нужно для статического экспорта: маршрут отдаётся файлом, а не функцией
export const dynamic = 'force-static';

export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Фильтры каталога живут в состоянии компонента, а не в адресе,
        // поэтому мусорных страниц под комбинации фильтров не возникает.
        // Запреты ниже на случай, если параметры появятся позже
        disallow: ['/*?*sort=', '/*?*filter=', '/*?*utm_'],
      },
    ],
    sitemap: absUrl('/sitemap.xml'),
    host: SITE.domain,
  };
}
