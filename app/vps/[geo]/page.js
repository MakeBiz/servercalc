import FeaturedPartner from '@/components/FeaturedPartner';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import PageHead from '@/components/PageHead';
import Toc from '@/components/Toc';
import Calculator from '@/components/Calculator';
import ProviderCard from '@/components/ProviderCard';
import JsonLd from '@/components/JsonLd';
import { ALL_GEO_PAGES, getGeoPage, providersForGeoPage, plansForGeoPage, minPriceOf, calculatorPayload, STATS } from '@/lib/data';
import { PAYMENTS } from '@/lib/payments';
import { geoContent } from '@/lib/geo-content';
import { CAMPAIGN } from '@/lib/utm';
import { price, plural, ruDate, termShort } from '@/lib/format';
import { taskAnswer, geoAnswer, itemListLd } from '@/lib/geo-answer';
import { geoLead, checkedAt, checkedLine, yearOf } from '@/lib/answer-first';
import { absUrl } from '@/lib/site';

export function generateStaticParams() {
  return ALL_GEO_PAGES.map((g) => ({ geo: g.slug }));
}

const listRu = (a) => (a.length > 1 ? `${a.slice(0, -1).join(', ')} и ${a[a.length - 1]}` : a.join(''));

/**
 * Вопрос об оплате для страницы страны (24.11.2026): кто из провайдеров с этой локацией
 * принимает карту МИР или СБП и у кого цена в рублях. Считается из payments.json и
 * валюты тарифов, поэтому меняется вместе с каталогом
 */
function payFaq(geo, plans, providers) {
  if (!geo.country || !plans.length) return null;
  const name = (slug) => providers.find((x) => x.slug === slug)?.name || slug;
  const slugs = [...new Set(plans.map((p) => p.providerSlug))];
  const ru = slugs.filter((s) => PAYMENTS[s]?.mir || PAYMENTS[s]?.sbp).map(name);
  const rub = slugs.filter((s) => plans.some((p) => p.providerSlug === s && p.currency === 'RUB')).map(name);
  const fx = slugs.filter((s) => !plans.some((p) => p.providerSlug === s && p.currency === 'RUB')).map(name);
  const parts = [];
  if (ru.length) parts.push(`Картой МИР или по СБП оплатить сервер ${geo.inName} можно у ${listRu(ru)}.`);
  if (rub.length) parts.push(`Цена в рублях, без привязки к курсу, у ${listRu(rub)}.`);
  if (fx.length) parts.push(`${listRu(fx)} ${fx.length > 1 ? 'выставляют' : 'выставляет'} цену в валюте, в таблице она пересчитана в рубли по курсу ЦБ на дату сверки`);
  if (!parts.length) return null;
  return { q: `Как оплатить VPS ${geo.inName} из России`, a: parts.join(' ').replace(/\.$/, '') };
}

export async function generateMetadata({ params }) {
  const { geo: slug } = await params;
  const geo = getGeoPage(slug);
  if (!geo) return {};
  const plans = plansForGeoPage(geo);
  const year = yearOf(checkedAt(plans, STATS.verifiedAt));
  const from = plans[0] ? `: от ${price(plans[0].priceRub)}/мес` : '';
  return {
    title: { absolute: `${geo.h1}, цены ${year}${from}` },
    description: `${geo.note}. Провайдеры с этой локацией и тарифы с проверенной ценой, кому подходит такое размещение`,
    alternates: { canonical: `/vps/${slug}` },
  };
}

export default async function GeoPage({ params }) {
  const { geo: slug } = await params;
  const geo = getGeoPage(slug);
  if (!geo) notFound();

  const content = geoContent(slug);
  const providers = providersForGeoPage(geo);
  const plans = plansForGeoPage(geo);
  const payload = calculatorPayload();
  const cheapest = plans[0];
  const checked = checkedAt(plans, STATS.verifiedAt);
  const quick = geoAnswer(geo, plans, providers, checked);
  const lead = geoLead(geo.h1.replace(/^VPS (\(ВПС\) )?/, ''), plans, checked, geo.code);
  const pay = payFaq(geo, plans, providers);
  const faqAll = geo.country
    ? [...(quick ? [quick.faq] : []), ...(pay ? [pay] : []), ...(content?.faq || [])]
    : [...(content?.faq || []), ...(quick ? [quick.faq] : [])];
  const pageUrl = absUrl(`/vps/${slug}/`);

  return (
    <>
      {faqAll.length > 0 && (
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faqAll.map((f) => ({
              '@type': 'Question',
              name: f.q,
              acceptedAnswer: { '@type': 'Answer', text: f.a },
            })),
          }}
        />
      )}

      {quick && <JsonLd data={itemListLd(geo.h1, pageUrl, plans, providers, checked)} />}

      <PageHead
        eyebrow={plans.length ? checkedLine(checked) : 'География'}
        title={geo.h1}
        lead={lead || geo.note}
        crumbs={[
          { href: '/vps', label: 'География' },
          ...(geo.country ? [{ href: `/vps/${geo.parent}`, label: geo.parentName }] : []),
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
            <span className="badge">проверено {ruDate(checked)}</span>
          </>
        }
      />

      <Toc
        items={[
          { id: 's-komu', label: 'Кому подходит' },
          { id: 's-podbor', label: 'Подбор сервера' },
          { id: 's-tarify', label: 'Тарифы' },
          { id: 's-provajdery', label: 'Провайдеры' },
          faqAll.length > 0 && { id: 's-faq', label: 'Частые вопросы' },
        ]}
      />

      {quick && (
        <section className="section-tight paper">
          <div className="wrap">
            <div className="notice">
              <strong>{geo.note}.</strong> {quick.text}
            </div>
          </div>
        </section>
      )}

      <section className="section paper">
        <div className="wrap">
          <div className="eyebrow">
            <span className="label">Зачем эта география</span>
          </div>
          <h2 id="s-komu">{geo.inName ? `Кому подходит VPS ${geo.inName}` : `Кому подходит ${geo.name}`}</h2>
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

      {['ru', 'eu'].includes(geo.code) && (
        <section className="section-tight paper">
          <div className="wrap">
            <FeaturedPartner place={`geo_${slug}`} compact />
          </div>
        </section>
      )}

      <section className="section ink">
        <div className="wrap">
          <div className="eyebrow">
            <span className="label label-brass">Подбор</span>
          </div>
          <h2 id="s-podbor" style={{ marginBottom: 24 }}>{geo.inName ? `Подберём сервер ${geo.inName}` : `Подберём сервер с локацией ${geo.name}`}</h2>
          <Calculator payload={payload} presetGeo={geo.country ? geo.parent : slug} presetCountry={geo.country || null} campaign={CAMPAIGN.geo(slug)} />
        </div>
      </section>

      <section className="section paper">
        <div className="wrap">
          <div className="between mb">
            <div>
              <div className="eyebrow">
                <span className="label">Тарифы</span>
              </div>
              <h2 id="s-tarify">{geo.inName ? `Тарифы VPS ${geo.inName}` : 'Тарифы с этой локацией'}</h2>
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
                          <td className="td-price" style={{ textAlign: 'right' }}>{price(p.priceRub)}{termShort(p) && <div className="faint" style={{ fontSize: '0.75rem', fontWeight: 400 }}>{termShort(p)}</div>}</td>
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
          <h2 id="s-provajdery" style={{ marginBottom: 24 }}>{geo.inName ? `Провайдеры с серверами ${geo.inName}` : 'У кого есть эта локация'}</h2>
          <div className="cards cards-2">
            {providers.map((p) => (
              <ProviderCard
                key={p.slug}
                provider={p}
                minPrice={geo.country ? plans.find((x) => x.providerSlug === p.slug)?.priceRub ?? minPriceOf(p.slug) : minPriceOf(p.slug)}
                campaign={CAMPAIGN.geo(slug)}
                geoLabel={geo.name}
              />
            ))}
          </div>
        </div>
      </section>

      {faqAll.length > 0 && (
        <section className="section paper">
          <div className="wrap">
            <div className="eyebrow">
              <span className="label">Вопросы</span>
            </div>
            <h2 id="s-faq" style={{ marginBottom: 26 }}>{geo.inName ? `Частые вопросы про VPS ${geo.inName}` : 'Что спрашивают про эту географию'}</h2>
            <div className="stack-lg">
              {faqAll.map((f) => (
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
            {ALL_GEO_PAGES.filter((g) => g.slug !== slug).map((g) => (
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
