import Link from 'next/link';
import PageHead from '@/components/PageHead';
import JsonLd from '@/components/JsonLd';
import OutLink from '@/components/OutLink';
import { STATS } from '@/lib/data';
import { price, ruDate } from '@/lib/format';
import { absUrl } from '@/lib/site';
import { checkedLine, yearOf, planName, priceText, dmy } from '@/lib/answer-first';
import { providerRows, scoreRows, FEATURE_NAMES } from '@/lib/provider-stats';

/**
 * «Лучший VPS-хостинг в России 2026» (21.10.2026): рейтинг по открытой формуле на ценах,
 * сверенных с сайтами провайдеров. Нейросети на этот вопрос цитируют habr, vc и рейтинги
 * с методикой, поэтому сначала ответ, потом формула и таблица с датой
 */
const PATH = '/luchshie-vps-rossii';
const ROWS = scoreRows(providerRows('ru'));
const CHECKED = ROWS.reduce((m, r) => (r.verifiedAt > m ? r.verifiedAt : m), STATS.verifiedAt);
const TOP = ROWS.slice(0, 3);
const YEAR = yearOf(CHECKED);

export const metadata = {
  title: { absolute: `Лучший VPS-хостинг в России ${YEAR}: рейтинг ${ROWS.length} провайдеров по проверенным ценам` },
  description: TOP.length
    ? `Рейтинг VPS-хостинга с серверами в России по открытой формуле: цена тарифа с 2 ГБ, возможности, NVMe, выбор тарифов. Первые три: ${TOP.map((r) => r.name).join(', ')}. Цены проверены ${dmy(CHECKED)}`
    : 'Рейтинг VPS-хостинга в России по открытой формуле',
  alternates: { canonical: `${PATH}/` },
};

export default function BestRuPage() {
  const lead = TOP.length
    ? `По открытой формуле лучшие VPS с серверами в России сейчас: ${TOP.map((r, i) => `${i + 1}. ${r.name} (${r.score} из 100, тариф с 2 ГБ за ${price(r.twoGb.priceRub)} в месяц)`).join(', ')}. Цены проверены ${dmy(CHECKED)} на сайтах провайдеров. Ниже формула и таблица всех ${ROWS.length} провайдеров.`
    : '';

  const faq = [
    {
      q: `Какой VPS-хостинг лучший в России в ${YEAR} году`,
      a: TOP.length ? `По нашей формуле на ${dmy(CHECKED)}: ${TOP.map((r) => `${r.name} (${r.score} из 100)`).join(', ')}. Лучший выбор всё равно зависит от задачи: боту важнее цена, магазину и 1С возможности и надёжность` : '',
    },
    {
      q: 'Как считается рейтинг',
      a: '45 баллов за цену самого дешёвого тарифа с 2 ГБ памяти, 30 за возможности (панель, защита от DDoS, бэкапы, почасовая оплата, тестовый период, по 6), 10 за NVMe, 5 за KVM, до 10 за выбор тарифов в России, минус 5, если цена в месяц только при предоплате. Партнёрство с провайдером и закреп в калькуляторе в формулу не входят, партнёрство показано отдельной колонкой',
    },
    {
      q: 'Насколько свежие цены',
      a: `Каждый тариф сверен с сайтом провайдера, последняя сверка ${dmy(CHECKED)}. Сверяем раз в неделю, тариф без проверки дольше ${STATS.staleDays} дней скрываем`,
    },
  ];

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
          name: `Лучший VPS-хостинг в России ${YEAR}`,
          url: absUrl(PATH),
          dateModified: CHECKED,
          mainEntity: {
            '@type': 'ItemList',
            name: `Рейтинг VPS-хостинга в России, ${YEAR}`,
            itemListOrder: 'https://schema.org/ItemListOrderDescending',
            itemListElement: ROWS.map((r, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              name: `${r.name}, ${r.score} из 100`,
              item: {
                '@type': 'Product',
                name: planName(r.twoGb),
                brand: { '@type': 'Brand', name: r.name },
                category: 'VPS',
                offers: { '@type': 'Offer', price: Math.round(r.twoGb.priceRub), priceCurrency: 'RUB', availability: 'https://schema.org/InStock' },
              },
            })),
          },
        }}
      />

      <PageHead
        eyebrow={checkedLine(CHECKED)}
        title={`Лучший VPS-хостинг в России, ${YEAR}`}
        lead={lead}
        crumbs={[{ href: '/vps/rossiya', label: 'VPS в России' }, { href: PATH, label: 'Рейтинг' }]}
        badges={
          <>
            <span className="badge badge-brass">{ROWS.length} провайдеров</span>
            <span className="badge">открытая формула</span>
            <span className="badge">партнёрство показано, в баллы не входит</span>
          </>
        }
      />

      <section className="section paper">
        <div className="wrap">
          <h2>Рейтинг по баллам</h2>
          <div className="tbl-wrap mt">
            <div className="tbl-scroll">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Провайдер</th>
                    <th>Баллы</th>
                    <th>Тариф с 2 ГБ</th>
                    <th>Возможности</th>
                    <th>Проверено</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map((r, i) => (
                    <tr key={r.slug}>
                      <td className="td-num faint">{String(i + 1).padStart(2, '0')}</td>
                      <td><Link href={`/provajdery/${r.slug}`} style={{ textDecoration: 'none', fontWeight: 600 }}>{r.name}</Link></td>
                      <td className="td-num" title={`цена ${r.parts.price}, возможности ${r.parts.features}, NVMe и KVM ${r.parts.extra}, выбор ${r.parts.choice}${r.parts.penalty ? `, предоплата -${r.parts.penalty}` : ''}`}><strong>{r.score}</strong></td>
                      <td>{r.twoGb.name}, {r.twoGb.cpu} × {r.twoGb.ram} ГБ<div className="faint" style={{ fontSize: '0.8rem' }}>{priceText(r.twoGb)}</div></td>
                      <td className="faint">{r.features.map((k) => FEATURE_NAMES[k]).join(', ') || 'нет данных'}</td>
                      <td className="td-num faint">{ruDate(r.verifiedAt)}</td>
                      <td style={{ textAlign: 'right' }}><OutLink provider={r.provider} campaign="luchshie_vps_rossii" content={r.slug}>Перейти</OutLink></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <section className="section paper-alt">
        <div className="wrap">
          <h2>Как считаются баллы</h2>
          <ul className="list-check">
            <li>45 баллов: цена самого дешёвого тарифа с 2 ГБ памяти в России (самый дешёвый получает 45, самый дорогой 0, шкала логарифмическая)</li>
            <li>30 баллов: панель управления, защита от DDoS, бэкапы, почасовая оплата, тестовый период, по 6</li>
            <li>10 баллов: NVMe хотя бы в одном тарифе; 5 баллов: виртуализация KVM</li>
            <li>до 10 баллов: выбор тарифов с локацией в России, по 2 за тариф</li>
            <li>минус 5: цена в месяц доступна только при предоплате дольше месяца</li>
          </ul>
          <div className="row mt-lg">
            <Link href="/vps/rossiya" className="btn btn-ghost">Все тарифы в России</Link>
            <Link href="/kalkulyator" className="btn btn-ghost">Калькулятор конфигурации</Link>
            <Link href="/metodologiya" className="btn btn-ghost">Методология подбора</Link>
          </div>
        </div>
      </section>

      <section className="section paper">
        <div className="wrap">
          <h2 style={{ marginBottom: 26 }}>Вопросы о рейтинге</h2>
          <div className="stack-lg">
            {faq.map((f) => (
              <div key={f.q}><h3>{f.q}</h3><p className="dim">{f.a}</p></div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
