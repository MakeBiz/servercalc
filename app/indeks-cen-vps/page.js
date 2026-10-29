import Link from 'next/link';
import PageHead from '@/components/PageHead';
import JsonLd from '@/components/JsonLd';
import providersRaw from '@/data/providers.json';
import index from '@/data/price-index.json';
import { VISIBLE_PLANS, STATS } from '@/lib/data';
import { CATALOG_HIDDEN } from '@/lib/catalog';
import { num } from '@/lib/format';
import { absUrl } from '@/lib/site';
import { dmy, yearOf, cheapestWith, planName, priceText, termNote, byPrice } from '@/lib/answer-first';

/**
 * «Индекс цен VPS» (26.10.2026): как изменились цены одних и тех же тарифов между двумя
 * сверками каталога. Собственные данные сайта, которых нет у других: ИИ-поиск и СМИ
 * цитируют первичные данные охотнее пересказов. Данные: data/price-index.json,
 * пересобирается scripts/price_index.py после очередной сверки
 */
const PATH = '/indeks-cen-vps';
const NAMES = Object.fromEntries(providersRaw.map((p) => [p.slug, p.name]));
const ROWS = index.rows.filter((r) => !CATALOG_HIDDEN.has(r.providerSlug));
const UP = ROWS.filter((r) => r.changePct > 0);
const DOWN = ROWS.filter((r) => r.changePct < 0);
const SAME = ROWS.length - UP.length - DOWN.length;
const WITHDRAWN = (index.withdrawn || []).filter((w) => !CATALOG_HIDDEN.has(w.providerSlug));
const FROM = index.from;
const TO = index.to;
// месяц страницы берётся из последней сверки каталога: после сверки 1 ноября страница сама станет «ноябрь»
const CHECKED = STATS.verifiedAt > TO ? STATS.verifiedAt : TO;
const MONTH = new Date(CHECKED).toLocaleString('ru-RU', { month: 'long', timeZone: 'UTC' });
const YEAR = yearOf(CHECKED);

const GEO = { ru: 'Россия', eu: 'Европа', us: 'США', asia: 'Азия', global: 'несколько стран', kz: 'Казахстан' };
const CUR = { RUB: ' ₽', USD: ' $', EUR: ' €' };
const money = (v, c) => (c === 'RUB' ? num(Math.round(v)) : String(v).replace('.', ',')) + (CUR[c] || ` ${c}`);
const pct = (v) => `${v > 0 ? '+' : ''}${String(Math.round(v)).replace('-', '−')}%`;

// изменения по провайдеру: средний рост его подорожавших тарифов
const BY_PROVIDER = Object.values(
  UP.reduce((acc, r) => {
    const a = (acc[r.providerSlug] ||= { slug: r.providerSlug, name: NAMES[r.providerSlug] || r.providerSlug, n: 0, sum: 0, max: 0 });
    a.n += 1;
    a.sum += r.changePct;
    a.max = Math.max(a.max, r.changePct);
    return acc;
  }, {}),
)
  .map((a) => ({ ...a, avg: a.sum / a.n }))
  .sort((a, b) => b.avg - a.avg);

const RU = VISIBLE_PLANS.filter((p) => p.geo === 'ru' || (p.alsoIn || []).includes('ru'));
// классы памяти: по три самых дешёвых провайдера в каждом (один тариф на провайдера)
const CLASSES = [1, 2, 4, 8].map((ram) => {
  const seen = new Set();
  const top = RU.filter((p) => p.ram === ram).sort(byPrice).filter((p) => (seen.has(p.providerSlug) ? false : seen.add(p.providerSlug))).slice(0, 3);
  return { ram, top };
}).filter((c) => c.top.length);

const CHEAP = [
  { label: '1 ГБ памяти', p: cheapestWith(RU, { ram: 1 }) },
  { label: '2 ГБ памяти', p: cheapestWith(RU, { ram: 2 }) },
  { label: '2 ядра и 4 ГБ', p: cheapestWith(RU, { ram: 4, cpu: 2 }) },
].filter((c) => c.p);

const leadTop = BY_PROVIDER.slice(0, 3).map((a) => `${a.name} (в среднем ${pct(a.avg)})`).join(', ');
const ANSWER = CLASSES.length
  ? `На ${dmy(CHECKED)} самый дешёвый VPS с серверами в России: ` +
    CLASSES.map((c) => `с ${c.ram} ГБ памяти ${planName(c.top[0])} за ${priceText(c.top[0])}`).join(', ') + '. '
  : '';
const LEAD =
  ANSWER +
  `Из ${ROWS.length} тарифов VPS, которые мы сверяли с сайтами провайдеров и ${dmy(FROM)}, и ${dmy(TO)}, ` +
  `${SAME} не изменились в цене, ${UP.length} подорожали${DOWN.length ? `, ${DOWN.length} подешевели` : ', ни один не подешевел'}. ` +
  (leadTop ? `Сильнее всего подняли цены ${leadTop}. ` : '') +
  (WITHDRAWN.length ? `Ещё ${WITHDRAWN.length} ${WITHDRAWN.length === 1 ? 'тариф снят' : 'тарифа сняты'} с продажи или заменены. ` : '') +
  'Сравниваем одни и те же конфигурации в валюте провайдера, поэтому курс рубля на результат не влияет.';

export const metadata = {
  title: { absolute: `Цены на VPS в России: ${MONTH} ${YEAR}. Самые дешёвые тарифы и что подорожало` },
  description: `Самые дешёвые VPS в России с 1, 2, 4 и 8 ГБ памяти на ${dmy(CHECKED)} и как изменились цены ${ROWS.length} тарифов: ${UP.length} подорожали, ${SAME} без изменений. Сверка с сайтами провайдеров, обновление раз в месяц`,
  alternates: { canonical: `${PATH}/` },
};

export default function PriceIndexPage() {
  const faq = [
    {
      q: `Подорожали ли VPS в ${YEAR} году`,
      a: `Да, но не у всех. С ${dmy(FROM)} по ${dmy(TO)} из ${ROWS.length} сверенных тарифов подорожали ${UP.length}, остальные ${SAME} держат цену. ${leadTop ? `Рост пришёлся на ${leadTop}` : ''}`,
    },
    {
      q: 'Сколько сейчас стоит самый дешёвый VPS в России',
      a: CHEAP.length
        ? CHEAP.map((c) => `с ${c.label} от ${priceText(c.p)} (${planName(c.p)})`).join(', ') + `, цены на ${dmy(TO)}`
        : 'Смотрите таблицу тарифов в каталоге',
    },
    {
      q: 'Как считается индекс',
      a: 'Берём тарифы, у которых в обе даты совпадают провайдер, название, ядра, память, диск и регион, и сравниваем цену в валюте провайдера. Тарифы скрытых в каталоге провайдеров и цены без свежей сверки в индекс не попадают. Индекс обновляется раз в месяц, сверка цен идёт каждую неделю',
    },
  ];

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Dataset',
          name: `Цены на VPS в России, ${MONTH} ${YEAR} (ServerCalc)`,
          description: LEAD,
          url: absUrl(PATH),
          inLanguage: 'ru-RU',
          dateModified: CHECKED,
          temporalCoverage: `${FROM}/${TO}`,
          creator: { '@type': 'Organization', name: 'ServerCalc', url: absUrl('/') },
          isAccessibleForFree: true,
          license: 'https://creativecommons.org/licenses/by/4.0/',
          variableMeasured: ['цена тарифа в месяц', 'изменение цены, %'],
          distribution: [{ '@type': 'DataDownload', encodingFormat: 'application/json', contentUrl: absUrl('/indeks-cen-vps.json') }, { '@type': 'DataDownload', encodingFormat: 'text/csv', contentUrl: absUrl('/indeks-cen-vps.csv') }],
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
        eyebrow={`Обновлено ${dmy(CHECKED)}`}
        title={`Цены на VPS в России: ${MONTH} ${YEAR}`}
        lead={LEAD}
        crumbs={[{ href: '/catalog', label: 'Каталог' }, { href: PATH, label: `Цены на VPS: ${MONTH}` }]}
        badges={
          <>
            <span className="badge badge-brass">{ROWS.length} тарифов в сравнении</span>
            <span className="badge">{UP.length} подорожали</span>
            <span className="badge">{SAME} без изменений</span>
          </>
        }
      />

      {CLASSES.length > 0 && (
        <section className="section paper">
          <div className="wrap">
            <h2>Самые дешёвые VPS в России по объёму памяти</h2>
            <p className="dim">По три самых дешёвых провайдера в каждом классе, цена в месяц на {dmy(CHECKED)}. Если цена только при предоплате, это написано рядом</p>
            <div className="tbl-wrap mt">
              <div className="tbl-scroll">
                <table className="tbl">
                  <thead>
                    <tr><th>Память</th><th>#</th><th>Провайдер и тариф</th><th>Конфигурация</th><th style={{ textAlign: 'right' }}>Цена в месяц</th><th>Сверено</th></tr>
                  </thead>
                  <tbody>
                    {CLASSES.flatMap((c) =>
                      c.top.map((p, i) => (
                        <tr key={`${c.ram}-${p.id}`}>
                          <td className="td-num">{i === 0 ? <strong>{c.ram} ГБ</strong> : ''}</td>
                          <td className="td-num faint">{i + 1}</td>
                          <td><Link href={`/provajdery/${p.providerSlug}`} style={{ textDecoration: 'none', fontWeight: 600 }}>{planName(p)}</Link></td>
                          <td className="td-num">{p.cpu} × {p.ram} ГБ, {p.disk} ГБ {p.diskType || ''}</td>
                          <td className="td-price" style={{ textAlign: 'right' }}>{num(Math.round(p.priceRub))} ₽{termNote(p) ? <div className="faint" style={{ fontSize: '0.8rem' }}>{termNote(p)}</div> : null}</td>
                          <td className="td-num faint">{dmy(p.verifiedAt)}</td>
                        </tr>
                      )),
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      )}

      {BY_PROVIDER.length > 0 && (
        <section className="section paper-alt">
          <div className="wrap">
            <h2>Кто поднял цены</h2>
            <div className="tbl-wrap mt">
              <div className="tbl-scroll">
                <table className="tbl">
                  <thead>
                    <tr><th>Провайдер</th><th>Подорожало тарифов</th><th style={{ textAlign: 'right' }}>Средний рост</th><th style={{ textAlign: 'right' }}>Максимум</th></tr>
                  </thead>
                  <tbody>
                    {BY_PROVIDER.map((a) => (
                      <tr key={a.slug}>
                        <td><Link href={`/provajdery/${a.slug}`} style={{ textDecoration: 'none', fontWeight: 600 }}>{a.name}</Link></td>
                        <td className="td-num">{a.n}</td>
                        <td className="td-num" style={{ textAlign: 'right' }}><strong>{pct(a.avg)}</strong></td>
                        <td className="td-num" style={{ textAlign: 'right' }}>{pct(a.max)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="section paper">
        <div className="wrap">
          <h2>Как изменились цены с {dmy(FROM)} по {dmy(TO)}</h2>
          <p className="dim">Цена в месяц в валюте провайдера. Сначала тарифы с самым большим изменением</p>
          <div className="tbl-wrap mt">
            <div className="tbl-scroll">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Провайдер</th><th>Тариф</th><th>Конфигурация</th><th>Регион</th>
                    <th style={{ textAlign: 'right' }}>{dmy(FROM)}</th>
                    <th style={{ textAlign: 'right' }}>{dmy(TO)}</th>
                    <th style={{ textAlign: 'right' }}>Изменение</th>
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map((r) => (
                    <tr key={`${r.providerSlug}-${r.name}-${r.geo}-${r.ram}`}>
                      <td>{NAMES[r.providerSlug] || r.providerSlug}</td>
                      <td>{r.name}</td>
                      <td className="td-num">{r.cpu} × {r.ram} ГБ{r.disk ? `, ${r.disk} ГБ` : ''}</td>
                      <td className="faint">{GEO[r.geo] || r.geo}</td>
                      <td className="td-num" style={{ textAlign: 'right' }}>{money(r.was, r.currency)}</td>
                      <td className="td-num" style={{ textAlign: 'right' }}>{money(r.now, r.currency)}</td>
                      <td className="td-num" style={{ textAlign: 'right' }}>{r.changePct ? <strong>{pct(r.changePct)}</strong> : <span className="faint">0%</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {WITHDRAWN.length > 0 && (
        <section className="section paper-alt">
          <div className="wrap">
            <h2>Сняты с продажи или заменены</h2>
            <ul className="list-check">
              {WITHDRAWN.map((w) => (
                <li key={`${w.providerSlug}-${w.name}`}>
                  {NAMES[w.providerSlug] || w.providerSlug}, {w.name} ({w.specs}, {money(w.price, w.currency)} в месяц): {w.note}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section className="section paper">
        <div className="wrap">
          <h2>Самые дешёвые VPS в России сейчас</h2>
          <ul className="list-check">
            {CHEAP.map((c) => (
              <li key={c.label}>С {c.label}: {planName(c.p)}, {priceText(c.p)}</li>
            ))}
          </ul>
          <div className="stack-lg mt-lg">
            {faq.map((f) => (
              <div key={f.q}><h3>{f.q}</h3><p className="dim">{f.a}</p></div>
            ))}
          </div>
          <p className="dim mt-lg">
            Данные открыты: изменения цен в <a href="/indeks-cen-vps.json">indeks-cen-vps.json</a>, все текущие тарифы с датой сверки в <a href="/indeks-cen-vps.csv">indeks-cen-vps.csv</a>. При цитировании ссылка на ServerCalc обязательна (CC BY 4.0)
          </p>
          <div className="row mt-lg">
            <Link href="/catalog" className="btn btn-ghost">Все тарифы с датой проверки</Link>
            <Link href="/luchshie-vps-rossii" className="btn btn-ghost">Рейтинг VPS в России</Link>
            <Link href="/kalkulyator" className="btn btn-ghost">Калькулятор конфигурации</Link>
          </div>
        </div>
      </section>
    </>
  );
}
