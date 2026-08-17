// Шрифты подключаются локально пакетами fontsource, а не с серверов Google.
// Так у сайта нет внешних запросов при загрузке: это и скорость, и отсутствие
// зависимости от доступности fonts.googleapis.com для читателей из России
// Шрифты подключаются локально пакетами fontsource, без запросов к Google.
// Дизайн-система Claude Design: Manrope для заголовков, Inter для текста.
// Моноширинный (цифры, даты, надзаголовки) берём системный — см. --font-mono
// в globals.css: это минус 52 КБ загрузки на каждом первом визите
import '@fontsource-variable/manrope';
import '@fontsource-variable/inter';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CookieBanner from '@/components/CookieBanner';
import Metrika from '@/components/Metrika';
import DemoStrip from '@/components/DemoStrip';
import { SITE, SITE_URL, SITE_NAME } from '@/lib/site';
import { HAS_PROMOS } from '@/lib/promos';

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME}, ${SITE.tagline}`,
    template: `%s — ${SITE_NAME}`,
  },
  description:
    'Справочный каталог виртуальных серверов: подбор под задачу, сравнение тарифов по цене за ресурс и дата проверки цены у каждого тарифа',
  applicationName: SITE_NAME,
  robots: { index: true, follow: true },
  // Подтверждение прав в Яндекс Вебмастере. Код привязан к домену и лежит
  // в data/site.json: при смене домена меняется там же, а не в разметке
  ...(SITE.yandexVerification
    ? { verification: { yandex: [SITE.yandexVerification, SITE.yandexVerification2].filter(Boolean) } }
    : {}),
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    siteName: SITE_NAME,
    url: SITE_URL,
  },
  formatDetection: { telephone: false, address: false },
};

export const viewport = {
  themeColor: '#0b0e12',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body>
        <DemoStrip />
        <Header showPromos={HAS_PROMOS} />
        <main>{children}</main>
        <Footer />
        <CookieBanner />
        <Metrika />
      </body>
    </html>
  );
}
