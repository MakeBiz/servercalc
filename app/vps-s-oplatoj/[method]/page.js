import Link from 'next/link';
import { notFound } from 'next/navigation';
import PageHead from '@/components/PageHead';
import ProviderCard from '@/components/ProviderCard';
import JsonLd from '@/components/JsonLd';
import { PAY_METHODS, getPayMethod, providersByPayment, paymentList, PAYMENTS_CHECKED } from '@/lib/payments';
import { plansOf } from '@/lib/data';
import { CAMPAIGN } from '@/lib/utm';
import { price, plural, ruDate } from '@/lib/format';
import { absUrl } from '@/lib/site';

export function generateStaticParams() {
  return PAY_METHODS.map((m) => ({ method: m.slug }));
}

export async function generateMetadata({ params }) {
  const { method } = await params;
  const m = getPayMethod(method);
  if (!m) return {};
  const list = providersByPayment(m.key);
  const from = list[0]?.minPrice ? `: от ${price(list[0].minPrice)}/мес` : '';
  return {
    title: { absolute: `${m.h1}${from}` },
    description: `Какие VPS-провайдеры принимают оплату ${m.name}: ${list.slice(0, 5).map((p) => p.name).join(', ')}. Цены с датой проверки и способы оплаты по официальным страницам провайдеров`,
    alternates: { canonical: `/vps-s-oplatoj/${method}` },
  };
}

export default async function PayPage({ params }) {
  const { method } = await params;
  const m = getPayMethod(method);
  if (!m) notFound();
  const list = providersByPayment(m.key);
  const cheapest = list[0];
  const pageUrl = absUrl(`/vps-s-oplatoj/${method}/`);
  const shortAnswer = list.length
    ? `Оплату ${m.name} принимают ${list.length} ${plural(list.length, 'провайдер', 'провайдера', 'провайдеров')} из каталога: ${list.map((p) => `${p.name}${p.minPrice ? ` (от ${price(p.minPrice)} в месяц)` : ''}`).join(', ')}. Самый доступный вариант сейчас ${cheapest.name}. Способы оплаты сверены по официальным страницам провайдеров ${ruDate(PAYMENTS_CHECKED)}`
    : `Среди провайдеров каталога сейчас нет тех, кто подтверждает оплату ${m.name}`;
  const faq = [{ q: `Какие VPS можно оплатить ${m.name}`, a: shortAnswer }, ...m.faq];

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
        }}
      />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          inLanguage: 'ru-RU',
          name: m.h1,
          url: pageUrl,
          dateModified: PAYMENTS_CHECKED,
          mainEntity: {
            '@type': 'ItemList',
            name: `Провайдеры VPS с оплатой ${m.name}`,
            itemListElement: list.map((p, i) => ({ '@type': 'ListItem', position: i + 1, name: p.name, url: absUrl(`/provajdery/${p.slug}/`) })),
          },
        }}
      />

      <PageHead
        eyebrow={`Способы оплаты сверены ${ruDate(PAYMENTS_CHECKED)}`}
        title={m.h1}
        lead={m.why}
        crumbs={[{ href: '/vps', label: 'География' }, { href: `/vps-s-oplatoj/${method}`, label: `Оплата ${m.name}` }]}
        badges={
          <>
            <span className="badge badge-brass">{list.length} {plural(list.length, 'провайдер', 'провайдера', 'провайдеров')}</span>
            {cheapest?.minPrice && <span className="badge">от {price(cheapest.minPrice)} в месяц</span>}
          </>
        }
      />

      <section className="section-tight paper">
        <div className="wrap">
          <div className="notice">
            <strong>Коротко.</strong> {shortAnswer}
          </div>
        </div>
      </section>

      <section className="section paper">
        <div className="wrap">
          <h2 style={{ marginBottom: 20 }}>Провайдеры и способы оплаты</h2>
          <div className="tbl-wrap">
            <div className="tbl-scroll">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Провайдер</th>
                    <th>Чем можно оплатить</th>
                    <th>Тарифов</th>
                    <th style={{ textAlign: 'right' }}>Цена от</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((p) => (
                    <tr key={p.slug}>
                      <td><Link href={`/provajdery/${p.slug}`} style={{ textDecoration: 'none', fontWeight: 600 }}>{p.name}</Link></td>
                      <td>{paymentList(p.slug).join(', ')}</td>
                      <td className="td-num">{plansOf(p.slug).length}</td>
                      <td className="td-price" style={{ textAlign: 'right' }}>{p.minPrice ? price(p.minPrice) : 'уточняется'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <p className="faint" style={{ marginTop: 12 }}>
            Способы оплаты взяты с официальных страниц оплаты провайдеров и могут меняться. Перед оплатой проверьте их в панели провайдера
          </p>
        </div>
      </section>

      <section className="section paper-alt">
        <div className="wrap">
          <h2 style={{ marginBottom: 24 }}>Карточки провайдеров</h2>
          <div className="cards cards-3">
            {list.map((p) => (
              <ProviderCard key={p.slug} provider={p} minPrice={p.minPrice} campaign={`pay_${m.key}`} />
            ))}
          </div>
        </div>
      </section>

      <section className="section paper">
        <div className="wrap">
          <h2 style={{ marginBottom: 26 }}>Вопросы про оплату {m.name}</h2>
          <div className="stack-lg">
            {faq.map((f) => (
              <div key={f.q}>
                <h3>{f.q}</h3>
                <p className="dim">{f.a}</p>
              </div>
            ))}
          </div>
          <p style={{ marginTop: 28 }}>
            <Link href="/#podbor" className="btn btn-brass">Подобрать сервер под задачу</Link>
          </p>
        </div>
      </section>

      <section className="section-tight paper-alt">
        <div className="wrap">
          <div className="chips">
            {PAY_METHODS.filter((x) => x.slug !== method).map((x) => (
              <Link key={x.slug} href={`/vps-s-oplatoj/${x.slug}`} className="chip chip-light">{x.h1}</Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
