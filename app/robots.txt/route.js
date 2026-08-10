import { absUrl, SITE } from '@/lib/site';

// Отдаём robots.txt текстом, а не через metadata-хелпер Next: нам нужна
// директива Clean-param, которой в его схеме нет. Она специфична для Яндекса
// и решает конкретную проблему: рекламный трафик приходит на адреса вида
// /vps?etext=… и /akcii?gid=…, и без неё Яндекс считает их отдельными
// страницами-дублями. Clean-param склеивает их с чистым адресом и переносит
// на него накопленные сигналы, в отличие от Disallow, который просто
// запрещает обход и сигналы теряет
export const dynamic = 'force-static';

// Параметры, которые не меняют содержимое страницы: рекламные метки Директа
// (yclid, etext, gid, aid), наши utm и кэш-бастер vt
const TRACKING = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'yclid',
  'etext',
  'gid',
  'aid',
  'vt',
].join('&');

export function GET() {
  const body = [
    'User-agent: *',
    'Allow: /',
    // Состояние фильтров каталога живёт в компоненте, а не в адресе, но
    // на случай появления таких параметров запрет остаётся
    'Disallow: /*?*sort=',
    'Disallow: /*?*filter=',
    '',
    `Clean-param: ${TRACKING}`,
    '',
    `Host: ${SITE.domain}`,
    `Sitemap: ${absUrl('/sitemap.xml')}`,
    '',
  ].join('\n');

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
