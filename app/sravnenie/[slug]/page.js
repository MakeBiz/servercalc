import Link from 'next/link';
import { notFound } from 'next/navigation';
import PageHead from '@/components/PageHead';
import OutLink from '@/components/OutLink';
import JsonLd from '@/components/JsonLd';
import Freshness from '@/components/Freshness';
import PromoCode from '@/components/PromoCode';
import { PAIRS, getPair, side, pairTitle } from '@/lib/compare';
import { STATS } from '@/lib/data';
import { price, ruDate } from '@/lib/format';

/**
 * Сравнение двух провайдеров по данным каталога (24.10.2026, раздел перенесён
 * с ПодборVPS). Тексты собираются из цифр: кто дешевле на старте, у кого какие
 * регионы, задачи и возможности, есть ли сверенный промокод
 */

const CAMPAIGN = (slug) => `compare_${slug}`;
const list = (arr) => (arr.length ? arr.join(', ') : 'нет');
const only = (x, y, key = 'name') => x.filter((i) => !y.some((j) => j[key] === i[key])).map((i) => i[key]);

export function generateStaticParams() {
  return PAIRS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const pair = getPair(slug);
  if (!pair) return {};
  const a = side(pair.a);
  const b = side(pair.b);
  const title = pairTitle(pair);
  return {
    title: `${title}: что выбрать, сравнение цен и тарифов VPS`,
    description: `${title}: стартовая цена${a.min && b.min ? ` от ${price(a.min)} и от ${price(b.min)}` : ''}, локации, задачи и промокоды. Данные каталога, цены проверены ${ruDate(STATS.verifiedAt)}`,
    alternates: { canonical: `/sravnenie/${slug}` },
  };
}

function cheaperLine(a, b) {
  if (!a.min || !b.min) return 'Сверенных цен по одному из провайдеров сейчас нет, сравнить стартовую цену не получится';
  if (a.min === b.min) return `Стартовая цена одинаковая: от ${price(a.min)} в месяц`;
  const [lo, hi] = a.min < b.min ? [a, b] : [b, a];
  return `По стартовой цене дешевле ${lo.provider.name}: от ${price(lo.min)} в месяц против ${price(hi.min)} у ${hi.provider.name}`;
}

export default async function ComparePage({ params }) {
  const { slug } = await params;
  const pair = getPair(slug);
  if (!pair) notFound();
  const a = side(pair.a);
  const b = side(pair.b);
  const A = a.provider.name;
  const B = b.provider.name;
  const title = pairTitle(pair);

  const geoOnlyA = only(a.geos, b.geos);
  const geoOnlyB = only(b.geos, a.geos);
  const taskOnlyA = only(a.tasks, b.tasks);
  const taskOnlyB = only(b.tasks, a.tasks);
  const reqOnlyA = only(a.reqs, b.reqs);
  const reqOnlyB = only(b.reqs, a.reqs);

  const short = [cheaperLine(a, b)];
  if (geoOnlyA.length) short.push(`Локации только у ${A}: ${list(geoOnlyA)}`);
  if (geoOnlyB.length) short.push(`Локации только у ${B}: ${list(geoOnlyB)}`);
  if (a.promos.length || b.promos.length) {
    short.push(`Действующий промокод есть у ${[a, b].filter((x) => x.promos.length).map((x) => x.provider.name).join(' и ')}`);
  }

  const promoText = (x) => (x.promos.length ? x.promos.map((p) => `${p.title}${p.code ? `, код ${p.code}` : ''}`).join('; ') : 'сверенных промокодов в каталоге нет');

  const faq = [
    { q: `Что дешевле: ${title}?`, a: `${cheaperLine(a, b)}. Стартовая цена это самый дешёвый сверенный тариф, итог зависит от конфигурации и локации` },
    { q: `Где у ${A} и ${B} дата-центры?`, a: `${A}: ${list(a.geos.map((g) => g.name))}. ${B}: ${list(b.geos.map((g) => g.name))}` },
    { q: `Под какие задачи подходят ${A} и ${B}?`, a: `${A}: ${list(a.tasks.map((t) => t.name.toLowerCase()))}. ${B}: ${list(b.tasks.map((t) => t.name.toLowerCase()))}` },
    { q: `Есть ли промокоды у ${A} и ${B}?`, a: `${A}: ${promoText(a)}. ${B}: ${promoText(b)}. Все действующие коды собраны на странице акций` },
  ];

  const rows = [
    ['Стартовая цена', a.min ? `от ${price(a.min)}/мес` : 'цены на проверке', b.min ? `от ${price(b.min)}/мес` : 'цены на проверке'],
    ['Тарифов в каталоге', String(a.plans.length), String(b.plans.length)],
    ['Память до', a.maxRam ? `${a.maxRam} ГБ` : '—', b.maxRam ? `${b.maxRam} ГБ` : '—'],
    ['Локации', list(a.geos.map((g) => g.name)), list(b.geos.map((g) => g.name))],
    ['Возможности', list(a.reqs.map((r) => r.short)), list(b.reqs.map((r) => r.short))],
    ['Задачи', list(a.tasks.map((t) => t.name)), list(b.tasks.map((t) => t.name))],
    ['Промокод', promoText(a), promoText(b)],
  ];

  const pickA = [];
  const pickB = [];
  if (a.min && b.min && a.min !== b.min) (a.min < b.min ? pickA : pickB).push('ниже стартовая цена');
  if (geoOnlyA.length) pickA.push(`нужна локация: ${list(geoOnlyA)}`);
  if (geoOnlyB.length) pickB.push(`нужна локация: ${list(geoOnlyB)}`);
  if (taskOnlyA.length) pickA.push(`задача из списка: ${list(taskOnlyA.map((t) => t.toLowerCase()))}`);
  if (taskOnlyB.length) pickB.push(`задача из списка: ${list(taskOnlyB.map((t) => t.toLowerCase()))}`);
  if (reqOnlyA.length) pickA.push(`важно: ${list(reqOnlyA.map((r) => r.toLowerCase()))}`);
  if (reqOnlyB.length) pickB.push(`важно: ${list(reqOnlyB.map((r) => r.toLowerCase()))}`);
  if (a.promos.length && !b.promos.length) pickA.push('хотите воспользоваться промокодом');
  if (b.promos.length && !a.promos.length) pickB.push('хотите воспользоваться промокодом');

  const others = PAIRS.filter((p) => p.slug !== slug).slice(0, 3);

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
        }}
      />
      <PageHead
        eyebrow="Сравнение"
        title={title}
        lead={`${short.join('. ')}. Цены проверены ${ruDate(STATS.verifiedAt)} по сайтам провайдеров`}
        crumbs={[
          { href: '/sravnenie', label: 'Сравнение' },
          { href: `/sravnenie/${slug}`, label: title },
        ]}
      >
        <div className="row mt">
          <OutLink provider={a.provider} campaign={CAMPAIGN(slug)} className="btn btn-brass">{`Сайт ${A}`}</OutLink>
          <OutLink provider={b.provider} campaign={CAMPAIGN(slug)} className="btn btn-ghost">{`Сайт ${B}`}</OutLink>
        </div>
      </PageHead>

      <section className="section paper">
        <div className="wrap">
          <div className="between mb">
            <h2>{`${A} и ${B}: сравнение по каталогу`}</h2>
            <Freshness date={STATS.verifiedAt} />
          </div>
          <div className="tbl-wrap">
            <div className="tbl-scroll">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Параметр</th>
                    <th>{A}</th>
                    <th>{B}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(([k, x, y]) => (
                    <tr key={k}>
                      <td style={{ fontWeight: 600 }}>{k}</td>
                      <td>{x}</td>
                      <td>{y}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <p className="faint mt">
            Данные каталога ServerCalc. Перед оплатой проверяйте тариф на сайте провайдера. Подробно:{' '}
            <Link href={`/provajdery/${pair.a}`} className="link-brass">{A}</Link> и{' '}
            <Link href={`/provajdery/${pair.b}`} className="link-brass">{B}</Link>
          </p>
        </div>
      </section>

      <section className="section paper-alt">
        <div className="wrap">
          <h2>Что выбрать</h2>
          <div className="grid-2 mt">
            {[[a, pickA], [b, pickB]].map(([x, why]) => (
              <div key={x.provider.slug}>
                <div className="eyebrow"><span className="label">{x.provider.name}</span></div>
                <p>{why.length ? `Берите ${x.provider.name}, если ${why.join('; ')}` : `${x.provider.name} не выигрывает по каталогу ни по одному пункту, смотрите на удобство панели и поддержку`}</p>
                <ul className="list-check">
                  {(x.provider.pros || []).map((p) => <li key={p}>{p}</li>)}
                </ul>
                <ul className="list-check list-minus">
                  {(x.provider.cons || []).map((p) => <li key={p}>{p}</li>)}
                </ul>
                {x.promos.map((p) => (
                  <div className="notice mt" key={p.id}>
                    <strong>{p.title}.</strong> {p.mechanics}{p.code && <> <PromoCode code={p.code} provider={x.provider.slug} /></>}
                  </div>
                ))}
                <div className="row mt">
                  <OutLink provider={x.provider} campaign={CAMPAIGN(slug)} content="verdict" className="btn btn-brass btn-sm" showDisclosure>{`Перейти на сайт ${x.provider.name}`}</OutLink>
                </div>
              </div>
            ))}
          </div>
          <p className="mt">
            Не уверены в выборе? Задайте ресурсы и бюджет в <Link href="/kalkulyator" className="link-brass">калькуляторе</Link>,
            он отсортирует провайдеров под задачу
          </p>
        </div>
      </section>

      <section className="section paper">
        <div className="wrap">
          <h2>Частые вопросы</h2>
          {faq.map((f) => (
            <div key={f.q} className="mt">
              <h3>{f.q}</h3>
              <p>{f.a}{f.q.startsWith('Есть ли промокоды') && <> · <Link href="/akcii" className="link-brass">акции и промокоды</Link></>}</p>
            </div>
          ))}
          <h2 className="mt">Смотрите также</h2>
          <ul className="list-check">
            {others.map((p) => (
              <li key={p.slug}><Link href={`/sravnenie/${p.slug}`} className="link-brass">{pairTitle(p)}</Link></li>
            ))}
            <li><Link href="/luchshie-vps-rossii" className="link-brass">Рейтинг VPS России</Link></li>
            <li><Link href="/catalog" className="link-brass">Каталог тарифов</Link></li>
          </ul>
        </div>
      </section>
    </>
  );
}
