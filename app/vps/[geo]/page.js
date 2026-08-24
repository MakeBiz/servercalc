import Link from 'next/link';
import { notFound } from 'next/navigation';
import PageHead from '@/components/PageHead';
import Calculator from '@/components/Calculator';
import ProviderCard from '@/components/ProviderCard';
import JsonLd from '@/components/JsonLd';
import { GEO_PAGES, getGeo, providersForGeo, plansForGeo, minPriceOf, calculatorPayload, STATS } from '@/lib/data';
import { geoContent } from '@/lib/geo-content';
import { CAMPAIGN } from '@/lib/utm';
import { price, plural, ruDate } from '@/lib/format';

export function generateStaticParams() {
  return GEO_PAGES.map((g) => ({ geo: g.slug }));
}

export async function generateMetadata({ params }) {
  const { geo: slug } = await params;
  const geo = getGeo(slug);
  if (!geo) return {};
  return {
    title: geo.h1,
    description: `${geo.note}. Провайдеры с этой локацией и тарифы с проверенной ценой, кому подходит такое размещение`,
    alternates: { canonical: `/vps/${slug}` },
  };
}

export default async function GeoPage({ params }) {
  const { geo: slug } = await params;
  const geo = getGeo(slug);
  if (!geo) notFound();

  const content = geoContent(slug);
  const providers = providersForGeo(geo.code);
  const plans = plansForGeo(geo.code);
  const payload = calculatorPayload();
  const cheapest = plans[0];

  return (
    <>
      {content?.faq && (
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: content.faq.map((f) => ({
              '@type': 'Question',
              name: f.q,
              acceptedAnswer: { '@type': 'Answer', text: f.a },
            })),
          }}
        />
      )}

      <PageHead
        eyebrow="География"
        title={geo.h1}
        lead={geo.note}
        crumbs={[
          { href: '/vps', label: 'География' },
          { href: `/vps/${slug}`, label: geo.name },
        ]}
        badges={
          <>
            <span className="badge badge-brass">
              {plans.length} {plural(plans.length, 'тариф', 'тарифа', 'тарифов')}
            </span>
            <span className="badge">
              {providers.length} {plural(providers.length, 'провайдер', 'провайдера', 'провайдеров')}
            </span>
            {cheapest && <span className="badge">от {price(cheapest.priceRub)} в месяц</span>}
            <span className="badge">проверено {ruDate(STATS.verifiedAt)}</span>
          </>
        }
      />

      <section className="section paper">
        <div className="wrap">
          <div className="eyebrow">
            <span className="label">Зачем эта география</span>
          </div>
          <h2>Кому подходит {geo.name}</h2>
          <p className="lead mb">{content?.why}</p>

          <div className="grid-2 mt">
            <div>
              <div className="eyebrow">
                <span className="label">Что даёт</span>
              </div>
              <ul className="list-check">
                {content?.pros.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <div className="eyebrow">
                <span className="label">Чем приходится платить</span>
              </div>
              <ul className="list-check list-minus">
                {content?.cons.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="section ink">
        <div className="wrap">
          <div className="eyebrow">
            <span className="label label-brass">Подбор</span>
          </div>
          <h2 style={{ marginBottom: 24 }}>Подберём сервер с локацией {geo.name}</h2>
          <Calculator payload={payload} presetGeo={slug} campaign={CAMPAIGN.geo(slug)} />
        </div>
      </section>

      <section className="section paper">
        <div className="wrap">
          <div className="between mb">
            <div>
              <div className="eyebrow">
                <span className="label">Тарифы</span>
              </div>
              <h2>Тарифы с этой локацией</h2>
            </div>
            <Link href="/catalog" className="btn btn-ghost">
              Весь каталог
            </Link>
          </div>

          {plans.length === 0 ? (
            <div className="notice notice-warn">
              <strong>Пока пусто.</strong> Тарифы с этой локацией не проверялись дольше{' '}
              {STATS.staleDays} дней и скрыты с витрины
            </div>
          ) : (
            <div className="tbl-wrap">
              <div className="tbl-scroll">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Провайдер</th>
                      <th>Тариф</th>
                      <th>CPU</th>
                      <th>Память</th>
                      <th>Диск</th>
                      <th>Цена за ГБ</th>
                      <th>Проверено</th>
                      <th style={{ textAlign: 'right' }}>Цена</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plans.map((p) => {
                      const provider = providers.find((x) => x.slug === p.providerSlug);
                      return (
                        <tr key={p.id}>
                          <td>
                            <Link href={`/provajdery/${p.providerSlug}`} style={{ textDecoration: 'none', fontWeight: 600 }}>
                              {provider?.name || p.providerSlug}
                            </Link>
                          </td>
                          <td>{p.name}</td>
                          <td className="td-num">{p.cpu}</td>
                          <td className="td-num">{p.ram} ГБ</td>
                          <td className="td-num">{p.disk} ГБ <span className="faint">{p.diskType}</span></td>
                          <td className="td-num">{price(p.priceRub / p.ram)}</td>
                          <td className="td-num faint">{ruDate(p.verifiedAt)}</td>
                          <td className="td-price" style={{ textAlign: 'right' }}>{price(p.priceRub)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="section paper-alt">
        <div className="wrap">
          <div className="eyebrow">
            <span className="label">Провайдеры</span>
          </div>
          <h2 style={{ marginBottom: 24 }}>У кого есть эта локация</h2>
          <div className="cards cards-2">
            {providers.map((p) => (
              <ProviderCard
                key={p.slug}
                provider={p}
                minPrice={minPriceOf(p.slug)}
                campaign={CAMPAIGN.geo(slug)}
                geoLabel={geo.name}
              />
            ))}
          </div>
        </div>
      </section>

      {content?.faq && (
        <section className="section paper">
          <div className="wrap">
            <div className="eyebrow">
              <span className="label">Вопросы</span>
            </div>
            <h2 style={{ marginBottom: 26 }}>Что спрашивают про эту географию</h2>
            <div className="stack-lg">
              {content.faq.map((f) => (
                <div key={f.q}>
                  <h3>{f.q}</h3>
                  <p className="dim">{f.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="section-tight paper-alt">
        <div className="wrap">
          <div className="eyebrow">
            <span className="label">Другие направления</span>
          </div>
          <div className="chips">
            {GEO_PAGES.filter((g) => g.slug !== slug).map((g) => (
              <Link key={g.slug} href={`/vps/${g.slug}`} className="chip chip-light">
                {g.name}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
