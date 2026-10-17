/**
 * Сайт целиком статический: все 49 страниц собираются в файлы и раздаются
 * любым веб-сервером без Node-процесса. Это снимает целый класс проблем
 * с хостингом и делает пересборку после парсера единственной операцией.
 *
 * Если когда-нибудь понадобится серверный режим (ISR, API-маршруты,
 * ревалидация по запросу), запускайте сборку с SERVERCALC_SERVER=1
 */
const asServer = process.env.SERVERCALC_SERVER === '1';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: asServer ? undefined : 'export',
  reactStrictMode: true,
  poweredByHeader: false,
  // Адреса страниц со слешем на конце (17.10.2026). Хостинг отдаёт страницы
  // папками и переводит /catalog на /catalog/, поэтому ссылки, canonical и
  // карта сайта должны сразу вести на адрес со слешем, иначе каждая ссылка
  // и каждый адрес карты проходят через переадресацию (так было до 17.10:
  // 52 из 77 адресов карты Google видел переадресацией)
  trailingSlash: true,
  images: { unoptimized: true },
};
export default nextConfig;
