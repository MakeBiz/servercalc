import Link from 'next/link';
import { notFound } from 'next/navigation';
import PageHead from '@/components/PageHead';
import OutLink from '@/components/OutLink';
import JsonLd from '@/components/JsonLd';
import { getProvider, minPriceOf, plansOf } from '@/lib/data';
import { SERVICE_PROVIDERS, serviceBlock, servicesByGroup, servicesOf, fromLabel } from '@/lib/provider-services';
import { price, ruDate } from '@/lib/format';
import { absUrl } from '@/lib/site';

export const dynamicParams = false;

export function generateStaticParams() {
  return SERVICE_PROVIDERS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const block = serviceBlock(slug);
  if (!block) return {};
  return {
    title: { absolute: block.hub.title },
    description: block.hub.description,
    alternates: { canonical: `/provajdery/${slug}/servisy` },
  };
}

export default async function ServicesHub({ params }) {
  const { slug } = await params;
  const provider = getProvider(slug);
  const block = serviceBlock(slug);
  if (!provider || !block) notFound();
  const groups = servicesByGroup(slug);
  const all = servicesOf(slug);
  const min = minPriceOf(slug);
  const plans = plansOf(slug);

  const faq = [
    {
      q: `Какие сервисы есть у ${provider.name} кроме VPS?`,
      a: `Мы разобрали ${all.length} сервисов: ${all.map((s) => s.menu).join(', ')}. У каждого своя страница с ценами и ограничениями.`,
    },
    {
      q: `Сколько стоит самый дешёвый сервер ${provider.name}?`,
      a: min
        ? `В нашем каталоге ${plans.length} тарифов ${provider.name}, самый доступный стоит ${price(min)} в месяц. Полная таблица облачных серверов на странице облачных серверов.`
        : `Цены облачных серверов собраны на странице облачных серверов.`,
    },
    {
      q: `Можно ли платить за сервисы ${provider.name} в рублях?`,
      a: 'Да, все сервисы оплачиваются с одного баланса в рублях, в том числе ИИ-модели через AI Gateway и AI-агентов. Для юрлиц провайдер даёт закрывающие документы.',
    },
    {
      q: 'Насколько свежие цены на этих страницах?',
      a: `Цены сняты с официального сайта ${provider.name} ${ruDate(block.verifiedAt)}. Тарифы облачных серверов дополнительно сверяются в нашем каталоге раз в неделю.`,
    },
  ];

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: `Сервисы ${provider.name}`,
          numberOfItems: all.length,
          itemListElement: all.map((s, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            url: absUrl(`/provajdery/${slug}/${s.slug}/`),
            name: s.h1,
          })),
        }}
      />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
        }}
      />
      <PageHead
        eyebrow={`${provider.name} · сервисы`}
        title={block.hub.h1}
        lead={block.hub.answer}
        crumbs={[
          { href: '/provajdery', label: 'Провайдеры' },
          { href: `/provajdery/${slug}`, label: provider.name },
          { href: `/provajdery/${slug}/servisy`, label: 'Сервисы' },
        ]}
        badges={<span className="badge">цены на {ruDate(block.verifiedAt)}</span>}
      >
        <div className="row mt">
          <OutLink provider={provider} campaign="svc_hub" className="btn btn-brass">
            Перейти в {provider.name}
          </OutLink>
          <Link href={`/provajdery/${slug}`} className="btn btn-ghost">
            Обзор провайдера
          </Link>
        </div>
        <p className="disclosure" style={{ maxWidth: 640 }}>
          Переход партнёрский: если вы оформите услугу, мы получим вознаграждение. Цена для вас при этом не меняется
        </p>
      </PageHead>

      <section className="section paper">
        <div className="wrap">
          <div className="eyebrow">
            <span className="label">Сводная таблица</span>
          </div>
          <h2>Сколько стоит каждый сервис {provider.name}</h2>
          <p className="faint" style={{ marginBottom: 20 }}>Минимальная цена с официального сайта на {ruDate(block.verifiedAt)}</p>
          <div className="tbl-wrap">
            <div className="tbl-scroll">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Сервис</th>
                    <th>Раздел</th>
                    <th style={{ textAlign: 'right' }}>Цена</th>
                  </tr>
                </thead>
                <tbody>
                  {all.map((s) => (
                    <tr key={s.slug}>
                      <td>
                        <Link href={`/provajdery/${slug}/${s.slug}`} style={{ fontWeight: 600, textDecoration: 'none' }}>
                          {s.name}
                        </Link>
                      </td>
                      <td className="faint">{s.group}</td>
                      <td className="td-price" style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{fromLabel(s) || 'по заявке'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {groups.map((g, i) => (
        <section key={g.name} className={`section ${i % 2 ? 'paper' : 'paper-alt'}`}>
          <div className="wrap">
            <div className="eyebrow">
              <span className="label">{g.name}</span>
            </div>
            <div className="cards cards-2" style={{ marginTop: 16 }}>
              {g.items.map((s) => (
                <Link key={s.slug} href={`/provajdery/${slug}/${s.slug}`} className="card">
                  <div className="card-top">
                    <span className="badge">{s.menu}</span>
                    {fromLabel(s) && <span className="faint mono">{fromLabel(s)}</span>}
                  </div>
                  <h3 style={{ fontSize: '1.1rem' }}>{s.h1}</h3>
                  <p className="faint" style={{ margin: 0 }}>{s.description}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ))}

      <section className="section paper">
        <div className="wrap">
          <div className="eyebrow">
            <span className="label">Вопросы</span>
          </div>
          <h2 style={{ marginBottom: 26 }}>Частые вопросы про сервисы {provider.name}</h2>
          <div className="stack-lg">
            {faq.map((f) => (
              <div key={f.q}>
                <h3>{f.q}</h3>
                <p className="dim">{f.a}</p>
              </div>
            ))}
          </div>
          <div className="row mt">
            <OutLink provider={provider} campaign="svc_hub" className="btn btn-brass">
              Перейти в {provider.name}
            </OutLink>
            <Link href="/kalkulyator" className="btn btn-ghost">
              Сравнить серверы разных провайдеров
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
