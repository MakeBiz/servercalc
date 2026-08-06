import Link from 'next/link';
import PageHead from '@/components/PageHead';
import JsonLd from '@/components/JsonLd';
import { GEO_PAGES, providersForGeo, plansForGeo } from '@/lib/data';
import { geoContent } from '@/lib/geo-content';
import { price, plural } from '@/lib/format';
import { absUrl } from '@/lib/site';

export const metadata = {
  title: 'География размещения VPS',
  description:
    'Где разместить сервер: Россия, Европа, ОАЭ, США, Казахстан или провайдер с сетью по миру. Разбор задержки, цены за ресурс и требований к размещению данных',
  alternates: { canonical: '/vps' },
};

export default function GeosPage() {
  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: 'География размещения VPS',
          numberOfItems: GEO_PAGES.length,
          itemListElement: GEO_PAGES.map((g, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: g.h1,
            url: absUrl(`/vps/${g.slug}`),
          })),
        }}
      />

      <PageHead
        eyebrow="География"
        title="Где разместить сервер"
        lead="География влияет на три вещи: задержку до вашей аудитории, цену за одни и те же ресурсы и то, какие данные вы имеете право там держать. На каждой странице разобраны все три"
        crumbs={[{ href: '/vps', label: 'География' }]}
        badges={<span className="badge badge-brass">{GEO_PAGES.length} направлений</span>}
      />

      <section className="section paper">
        <div className="wrap">
          <div className="cards cards-2">
            {GEO_PAGES.map((geo) => {
              const plans = plansForGeo(geo.code);
              const providers = providersForGeo(geo.code);
              const content = geoContent(geo.slug);
              return (
                <Link key={geo.slug} href={`/vps/${geo.slug}`} className="card">
                  <div className="card-top">
                    <h3>{geo.h1}</h3>
                    <span className="badge">
                      {plans.length} {plural(plans.length, 'тариф', 'тарифа', 'тарифов')}
                    </span>
                  </div>
                  <p className="faint" style={{ margin: 0 }}>{geo.note}</p>
                  {content && (
                    <p className="dim" style={{ fontSize: '0.9rem', margin: 0 }}>
                      {content.why.split('. ')[0]}
                    </p>
                  )}
                  <div className="card-foot">
                    <span className="faint">
                      {providers.length} {plural(providers.length, 'провайдер', 'провайдера', 'провайдеров')}
                    </span>
                    <span className="mono">{plans[0] ? `от ${price(plans[0].priceRub)}` : '—'}</span>
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="notice mt-lg">
            <strong>Про персональные данные.</strong> Если проект собирает персональные данные
            российских пользователей, их обработка должна вестись с использованием баз на
            территории России. Это касается регистраций, форм и личных кабинетов, и это вопрос
            юридической схемы, а не производительности. Для проектов без персональных данных
            география выбирается только по задержке и цене
          </div>
        </div>
      </section>
    </>
  );
}
