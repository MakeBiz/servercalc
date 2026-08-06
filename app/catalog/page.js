import Link from 'next/link';
import PageHead from '@/components/PageHead';
import Catalog from '@/components/Catalog';
import JsonLd from '@/components/JsonLd';
import { FreshnessRule } from '@/components/Freshness';
import { catalogRows, PROVIDERS, GEO_PAGES, REQUIREMENTS, STATS, VISIBLE_PLANS, META } from '@/lib/data';
import { plural, ruDate, price } from '@/lib/format';
import { absUrl } from '@/lib/site';

export const metadata = {
  title: 'Каталог тарифов VPS',
  description:
    'Все тарифы виртуальных серверов одной таблицей: фильтры по географии, памяти, ядрам и требованиям, сортировка по цене и по цене за гигабайт памяти. У каждого тарифа дата проверки цены',
  alternates: { canonical: '/catalog' },
};

export default function CatalogPage() {
  const rows = catalogRows();
  const providers = PROVIDERS.map((p) => ({
    slug: p.slug,
    name: p.name,
    affiliateStatus: p.affiliateStatus,
    url: p.url,
    // без этого признака каталог соберёт ссылку с метками там,
    // где партнёрская программа их не переносит
    noUtm: p.noUtm || false,
    site: p.site,
  }));

  const cheapest = [...VISIBLE_PLANS].sort((a, b) => a.priceRub - b.priceRub)[0];

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: 'Каталог тарифов виртуальных серверов',
          numberOfItems: rows.length,
          itemListElement: rows.slice(0, 40).map((r, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            item: {
              '@type': 'Product',
              name: `${r.providerName} ${r.name}`,
              description: `${r.cpu} × ${r.ram} ГБ, диск ${r.disk} ГБ ${r.diskType}, ${r.geoName}`,
              offers: {
                '@type': 'Offer',
                price: r.priceRub,
                priceCurrency: 'RUB',
                availability: 'https://schema.org/InStock',
                url: absUrl(`/provajdery/${r.providerSlug}`),
              },
            },
          })),
        }}
      />

      <PageHead
        eyebrow="Каталог"
        title="Каталог тарифов"
        lead="Полная таблица тарифов из базы. Сравнивайте не по витринной цене, а по цене за гигабайт памяти: эта метрика показывает, где вы переплачиваете за бренд"
        crumbs={[{ href: '/catalog', label: 'Каталог тарифов' }]}
        badges={
          <>
            <span className="badge badge-brass">
              {STATS.plans} {plural(STATS.plans, 'тариф', 'тарифа', 'тарифов')}
            </span>
            <span className="badge">база проверена {ruDate(STATS.verifiedAt)}</span>
            {cheapest && <span className="badge">минимальная цена {price(cheapest.priceRub)}</span>}
          </>
        }
      />

      <section className="section paper">
        <div className="wrap">
          <Catalog rows={rows} providers={providers} geos={GEO_PAGES} requirements={REQUIREMENTS} />

          <p className="faint mt">{META.rateNote}</p>

          <div className="grid-3 mt-lg">
            <div className="notice">
              <strong>Что значит «проверено».</strong> Это дата, когда цена сверялась с прайсом
              провайдера. Тариф, который не проверялся дольше {STATS.staleDays} дней, из таблицы
              уходит автоматически:{' '}
              <Link href="/novosti/pochemu-my-skryvaem-ustarevshie-tarify">
                как устроено правило свежести
              </Link>
            </div>
            <div className="notice">
              <strong>Витринная цена это не вся цена.</strong> К тарифу обычно добавляются адрес
              IPv4, панель, бэкапы и трафик сверх лимита:{' '}
              <Link href="/novosti/skolko-na-samom-dele-stoit-server">
                что не входит в цену тарифа
              </Link>
            </div>
            <div className="notice">
              <strong>Чего в таблице нет.</strong> Платных мест и закреплённых строк. Порядок задаёт
              выбранная сортировка, размер партнёрского вознаграждения на него не влияет,{' '}
              <Link href="/metodologiya">методология</Link>
            </div>
          </div>

          <div className="mt">
            <FreshnessRule />
          </div>
        </div>
      </section>
    </>
  );
}
