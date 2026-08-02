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
  trailingSlash: false,
  images: { unoptimized: true },
};
export default nextConfig;
